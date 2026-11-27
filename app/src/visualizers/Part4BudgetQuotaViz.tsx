import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type StrategyId = 'budget-only' | 'quota-cap' | 'pubsub-kill';

const MAX_MIN = 360;
const TICK_MIN = 5;
const BUDGET_USD = 50;
const BILLING_LAG_MIN = 55; // Exact 55 min = 11 ticks (consistent across Chart, Inspector, and JSON)
const LAG_STEPS = BILLING_LAG_MIN / TICK_MIN;

interface Point {
  t: number;
  actualUsd: number;
  reportedUsd: number;
  reqPerSec: number;
  throttled: boolean;
  serviceStopped: boolean;
}

function buildSimulation(strategy: StrategyId): {
  points: Point[];
  budgetCrossActualMin: number | null;
  alertFireMin: number | null;
  stopMin: number | null;
} {
  const points: Point[] = [];
  let actual = 0;
  let budgetCrossActualMin: number | null = null;
  let alertFireMin: number | null = null;
  let stopMin: number | null = null;

  for (let i = 0; i <= MAX_MIN / TICK_MIN; i++) {
    const t = i * TICK_MIN;
    const baseDemandRps = t < 30 ? 8 : 95;

    // Exact 55-minute lookback (i - 11 ticks) so alertFireMin - budgetCrossActualMin === 55 exactly
    const reported = i >= LAG_STEPS ? points[i - LAG_STEPS].actualUsd : 0;

    if (alertFireMin === null && reported >= BUDGET_USD) {
      alertFireMin = t;
    }

    let serviceStopped = false;
    if (strategy === 'pubsub-kill' && alertFireMin !== null && t >= alertFireMin + 15) {
      serviceStopped = true;
      if (stopMin === null) stopMin = t;
    }

    const throttled = strategy === 'quota-cap' && !serviceStopped && baseDemandRps > 22;
    const effectiveRps = serviceStopped ? 0 : throttled ? 22 : baseDemandRps;

    if (t > 0) {
      actual += effectiveRps * 0.0185;
    }
    const actualRounded = Number(actual.toFixed(1));
    if (budgetCrossActualMin === null && actualRounded >= BUDGET_USD) {
      budgetCrossActualMin = t;
    }

    points.push({
      t,
      actualUsd: actualRounded,
      reportedUsd: Number(reported.toFixed(1)),
      reqPerSec: effectiveRps,
      throttled,
      serviceStopped,
    });
  }

  return { points, budgetCrossActualMin, alertFireMin, stopMin };
}

const STRATEGIES: { id: StrategyId; label: string; dotTone: 'deny' | 'allow' | 'warn' }[] = [
  { id: 'budget-only', label: '予算通知のみ', dotTone: 'deny' },
  { id: 'quota-cap', label: 'クォータ併用', dotTone: 'allow' },
  { id: 'pubsub-kill', label: 'Pub/Sub自動停止', dotTone: 'warn' },
];

