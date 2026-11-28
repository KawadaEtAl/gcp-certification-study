import { useMemo, useState } from 'react';
import { ChoiceGroup, Comparison, Insight, RangeControl } from '../ui/Diagrams';
import { Analogy, GuidedText, TermLink } from '../ui/Help';
import { CodeBlock, Disclosure } from '../ui/Lesson';

type StrategyId = 'budget-only' | 'quota-cap' | 'pubsub-kill';

const MAX_MIN = 360;
const TICK_MIN = 5;
const BUDGET_USD = 50;
const BILLING_LAG_MIN = 55;
const LAG_STEPS = BILLING_LAG_MIN / TICK_MIN;

interface Point {
  t: number;
  actualUsd: number;
  reportedUsd: number;
  reqPerSec: number;
  throttled: boolean;
  serviceStopped: boolean;
}

function buildSimulation(strategy: StrategyId) {
  const points: Point[] = [];
  let actual = 0;
  let budgetCrossActualMin: number | null = null;
  let alertFireMin: number | null = null;
  let stopMin: number | null = null;

  for (let i = 0; i <= MAX_MIN / TICK_MIN; i++) {
    const t = i * TICK_MIN;
    const baseDemandRps = t < 30 ? 8 : 95;
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

const STRATEGIES: { id: StrategyId; label: string }[] = [
  { id: 'budget-only', label: '予算通知のみ' },
  { id: 'quota-cap', label: 'クォータ併用' },
  { id: 'pubsub-kill', label: 'Pub/Sub 自動停止' },
];

const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export function BillingLag() {
  const [strategyIdx, setStrategyIdx] = useState(0);
  const [minutes, setMinutes] = useState(250);
  const strategy = STRATEGIES[strategyIdx].id;
  const sim = useMemo(() => buildSimulation(strategy), [strategy]);

  const idx = Math.min(sim.points.length - 1, Math.floor(minutes / TICK_MIN));
  const current = sim.points[idx];
  const alertFired = sim.alertFireMin !== null && minutes >= sim.alertFireMin;
  const lagMinutesObserved =
    sim.budgetCrossActualMin !== null && sim.alertFireMin !== null
      ? sim.alertFireMin - sim.budgetCrossActualMin
      : BILLING_LAG_MIN;

  const left = 54;
  const right = 684;
  const top = 34;
  const bottom = 216;
  const maxUsd = 130;
  const xOf = (t: number) => left + (t / MAX_MIN) * (right - left);
  const yOf = (usd: number) => bottom - (Math.min(maxUsd, usd) / maxUsd) * (bottom - top);
  const visiblePoints = sim.points.slice(0, idx + 1);
  const actualPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.actualUsd).toFixed(1)}`)
    .join(' ');
  const reportedPath = visiblePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.reportedUsd).toFixed(1)}`)
    .join(' ');
  const budgetY = yOf(BUDGET_USD);

  const insightTitle =
    strategy === 'budget-only'
      ? '予算通知のみ：100% に達しても利用は止まらない'
      : strategy === 'quota-cap'
        ? 'クォータ併用：リクエスト到達時に 0ms で同期制限'
        : 'Pub/Sub 自動停止：集計ラグ分の超過 ＋ サービス全停止';

  const insightText =
    strategy === 'budget-only'
      ? alertFired
        ? `実コストは ${sim.budgetCrossActualMin ? fmtTime(sim.budgetCrossActualMin) : '--'} に \$${BUDGET_USD} を超えましたが、集計ラグのため通知は ${sim.alertFireMin ? fmtTime(sim.alertFireMin) : '--'}（${lagMinutesObserved}分後）に発火しました。予算は通知専用なので、現在（${fmtTime(minutes)}）も処理が続き \$${current.actualUsd} まで伸びています。`
        : '0:30 にスパイクが発生し実コストが急上昇していますが、Cloud Billing の集計は非同期のため反映が遅れて追いかけてきます。'
      : strategy === 'quota-cap'
        ? 'Cloud Run の max-instances や API クォータはリクエスト到達時に同期評価されます。単位時間あたりの消費リソースを物理的に抑えるため、結果として月額予算内に収まります。'
        : current.serviceStopped
          ? `集計ラグ（${lagMinutesObserved}分）後に通知が発火し、Pub/Sub 連携で課金無効化が走ってサービスが完全停止しました。それでもラグ間の処理により実コストは \$${current.actualUsd} まで超過しています。本番環境では原則 NG です。`
          : '予算 100% 通知を Pub/Sub で受けて自動停止する構成（使い捨て実習環境向け）です。集計ラグが追いつくまで停止トリガーは発火しません。';

  return (
    <>
      <div className="diagram-tools">
        <ChoiceGroup
          label="費用制御の対策"
          choices={STRATEGIES.map((s) => s.label)}
          value={strategyIdx}
          onChange={(i) => {
            setStrategyIdx(i);
            setMinutes(250);
          }}
        />
      </div>

      <section className="figure sheet" aria-label="実発生コストと Cloud Billing 集計ラグの比較">
        <div className="lag-chart-wrap">
          <svg
            className="lag-svg"
            viewBox="0 0 720 250"
            role="img"
            aria-label="実発生コストと非同期集計ラグのグラフ"
          >
            <g transform="translate(54, 16)">
              <line x1="0" y1="0" x2="22" y2="0" stroke={strategy === 'quota-cap' ? '#136843' : '#993d2e'} strokeWidth="3.2" />
              <text x="28" y="4" fontSize="12.5" fontWeight="700" fill="#1b211e">
                実発生コスト（リアルタイム）
              </text>
              <line x1="230" y1="0" x2="252" y2="0" stroke="#825200" strokeWidth="2.6" strokeDasharray="6 3" />
              <text x="258" y="4" fontSize="12.5" fontWeight="700" fill="#825200">
                Billing 反映額（{BILLING_LAG_MIN}分ラグの例）
              </text>
            </g>

            {[0, 50, 100].map((usd) => (
              <g key={usd}>
                <line
                  x1={left}
                  y1={yOf(usd)}
                  x2={right}
                  y2={yOf(usd)}
                  stroke={usd === BUDGET_USD ? '#825200' : '#d5e2da'}
                  strokeWidth={usd === BUDGET_USD ? 1.8 : 1}
                  strokeDasharray={usd === BUDGET_USD ? '7 4' : undefined}
                />
                <text
                  x={left - 8}
                  y={yOf(usd) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight={usd === BUDGET_USD ? '700' : '600'}
                  fill={usd === BUDGET_USD ? '#825200' : '#5d645f'}
                  fontFamily="ui-monospace, monospace"
                >
                  ${usd}
                </text>
              </g>
            ))}

            <rect x={right - 134} y={budgetY - 24} width="132" height="21" rx="6" fill="#faefd9" stroke="#825200" />
            <text x={right - 68} y={budgetY - 10} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#825200">
              予算ライン $50 (100%)
            </text>

            {[0, 60, 120, 180, 240, 300, 360].map((m) => (
              <g key={m}>
                <line x1={xOf(m)} y1={top} x2={xOf(m)} y2={bottom} stroke="#dce8e0" strokeWidth="1" />
                <text
                  x={xOf(m)}
                  y={bottom + 18}
                  textAnchor="middle"
                  fontSize="11.5"
                  fill="#5d645f"
                  fontFamily="ui-monospace, monospace"
                >
                  {fmtTime(m)}
                </text>
              </g>
            ))}

            {sim.budgetCrossActualMin !== null && sim.alertFireMin !== null && minutes >= sim.budgetCrossActualMin && (
              <g>
                <rect
                  x={xOf(sim.budgetCrossActualMin)}
                  y={top}
                  width={Math.max(0, xOf(Math.min(minutes, sim.alertFireMin)) - xOf(sim.budgetCrossActualMin))}
                  height={bottom - top}
                  fill="#faefd9"
                  opacity="0.7"
                />
                {minutes >= sim.alertFireMin && (
                  <text
                    x={(xOf(sim.budgetCrossActualMin) + xOf(sim.alertFireMin)) / 2}
                    y={top + 16}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="700"
                    fill="#825200"
                  >
                    集計ラグ（{lagMinutesObserved}分）
                  </text>
                )}
              </g>
            )}

            <path
              d={actualPath}
              fill="none"
              stroke={strategy === 'quota-cap' ? '#136843' : '#993d2e'}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d={reportedPath}
              fill="none"
              stroke="#825200"
              strokeWidth="2.6"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {sim.alertFireMin !== null && minutes >= sim.alertFireMin && (
              <g transform={`translate(${xOf(sim.alertFireMin)}, 0)`}>
                <line x1="0" y1={top} x2="0" y2={bottom} stroke="#825200" strokeWidth="1.6" />
                <rect x="-48" y={budgetY + 8} width="96" height="22" rx="11" fill="#825200" />
                <text y={budgetY + 23} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff">
                  100% 通知発火
                </text>
              </g>
            )}

            <circle
              cx={xOf(current.t)}
              cy={yOf(current.actualUsd)}
              r="5.5"
              fill={strategy === 'quota-cap' ? '#136843' : '#993d2e'}
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={xOf(current.t)}
              cy={yOf(current.reportedUsd)}
              r="5"
              fill="#825200"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div style={{ padding: '0 20px 14px' }}>
          <RangeControl
            label={`経過時刻（${fmtTime(minutes)}）`}
            value={minutes}
            min={0}
            max={MAX_MIN}
            unit="分"
            onChange={(v) => setMinutes(Math.round(v / TICK_MIN) * TICK_MIN)}
          />
        </div>

        <div className="lag-metrics">
          <div className="lag-metric">
            <small>実発生コスト</small>
            <strong className={current.actualUsd > BUDGET_USD ? 'bad' : 'ok'}>${current.actualUsd.toFixed(1)}</strong>
          </div>
          <div className="lag-metric">
            <small>Billing 反映額</small>
            <strong className="warn">${current.reportedUsd.toFixed(1)}</strong>
          </div>
          <div className="lag-metric">
            <small>集計ギャップ</small>
            <strong>${Math.max(0, current.actualUsd - current.reportedUsd).toFixed(1)}</strong>
          </div>
          <div className="lag-metric">
            <small>サービス状態</small>
            <strong className={current.serviceStopped ? 'bad' : current.throttled ? 'ok' : ''}>
              {current.serviceStopped ? '全停止' : current.throttled ? '同期制限中' : `${current.reqPerSec} req/s`}
            </strong>
          </div>
        </div>
      </section>

      <Insight title={insightTitle}>
        <GuidedText text={insightText} />
      </Insight>

      <Disclosure title="現在の課金テレメトリを JSON で見る">
        <CodeBlock
          text={JSON.stringify(
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
          )}
        />
      </Disclosure>

      <h2>予算通知とクォータの役割比較</h2>
      <Comparison
        label="知らせる仕組みと、量を制限する仕組み"
        items={[
          {
            id: 'budget',
            art: 'billing',
            title: <TermLink id="billing-budget">通知のみの予算</TermLink>,
            data: { unit: '費用（実績・予測）', timing: '非同期（集計後）', result: 'しきい値でメール / Pub/Sub 通知（自動停止しない）' },
          },
          {
            id: 'quota',
            art: 'guardrail',
            title: <TermLink id="quotas">API クォータ / max-instances</TermLink>,
            data: { unit: '呼び出し数・vCPU・台数', timing: '同期（利用時に即時）', result: '超過分を 429 などで物理的に頭打ちにする' },
          },
        ]}
        axes={[
          { label: '対象単位', value: (d) => d.unit },
          { label: '働く時点', value: (d) => d.timing },
          { label: '結果', value: (d) => d.result },
        ]}
      />

      <Analogy title="水道代の通知と蛇口のリミッター">
        予算アラートは「今月の水道代が 5,000 円を超えました」と後から知らせてくれる通知メール、クォータや max-instances は蛇口に付ける「毎分の最大水量リミッター」です。1 つの蛇口を絞っても建物全体の料金そのものの上限にはなりませんが、暴走をその場で防げます。
      </Analogy>
    </>
  );
}