interface Part4Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Part4BudgetQuotaViz({ onStepInsightChange }: Part4Props) {
  const isMobile = useIsMobile();
  const [strategy, setStrategy] = useState<StrategyId>('budget-only');
  const [minutes, setMinutes] = useState(250); // 4:10 — shows crossing, exact 55m lag, alert flag, and overshoot
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const sim = useMemo(() => buildSimulation(strategy), [strategy]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setMinutes((prev) => {
        if (prev >= MAX_MIN) {
          setIsPlaying(false);
          return MAX_MIN;
        }
        return Math.min(MAX_MIN, prev + TICK_MIN * speed);
      });
    }, 140);
    return () => window.clearInterval(interval);
  }, [isPlaying, speed]);

  const idx = Math.min(sim.points.length - 1, Math.floor(minutes / TICK_MIN));
  const current = sim.points[idx];
  const alertFired = sim.alertFireMin !== null && minutes >= sim.alertFireMin;
  const lagMinutesObserved =
    sim.budgetCrossActualMin !== null && sim.alertFireMin !== null
      ? sim.alertFireMin - sim.budgetCrossActualMin
      : BILLING_LAG_MIN;

  const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

  useEffect(() => {
    const modeMeta: Record<StrategyId, { badge: string; title: string; subtitle: string; explain: string }> = {
      'budget-only': {
        badge: '予算通知のみ',
        title: '予算通知のみ：100% 到達しても利用は止まらない',
        subtitle: `実発生コストと Cloud Billing 集計の遅延（${BILLING_LAG_MIN}分）＋ 自動停止なし`,
        explain: alertFired
          ? `実コストは ${sim.budgetCrossActualMin ? fmtTime(sim.budgetCrossActualMin) : '--'} に $50 を超えましたが、集計ラグのため通知は ${sim.alertFireMin ? fmtTime(sim.alertFireMin) : '--'}（${lagMinutesObserved}分後）に発火しました。予算は通知専用なので、現在（${fmtTime(minutes)}）も処理が続き $${current.actualUsd} まで伸びています。`
          : '0:30 にスパイクが発生し実コストが急上昇していますが、Cloud Billing の集計は非同期のため反映が遅れて追いかけてきます。',
      },
      'quota-cap': {
        badge: 'クォータ・最大インスタンス併用',
        title: 'クォータ併用：0ms で同期制御して予算内に収める',
        subtitle: '超過リクエストをサービス入口で即座に 429 制限し、コスト曲線を頭打ちにする',
        explain:
          'Cloud Run の `max-instances` や API クォータはリクエスト到達時に同期評価されます（遅延 0ms）。単位時間あたりの消費リソースを物理的に抑えるため、結果として月額予算内に収まります。',
      },
      'pubsub-kill': {
        badge: 'Pub/Sub 自動停止（実習環境向け）',
        title: 'Pub/Sub 自動停止：遅延分の超過 ＋ サービス全面停止',
        subtitle: '使い捨て実習環境向けの手段。本番では全停止を招くため原則 NG',
        explain: current.serviceStopped
          ? `集計ラグ（${lagMinutesObserved}分）後に通知が発火し、Pub/Sub 処理で課金無効化が走ってサービスが完全停止しました。それでもラグ間の処理により実コストは $${current.actualUsd} まで超過しています。`
          : '予算 100% 通知を Pub/Sub で受けて自動停止する構成です。集計ラグが追いつくまで停止トリガーは発火しません。',
      },
    };

    const meta = modeMeta[strategy];
    onStepInsightChange({
      stepNumber: strategy === 'budget-only' ? 1 : strategy === 'quota-cap' ? 2 : 3,
      totalSteps: 3,
      badge: `${meta.badge}・時刻 ${fmtTime(minutes)}`,
      title: meta.title,
      subtitle: meta.subtitle,
      explanation: meta.explain,
      kvPairs: [
        { label: '経過時刻', value: fmtTime(minutes) },
        {
          label: '実発生コスト',
          value: `$${current.actualUsd.toFixed(1)} / 予算 $${BUDGET_USD}`,
          tone: current.actualUsd > BUDGET_USD ? 'deny' : 'allow',
        },
        {
          label: 'Billing 反映額',
          value: `$${current.reportedUsd.toFixed(1)}（${BILLING_LAG_MIN}分遅延）`,
          tone: 'warn',
        },
        {
          label: '現在の挙動',
          value: current.serviceStopped
            ? 'サービス停止（課金無効化）'
            : current.throttled
            ? '同期上限で制限中（429）'
            : `稼働中 (${current.reqPerSec} req/s)`,
          tone: current.serviceStopped ? 'deny' : current.throttled ? 'allow' : 'info',
        },
      ],
      payloadTitle: '課金テレメトリと制御状態',
      payloadJson: JSON.stringify(
        {
          timestamp: fmtTime(minutes),
          strategy,
          realTimeSpendUSD: current.actualUsd,
          billingReportedUSD: current.reportedUsd,
          aggregationLagMinutes: BILLING_LAG_MIN,
          budgetThresholdFired: alertFired,
          synchronousQuotaEnforced: current.throttled,
        },
        null,
        2,
      ),
    });
  }, [strategy, minutes, current, alertFired, lagMinutesObserved, sim, onStepInsightChange]);

  // Desktop chart coordinates
  const chartLeft = 68;
  const chartRight = 784;
  const chartTop = 44;
  const chartBottom = 258;
  const maxUsd = 130;

  const xOf = (t: number) => chartLeft + (t / MAX_MIN) * (chartRight - chartLeft);
  const yOf = (usd: number) => chartBottom - (Math.min(maxUsd, usd) / maxUsd) * (chartBottom - chartTop);

  const visiblePoints = sim.points.slice(0, idx + 1);
  const actualPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.actualUsd).toFixed(1)}`)
    .join(' ');
  const reportedPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.reportedUsd).toFixed(1)}`)
    .join(' ');
  const budgetY = yOf(BUDGET_USD);

  // Mobile portrait chart coordinates
  const mLeft = 46;
  const mRight = 362;
  const mTop = 52;
  const mBottom = 248;
  const mxOf = (t: number) => mLeft + (t / MAX_MIN) * (mRight - mLeft);
  const myOf = (usd: number) => mBottom - (Math.min(maxUsd, usd) / maxUsd) * (mBottom - mTop);
  const mActualPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mxOf(p.t).toFixed(1)} ${myOf(p.actualUsd).toFixed(1)}`)
    .join(' ');
  const mReportedPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mxOf(p.t).toFixed(1)} ${myOf(p.reportedUsd).toFixed(1)}`)
    .join(' ');
  const mBudgetY = myOf(BUDGET_USD);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">対策:</span>
            <div className="scenario-bar" role="group" aria-label="費用制御アーキテクチャの比較">
              {STRATEGIES.map((st) => {
                const selected = strategy === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    className="scenario-pill"
                    aria-pressed={selected}
                    onClick={() => {
                      setStrategy(st.id);
                      setMinutes(0);
                      setIsPlaying(true);
                    }}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <span className={`chip-dot ${st.dotTone}`} aria-hidden="true" />
                    )}
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="blueprint-stage">
          {isMobile ? (
            /* 1:1 PORTRAIT MOBILE CHART + 2x2 PIPELINE */
            <svg className="blueprint-svg" viewBox="0 0 380 512" role="img" aria-label="リアルタイム発生コストと非同期集計ラグの比較">
              <title>実発生コスト vs Cloud Billing 集計ラグ（モバイル）</title>

              <line x1="16" y1="18" x2="36" y2="18" stroke={strategy === 'quota-cap' ? '#137333' : '#c5221f'} strokeWidth="3.5" />
              <text x="42" y="22.5" fontSize="13" fontWeight="700" fill="#1f1f1f">実発生コスト</text>
              <line x1="146" y1="18" x2="166" y2="18" stroke="#b06000" strokeWidth="3" strokeDasharray="5 3" />
              <text x="172" y="22.5" fontSize="13" fontWeight="700" fill="#7c4300">Billing 反映（55分遅延）</text>

              {[0, 50, 100].map((usd) => (
                <g key={usd}>
                  <line
                    x1={mLeft}
                    y1={myOf(usd)}
                    x2={mRight}
                    y2={myOf(usd)}
                    stroke={usd === BUDGET_USD ? '#b06000' : '#e2e9f5'}
                    strokeWidth={usd === BUDGET_USD ? 2 : 1.2}
                    strokeDasharray={usd === BUDGET_USD ? '7 4' : undefined}
                  />
                  <text
                    x={mLeft - 8}
                    y={myOf(usd) + 4.5}
                    textAnchor="end"
                    fontSize="12.5"
                    fontWeight={usd === BUDGET_USD ? '700' : '600'}
                    fill={usd === BUDGET_USD ? '#b06000' : '#5f6368'}
                    fontFamily="ui-monospace, monospace"
                  >
                    ${usd}
                  </text>
                </g>
              ))}

              <rect x={mRight - 96} y={mBudgetY - 26} width="94" height="22" rx="6" fill="#fef7e0" stroke="#b06000" />
              <text x={mRight - 49} y={mBudgetY - 11} textAnchor="middle" fontSize="12" fontWeight="700" fill="#7c4300">
                予算 $50
              </text>

              {[0, 120, 240, 360].map((m) => (
                <g key={m}>
                  <line x1={mxOf(m)} y1={mTop} x2={mxOf(m)} y2={mBottom} stroke="#edf2fa" strokeWidth="1.2" />
                  <text x={mxOf(m)} y={mBottom + 20} textAnchor="middle" fontSize="12" fontWeight="650" fill="#5f6368" fontFamily="ui-monospace, monospace">
                    {fmtTime(m)}
                  </text>
                </g>
              ))}

              {sim.budgetCrossActualMin !== null && sim.alertFireMin !== null && minutes >= sim.budgetCrossActualMin && (
                <rect
                  x={mxOf(sim.budgetCrossActualMin)}
                  y={mTop}
                  width={Math.max(0, mxOf(Math.min(minutes, sim.alertFireMin)) - mxOf(sim.budgetCrossActualMin))}
                  height={mBottom - mTop}
                  fill="#fef7e0"
                  opacity="0.65"
                />
              )}

              <path d={mActualPath} fill="none" stroke={strategy === 'quota-cap' ? '#137333' : '#c5221f'} strokeWidth="3.5" strokeLinecap="round" />
              <path d={mReportedPath} fill="none" stroke="#b06000" strokeWidth="2.8" strokeDasharray="6 4" strokeLinecap="round" />

              {sim.alertFireMin !== null && minutes >= sim.alertFireMin && (
                <g transform={`translate(${mxOf(sim.alertFireMin)}, 0)`}>
                  <line x1="0" y1={mTop} x2="0" y2={mBottom} stroke="#b06000" strokeWidth="1.8" />
                  <rect x="-48" y={mBudgetY + 8} width="96" height="24" rx="12" fill="#b06000" />
                  <text y={mBudgetY + 24} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">100% 通知</text>
                </g>
              )}

              <circle cx={mxOf(current.t)} cy={myOf(current.actualUsd)} r="6" fill={strategy === 'quota-cap' ? '#137333' : '#c5221f'} stroke="#ffffff" strokeWidth="2" />
              <circle cx={mxOf(current.t)} cy={myOf(current.reportedUsd)} r="5.5" fill="#b06000" stroke="#ffffff" strokeWidth="2" />

              <g transform="translate(12, 290)">
                <rect x="0" y="0" width="172" height="96" rx="12" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="86" y="30" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">1. トラフィック</text>
                <text x="86" y="54" textAnchor="middle" fontSize="13" fill="#5f6368" fontFamily="ui-monospace, monospace">
                  {minutes < 30 ? '平常 8 req/s' : '急増 95 req/s'}
                </text>
                <text x="86" y="78" textAnchor="middle" fontSize="12.5" fill="#444746">リクエスト到達</text>

                <rect x="184" y="0" width="172" height="96" rx="12" fill={current.throttled ? '#e6f4ea' : '#f8fafd'} stroke={current.throttled ? '#137333' : '#cbd5e1'} strokeWidth={current.throttled ? 2.2 : 1.4} />
                <text x="270" y="30" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">2. 同期ゲート</text>
                <text x="270" y="52" textAnchor="middle" fontSize="12.5" fill="#5f6368">クォータ (0ms)</text>
                <text x="270" y="78" textAnchor="middle" fontSize="13" fontWeight="700" fill={current.throttled ? '#137333' : '#5f6368'}>
                  {current.throttled ? '✓ 22 req/s 制限' : '未制限（素通り）'}
                </text>

                <rect x="0" y="110" width="172" height="96" rx="12" fill={current.serviceStopped ? '#fce8e6' : '#ffffff'} stroke={current.serviceStopped ? '#c5221f' : '#0b57d0'} strokeWidth="2" />
                <text x="86" y="140" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">3. Cloud Run</text>
                <text x="86" y="164" textAnchor="middle" fontSize="13" fontWeight="700" fill={current.serviceStopped ? '#c5221f' : '#0b57d0'} fontFamily="ui-monospace, monospace">
                  {current.serviceStopped ? '✕ 全停止' : `${current.reqPerSec} req/s`}
                </text>
                <text x="86" y="188" textAnchor="middle" fontSize="12.5" fontWeight="650" fill={current.actualUsd > BUDGET_USD ? '#c5221f' : '#137333'}>
                  実コスト ${current.actualUsd.toFixed(1)}
                </text>

                <rect x="184" y="110" width="172" height="96" rx="12" fill={alertFired ? '#fef7e0' : '#ffffff'} stroke={alertFired ? '#b06000' : '#94a3b8'} strokeWidth={alertFired ? 2.2 : 1.4} />
                <text x="270" y="140" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">4. Billing 予算</text>
                <text x="270" y="164" textAnchor="middle" fontSize="13" fill="#7c4300" fontFamily="ui-monospace, monospace">
                  反映 ${current.reportedUsd.toFixed(1)}
                </text>
                <text x="270" y="188" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={alertFired ? '#b06000' : '#5f6368'}>
                  {alertFired ? (strategy === 'pubsub-kill' ? '通知 → 停止実行' : '通知済（停止せず）') : '集計ラグ中…'}
                </text>
              </g>
            </svg>
          ) : (
            /* DESKTOP CHART + PIPELINE (larger legible fonts >= 13px, exact 55m lag sync) */
            <svg className="blueprint-svg" viewBox="0 0 820 422" role="img" aria-label="リアルタイム発生コストと非同期集計ラグの比較">
              <title>実発生コスト vs Cloud Billing 集計ラグと同期クォータ制御</title>

              <g transform="translate(68, 22)">
                <line x1="0" y1="0" x2="26" y2="0" stroke={strategy === 'quota-cap' ? '#137333' : '#c5221f'} strokeWidth="3.5" />
                <text x="32" y="4.5" fontSize="13.5" fontWeight="700" fill="#1f1f1f">実発生コスト（リアルタイム）</text>
                <line x1="252" y1="0" x2="278" y2="0" stroke="#b06000" strokeWidth="2.8" strokeDasharray="6 3" />
                <text x="284" y="4.5" fontSize="13.5" fontWeight="700" fill="#7c4300">
                  Cloud Billing 反映額（{BILLING_LAG_MIN}分遅延）
                </text>
              </g>

              {[0, 25, 50, 75, 100, 125].map((usd) => (
                <g key={usd}>
                  <line
                    x1={chartLeft}
                    y1={yOf(usd)}
                    x2={chartRight}
                    y2={yOf(usd)}
                    stroke={usd === BUDGET_USD ? '#b06000' : '#e2e9f5'}
                    strokeWidth={usd === BUDGET_USD ? 2 : 1}
                    strokeDasharray={usd === BUDGET_USD ? '7 4' : undefined}
                  />
                  <text
                    x={chartLeft - 10}
                    y={yOf(usd) + 4.5}
                    textAnchor="end"
                    fontSize="13"
                    fontWeight={usd === BUDGET_USD ? '750' : '600'}
                    fill={usd === BUDGET_USD ? '#b06000' : '#5f6368'}
                    fontFamily="ui-monospace, monospace"
                  >
                    ${usd}
                  </text>
                </g>
              ))}

              <rect x={chartRight - 154} y={budgetY - 26} width="152" height="24" rx="6" fill="#fef7e0" stroke="#b06000" />
              <text x={chartRight - 78} y={budgetY - 10} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#7c4300">
                予算ライン $50 (100%)
              </text>

              {[0, 60, 120, 180, 240, 300, 360].map((m) => (
                <g key={m}>
                  <line x1={xOf(m)} y1={chartTop} x2={xOf(m)} y2={chartBottom} stroke="#edf2fa" strokeWidth="1.2" />
                  <text x={xOf(m)} y={chartBottom + 22} textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#5f6368" fontFamily="ui-monospace, monospace">
                    {fmtTime(m)}
                  </text>
                </g>
              ))}

              {sim.budgetCrossActualMin !== null && sim.alertFireMin !== null && minutes >= sim.budgetCrossActualMin && (
                <g>
                  <rect
                    x={xOf(sim.budgetCrossActualMin)}
                    y={chartTop}
                    width={Math.max(0, xOf(Math.min(minutes, sim.alertFireMin)) - xOf(sim.budgetCrossActualMin))}
                    height={chartBottom - chartTop}
                    fill="#fef7e0"
                    opacity="0.65"
                  />
                  {minutes >= sim.alertFireMin && (
                    <text
                      x={(xOf(sim.budgetCrossActualMin) + xOf(sim.alertFireMin)) / 2}
                      y={chartTop + 18}
                      textAnchor="middle"
                      fontSize="12.5"
                      fontWeight="700"
                      fill="#7c4300"
                    >
                      集計ラグ（{lagMinutesObserved}分）
                    </text>
                  )}
                </g>
              )}

              <path d={actualPath} fill="none" stroke={strategy === 'quota-cap' ? '#137333' : '#c5221f'} strokeWidth="3.4" strokeLinecap="round" />
              <path d={reportedPath} fill="none" stroke="#b06000" strokeWidth="2.8" strokeDasharray="6 4" strokeLinecap="round" />

              {sim.alertFireMin !== null && minutes >= sim.alertFireMin && (
                <g transform={`translate(${xOf(sim.alertFireMin)}, 0)`}>
                  <line x1="0" y1={chartTop} x2="0" y2={chartBottom} stroke="#b06000" strokeWidth="1.8" />
                  <rect x="-56" y={budgetY + 8} width="112" height="24" rx="12" fill="#b06000" />
                  <text y={budgetY + 24} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">
                    100% 通知発火
                  </text>
                </g>
              )}

              <circle cx={xOf(current.t)} cy={yOf(current.actualUsd)} r="6" fill={strategy === 'quota-cap' ? '#137333' : '#c5221f'} stroke="#ffffff" strokeWidth="2" />
              <circle cx={xOf(current.t)} cy={yOf(current.reportedUsd)} r="5.5" fill="#b06000" stroke="#ffffff" strokeWidth="2" />

              {/* Bottom Pipeline Strip (larger legible fonts >= 13px) */}
              <g transform="translate(20, 304)">
                <rect x="0" y="10" width="146" height="84" rx="11" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="73" y="42" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">トラフィック急増</text>
                <text x="73" y="68" textAnchor="middle" fontSize="13" fill="#5f6368" fontFamily="ui-monospace, monospace">
                  {minutes < 30 ? '平常 8 req/s' : '急増 95 req/s'}
                </text>

                <line x1="146" y1="52" x2="180" y2="52" stroke="#0b57d0" strokeWidth="2" />
                <rect
                  x="180"
                  y="10"
                  width="172"
                  height="84"
                  rx="11"
                  fill={current.throttled ? '#e6f4ea' : '#f8fafd'}
                  stroke={current.throttled ? '#137333' : '#cbd5e1'}
                  strokeWidth={current.throttled ? 2.2 : 1.4}
                />
                <text x="266" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1f1f">同期ゲート (0ms)</text>
                <text x="266" y="59" textAnchor="middle" fontSize="12.5" fill="#5f6368">クォータ / max-instances</text>
                <text x="266" y="81" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={current.throttled ? '#137333' : '#5f6368'}>
                  {current.throttled ? '✓ 22 req/s で上限カット' : '未制限（素通り）'}
                </text>

                <line x1="352" y1="52" x2="386" y2="52" stroke={current.serviceStopped ? '#c5221f' : '#0b57d0'} strokeWidth="2" />
                <rect
                  x="386"
                  y="10"
                  width="148"
                  height="84"
                  rx="11"
                  fill={current.serviceStopped ? '#fce8e6' : '#ffffff'}
                  stroke={current.serviceStopped ? '#c5221f' : '#0b57d0'}
                  strokeWidth="2"
                />
                <text x="460" y="42" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">Cloud Run 実行</text>
                <text x="460" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill={current.serviceStopped ? '#c5221f' : '#0b57d0'} fontFamily="ui-monospace, monospace">
                  {current.serviceStopped ? '✕ 全停止' : `${current.reqPerSec} req/s`}
                </text>

                <line x1="534" y1="52" x2="606" y2="52" stroke="#b06000" strokeWidth="2.2" strokeDasharray="5 4" className="svg-dash-flow" />
                <text x="570" y="42" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7c4300">55分ラグ</text>

                <rect
                  x="606"
                  y="10"
                  width="174"
                  height="84"
                  rx="11"
                  fill={alertFired ? '#fef7e0' : '#ffffff'}
                  stroke={alertFired ? '#b06000' : '#94a3b8'}
                  strokeWidth={alertFired ? 2.2 : 1.4}
                />
                <text x="693" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1f1f">Cloud Billing 予算</text>
                <text x="693" y="59" textAnchor="middle" fontSize="12.5" fill="#7c4300" fontFamily="ui-monospace, monospace">
                  反映額 ${current.reportedUsd.toFixed(1)}
                </text>
                <text x="693" y="81" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={alertFired ? '#b06000' : '#5f6368'}>
                  {alertFired ? (strategy === 'pubsub-kill' ? '通知 → Pub/Sub停止' : '通知発火（停止せず）') : 'しきい値未満'}
                </text>
              </g>
            </svg>
          )}
        </div>

        {/* Unified Playback Bar integrating time slider & mobile dock */}
        <PlaybackBar
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (!isPlaying && minutes >= MAX_MIN) setMinutes(0);
            setIsPlaying((p) => !p);
          }}
          onNext={() => {
            setIsPlaying(false);
            setMinutes((m) => Math.min(MAX_MIN, m + 30));
          }}
          nextLabel="+30分"
          speed={speed}
          onChangeSpeed={setSpeed}
          onReset={() => {
            setIsPlaying(false);
            setMinutes(0);
          }}
          sliderValue={minutes}
          sliderMin={0}
          sliderMax={MAX_MIN}
          sliderStep={TICK_MIN}
          sliderLabel={`時刻 ${fmtTime(minutes)}`}
          sliderAriaLabel="課金シミュレーション経過時間（分）"
          onSliderChange={(val) => {
            setIsPlaying(false);
            setMinutes(val);
          }}
        />

        {/* Telemetry Metrics */}
        <div className="metric-strip">
          <div className="metric-box">
            <span className="metric-label">実発生コスト</span>
            <span className={`metric-val mono ${current.actualUsd > BUDGET_USD ? 'deny' : 'allow'}`}>
              ${current.actualUsd.toFixed(1)}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Billing 反映額</span>
            <span className="metric-val mono warn">${current.reportedUsd.toFixed(1)}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">集計ギャップ</span>
            <span className="metric-val mono info">
              ${Math.max(0, current.actualUsd - current.reportedUsd).toFixed(1)}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">サービス状態</span>
            <span
              className={`metric-val ${
                current.serviceStopped ? 'deny' : current.throttled ? 'allow' : 'info'
              }`}
            >
              {current.serviceStopped ? '停止中' : current.throttled ? '上限内で稼働' : '無制限で稼働'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
