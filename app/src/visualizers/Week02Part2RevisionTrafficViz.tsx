import { useEffect, useId, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type StageId = 'tag-0' | 'canary-10' | 'expand-50' | 'incident-rollback' | 'complete-100';

interface ReleaseStage {
  id: StageId;
  order: number;
  shortLabel: string;
  dotTone: 'info' | 'warn' | 'deny' | 'allow';
  v1Percent: number;
  v2Percent: number;
  v2Healthy: boolean;
  rolledBack: boolean;
  tagActive: boolean;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  cliCommand: string;
  errorRateV2: string;
  rollbackDuration: string;
}

const RELEASE_STAGES: ReleaseStage[] = [
  {
    id: 'tag-0',
    order: 1,
    shortLabel: '0% タグ検証',
    dotTone: 'info',
    v1Percent: 100,
    v2Percent: 0,
    v2Healthy: true,
    rolledBack: false,
    tagActive: true,
    badge: '段階 1・本番 0% で事前検証',
    title: '0% デプロイ（--no-traffic）＋ 専用タグ URL で単体検証',
    subtitle: '本番 URL は v1=100% のまま。担当者だけ https://v2---... で v2 の起動・認証・応答を確かめる',
    explanation:
      '`--no-traffic --tag v2` でデプロイすると、v2 が Startup Probe を通過して Ready になっても本番トラフィックは 1% も流れません。専用タグ URL（入口の Invoker 認証も同様に有効）で v2 単体の業務応答を確認してから次へ進みます。',
    cliCommand: 'gcloud run deploy week01-manual-api --source=. --no-traffic --tag=v2',
    errorRateV2: '0.0%（テスト通信のみ）',
    rollbackDuration: '本番影響なし（0%）',
  },
  {
    id: 'canary-10',
    order: 2,
    shortLabel: '10% カナリア',
    dotTone: 'warn',
    v1Percent: 90,
    v2Percent: 10,
    v2Healthy: true,
    rolledBack: false,
    tagActive: true,
    badge: '段階 2・カナリア配信',
    title: '10% カナリア配信（v1: 90% / v2: 10%）',
    subtitle: '実トラフィックの一部だけ v2 へ流し、エラー率・遅延・ログを観測する',
    explanation:
      '同じ本番 URL の裏側で、Cloud Run が 90% を安定版 v1、10% を新版 v2 へ振り分けます。万が一バグが潜んでいても影響範囲を 10% に封じ込めたまま、Cloud Logging や Monitoring で異常を検知できます。',
    cliCommand: 'gcloud run services update-traffic week01-manual-api --to-tags=v2=10',
    errorRateV2: '0.0%（正常観測中）',
    rollbackDuration: '異常時は即 v1=100% へ切替可',
  },
  {
    id: 'expand-50',
    order: 3,
    shortLabel: '50% 拡大',
    dotTone: 'info',
    v1Percent: 50,
    v2Percent: 50,
    v2Healthy: true,
    rolledBack: false,
    tagActive: true,
    badge: '段階 3・トラフィック拡大',
    title: '50% へ段階拡大（v1: 50% / v2: 50%）',
    subtitle: '負荷が乗った状態でのスケーリング・メモリ・下流 GCS 読み取りを検証する',
    explanation:
      '10% で問題がなければ 50% へ引き上げ、実負荷に近い状態で遅延やエラー率に変化がないかを見ます。この間も v1 は不変リビジョンとして温存されています。',
    cliCommand: 'gcloud run services update-traffic week01-manual-api --to-tags=v2=50',
    errorRateV2: '0.1%（許容範囲内）',
    rollbackDuration: '異常時は即 v1=100% へ切替可',
  },
  {
    id: 'incident-rollback',
    order: 4,
    shortLabel: '障害→即戻し',
    dotTone: 'deny',
    v1Percent: 100,
    v2Percent: 0,
    v2Healthy: false,
    rolledBack: true,
    tagActive: true,
    badge: '異常検知・3 秒即時ロールバック',
    title: 'v2 で 500 急増 → 再ビルドなしで v1=100% へ即時切り戻し',
    subtitle: '不変リビジョン v1 が無傷で残っているため、ルーティング比率を戻すだけで数秒復旧',
    explanation:
      'v2 は起動（Ready）には成功したものの、特定マニュアル検索時に 500 エラーを連発しました。再ビルドやソース書き戻しを待たず `update-traffic --to-revisions=rev-00001-v1=100` を実行するだけで、数秒以内に本番全通信が安定版 v1 へ戻ります。',
    cliCommand: 'gcloud run services update-traffic week01-manual-api --to-revisions=week01-manual-api-00001-v1=100',
    errorRateV2: '18.4%（500 検知 → 配信停止済）',
    rollbackDuration: '約 3 秒（再ビルド不要）',
  },
  {
    id: 'complete-100',
    order: 5,
    shortLabel: '100% 切替完了',
    dotTone: 'allow',
    v1Percent: 0,
    v2Percent: 100,
    v2Healthy: true,
    rolledBack: false,
    tagActive: true,
    badge: '段階 4・リリース完了',
    title: '修正版 v2 へ 100% 切替完了（v1 は安全網として保持）',
    subtitle: '本番 URL の全リクエストを v2 へ移行。旧リビジョン v1 は削除せず残す',
    explanation:
      '不具合を修正した新リビジョンで再検証を終え、100% 切替を完了しました。トラフィックが 0% になった v1 リビジョンはアイドル課金ゼロで残るため、後日問題が見つかっても即座に戻せる安全網になります。',
    cliCommand: 'gcloud run services update-traffic week01-manual-api --to-latest',
    errorRateV2: '0.0%（安定稼働中）',
    rollbackDuration: 'v1 を残置しているため即戻し可能',
  },
];

interface Part2Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Week02Part2RevisionTrafficViz({ onStepInsightChange }: Part2Props) {
  const isMobile = useIsMobile();
  const sliderId = useId();
  const [stageIdx, setStageIdx] = useState(1); // Start on 10% canary — instantly intuitive
  const [customV2Percent, setCustomV2Percent] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const stage = RELEASE_STAGES[stageIdx];
  const v2Percent = customV2Percent ?? stage.v2Percent;
  const v1Percent = 100 - v2Percent;
  const isCustomSplit = customV2Percent !== null;
  const isRollbackState = !isCustomSplit && stage.rolledBack;
  const v2Healthy = isCustomSplit ? true : stage.v2Healthy;

  useEffect(() => {
    if (!isPlaying) return;
    const ms = Math.round(2400 / speed);
    const timer = window.setInterval(() => {
      setCustomV2Percent(null);
      setStageIdx((prev) => {
        if (prev >= RELEASE_STAGES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);

  useEffect(() => {
    const title = isCustomSplit
      ? `手動配分シミュレーション（v1: ${v1Percent}% / v2: ${v2Percent}%）`
      : stage.title;
    const subtitle = isCustomSplit
      ? 'トラフィック比率だけを変更しても新リビジョンは作られず、再ビルドも発生しません'
      : stage.subtitle;
    const explanation = isCustomSplit
      ? `現在、本番 URL のリクエストは v1 に ${v1Percent}%、v2 に ${v2Percent}% 振り分けられています。トラフィック比率は「サービス設定」層のため、スライダー（update-traffic）だけで数秒以内に反映されます。`
      : stage.explanation;

    onStepInsightChange({
      stepNumber: stage.order,
      totalSteps: RELEASE_STAGES.length,
      badge: isCustomSplit ? `手動切替・v2=${v2Percent}%` : stage.badge,
      title,
      subtitle,
      explanation,
      kvPairs: [
        {
          label: 'トラフィック比率',
          value: `v1: ${v1Percent}% / v2: ${v2Percent}%`,
          tone: isRollbackState ? 'deny' : v2Percent === 100 ? 'allow' : 'info',
        },
        {
          label: 'v2 の 4 関門状態',
          value: isRollbackState
            ? '起動 Ready ✓ / 認証 ✓ / 業務 500 ✕ → 配信 0% へ遮断'
            : `起動 Ready ✓ / 認証 ✓ / 配信 ${v2Percent}% / 業務 200 ✓`,
          tone: isRollbackState ? 'deny' : 'allow',
        },
        { label: 'v2 エラー率', value: isCustomSplit ? '0.0%（手動調整中）' : stage.errorRateV2, tone: isRollbackState ? 'deny' : 'neutral' },
        { label: '切り戻し所要時間', value: isCustomSplit ? '約 3 秒（再ビルド不要）' : stage.rollbackDuration },
      ],
      payloadTitle: '実行コマンドとサービス状態（JSON）',
      payloadJson: JSON.stringify(
        {
          service: 'week01-manual-api',
          region: 'asia-northeast1',
          command: isCustomSplit
            ? `gcloud run services update-traffic week01-manual-api --to-revisions=rev-00001-v1=${v1Percent},rev-00002-v2=${v2Percent}`
            : stage.cliCommand,
          traffic: [
            { revision: 'week01-manual-api-00001-v1', ready: true, percent: v1Percent },
            { revision: 'week01-manual-api-00002-v2', ready: true, tag: 'v2', percent: v2Percent, healthy: v2Healthy },
          ],
        },
        null,
        2,
      ),
    });
  }, [stage, v1Percent, v2Percent, isCustomSplit, isRollbackState, v2Healthy, onStepInsightChange]);

  const selectStage = (idx: number) => {
    setIsPlaying(false);
    setCustomV2Percent(null);
    setStageIdx(idx);
  };

  const triggerInstantRollback = () => {
    setIsPlaying(false);
    setCustomV2Percent(null);
    setStageIdx(3); // incident-rollback
  };

  const v1StrokeW = Math.max(1.4, (v1Percent / 100) * 6);
  const v2StrokeW = Math.max(1.4, (v2Percent / 100) * 6);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">段階:</span>
            <div className="scenario-bar" role="group" aria-label="段階リリースのシナリオ切替">
              {RELEASE_STAGES.map((st, idx) => {
                const selected = !isCustomSplit && idx === stageIdx;
                return (
                  <button
                    key={st.id}
                    type="button"
                    className="scenario-pill"
                    aria-pressed={selected}
                    onClick={() => selectStage(idx)}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <span className={`chip-dot ${st.dotTone}`} aria-hidden="true" />
                    )}
                    {st.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Manual Traffic Split Slider + Instant Rollback Control */}
        <div className="traffic-control-strip">
          <div className="traffic-slider-wrap">
            <label htmlFor={sliderId} className="traffic-slider-label">
              手動で配分を調整（v2）:
            </label>
            <input
              id={sliderId}
              type="range"
              className="modern-range"
              min={0}
              max={100}
              step={10}
              value={v2Percent}
              aria-valuetext={`安定版 v1 が ${v1Percent}%、新版 v2 が ${v2Percent}%`}
              style={
                {
                  '--attr-min': 0,
                  '--attr-max': 100,
                  '--control-value': v2Percent,
                } as React.CSSProperties
              }
              onChange={(e) => {
                setIsPlaying(false);
                setCustomV2Percent(Number(e.target.value));
              }}
            />
            <span className="traffic-readout mono">
              v1 {v1Percent}% / v2 {v2Percent}%
            </span>
          </div>

          <button
            type="button"
            className="rollback-action-btn"
            onClick={triggerInstantRollback}
          >
            <RotateCcw size={14} aria-hidden="true" />
            障害想定→3秒ロールバック
          </button>
        </div>

        <div className="blueprint-stage">
          {isMobile ? (
            <svg
              className="blueprint-svg"
              viewBox="0 0 380 510"
              role="img"
              aria-label={`Cloud Run リビジョンとトラフィック配分図（v1 ${v1Percent}% / v2 ${v2Percent}%・モバイル）`}
            >
              <title>リビジョン・トラフィック段階切替（モバイル）</title>
              <defs>
                <marker id="w2p2-arr-g-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#137333" />
                </marker>
                <marker id="w2p2-arr-b-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#0b57d0" />
                </marker>
                <marker id="w2p2-arr-m-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Step 1: Auth Ingress */}
              <rect x="14" y="10" width="352" height="62" rx="10" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.6" />
              <text x="190" y="34" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#155e75">
                ① 入口認証（roles/run.invoker）
              </text>
              <text x="190" y="56" textAnchor="middle" fontSize="12" fill="#0e7490">
                本番 URL ＆ タグ URL（https://v2---...）両方で検証
              </text>

              <path d="M 190 72 L 190 98" fill="none" stroke="#0891b2" strokeWidth="2" markerEnd="url(#w2p2-arr-b-m)" />

              {/* Step 2: Traffic Router */}
              <rect x="14" y="102" width="352" height="72" rx="10" fill={isRollbackState ? '#fce8e6' : '#fef7e0'} stroke={isRollbackState ? '#c5221f' : '#b06000'} strokeWidth="1.8" />
              <text x="190" y="128" textAnchor="middle" fontSize="14.5" fontWeight="700" fill={isRollbackState ? '#a50e0e' : '#7a4100'}>
                ② トラフィック振分（サービス設定）
              </text>
              <text x="190" y="150" textAnchor="middle" fontSize="13.5" fontWeight="700" fill={isRollbackState ? '#c5221f' : '#041e49'}>
                v1: {v1Percent}%  ／  v2: {v2Percent}%
              </text>
              <text x="190" y="166" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                {isRollbackState ? '再ビルド不要・ルーティング変更だけで 3 秒復旧' : '比率変更は新リビジョンを作らず数秒で反映'}
              </text>

              {/* Split Arrows */}
              <path
                d="M 102 174 L 102 222"
                fill="none"
                stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'}
                strokeWidth={v1Percent > 0 ? Math.min(5, v1StrokeW) : 1.4}
                strokeDasharray={v1Percent > 0 ? '6 4' : '3 3'}
                className={v1Percent > 0 ? 'svg-dash-flow' : undefined}
                markerEnd={v1Percent > 0 ? 'url(#w2p2-arr-g-m)' : 'url(#w2p2-arr-m-m)'}
              />
              <rect x="64" y="186" width="76" height="22" rx="11" fill="#ffffff" stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'} />
              <text x="102" y="201" textAnchor="middle" fontSize="12" fontWeight="700" fill={v1Percent > 0 ? '#137333' : '#64748b'}>
                {v1Percent}%
              </text>

              <path
                d="M 278 174 L 278 222"
                fill="none"
                stroke={v2Percent > 0 ? '#0b57d0' : '#cbd5e1'}
                strokeWidth={v2Percent > 0 ? Math.min(5, v2StrokeW) : 1.4}
                strokeDasharray={v2Percent > 0 ? '6 4' : '3 3'}
                className={v2Percent > 0 ? 'svg-dash-flow' : undefined}
                markerEnd={v2Percent > 0 ? 'url(#w2p2-arr-b-m)' : 'url(#w2p2-arr-m-m)'}
              />
              <rect x="240" y="186" width="76" height="22" rx="11" fill="#ffffff" stroke={v2Percent > 0 ? '#0b57d0' : '#cbd5e1'} />
              <text x="278" y="201" textAnchor="middle" fontSize="12" fontWeight="700" fill={v2Percent > 0 ? '#0b57d0' : '#64748b'}>
                {v2Percent}%
              </text>

              {/* Two Immutable Revisions */}
              <rect
                x="14"
                y="228"
                width="170"
                height="136"
                rx="11"
                fill={v1Percent > 0 ? '#e6f4ea' : '#f8fafd'}
                stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'}
                strokeWidth={v1Percent > 0 ? 2 : 1.2}
              />
              <text x="99" y="253" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                v1（安定版）
              </text>
              <text x="99" y="273" textAnchor="middle" fontSize="11.5" fill="#1e4620">
                rev-00001-v1
              </text>
              <text x="99" y="294" textAnchor="middle" fontSize="12" fontWeight="650" fill="#137333">
                Startup Ready ✓
              </text>
              <text x="99" y="314" textAnchor="middle" fontSize="12" fill="#1e4620">
                業務応答 200 OK
              </text>
              <text x="99" y="344" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                不変・削除せず保持
              </text>

              <rect
                x="196"
                y="228"
                width="170"
                height="136"
                rx="11"
                fill={!v2Healthy ? '#fce8e6' : v2Percent > 0 ? '#e8f0fe' : '#f8fafd'}
                stroke={!v2Healthy ? '#c5221f' : v2Percent > 0 ? '#0b57d0' : '#94a3b8'}
                strokeWidth={!v2Healthy || v2Percent > 0 ? 2 : 1.3}
              />
              <text x="281" y="253" textAnchor="middle" fontSize="14" fontWeight="700" fill={!v2Healthy ? '#a50e0e' : '#041e49'}>
                v2（新版）
              </text>
              <text x="281" y="273" textAnchor="middle" fontSize="11.5" fill="#444746">
                rev-00002-v2
              </text>
              <text x="281" y="294" textAnchor="middle" fontSize="12" fontWeight="650" fill="#137333">
                Startup Ready ✓
              </text>
              <text x="281" y="314" textAnchor="middle" fontSize="12" fontWeight="700" fill={!v2Healthy ? '#c5221f' : '#0b57d0'}>
                {!v2Healthy ? '業務 500 発生！' : v2Percent === 0 ? 'タグ URL で検証' : '業務応答 200 OK'}
              </text>
              <text x="281" y="344" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                tag: v2 付与済
              </text>

              {/* 4-Gate Legend Box */}
              <rect x="14" y="382" width="352" height="114" rx="11" fill="#ffffff" stroke="#e0e3eb" strokeWidth="1.2" />
              <text x="28" y="405" fontSize="13" fontWeight="700" fill="#1f1f1f">
                混同しない 4 段階のチェック地点
              </text>
              <text x="28" y="427" fontSize="12" fill="#444746">
                1. 起動・Ready：Startup Probe 通過（失敗時は旧版を保護）
              </text>
              <text x="28" y="447" fontSize="12" fill="#444746">
                2. 入口認証：Invoker＋ID トークン（タグ URL でも必須）
              </text>
              <text x="28" y="467" fontSize="12" fill="#444746">
                3. トラフィック割当：本番 URL を何 % 振り分けるか
              </text>
              <text x="28" y="487" fontSize="12" fill="#444746">
                4. 業務成功：200 OK（Ready でも 500 は起きる→即戻し）
              </text>
            </svg>
          ) : (
            <svg
              className="blueprint-svg"
              viewBox="0 0 820 374"
              role="img"
              aria-label={`Cloud Run リビジョンとトラフィック段階切替図（v1 ${v1Percent}% / v2 ${v2Percent}%）`}
            >
              <title>リビジョン・トラフィック段階切替＆即時ロールバック</title>
              <defs>
                <marker id="w2p2-arr-c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#0891b2" />
                </marker>
                <marker id="w2p2-arr-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#137333" />
                </marker>
                <marker id="w2p2-arr-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#0b57d0" />
                </marker>
                <marker id="w2p2-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Left: Callers & Tag URL */}
              <rect x="18" y="34" width="160" height="86" rx="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.4" />
              <text x="98" y="61" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                本番ユーザー
              </text>
              <text x="98" y="83" textAnchor="middle" fontSize="12.5" fill="#444746">
                本番 URL へアクセス
              </text>
              <text x="98" y="103" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                ID トークン添付
              </text>

              <rect x="18" y="172" width="160" height="86" rx="11" fill="#eef2ff" stroke="#818cf8" strokeWidth="1.4" strokeDasharray="4 3" />
              <text x="98" y="198" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#312e81">
                検証担当者
              </text>
              <text x="98" y="220" textAnchor="middle" fontSize="12" fill="#4338ca">
                専用タグ URL へ直行
              </text>
              <text x="98" y="240" textAnchor="middle" fontSize="11.5" fill="#4338ca">
                https://v2---...
              </text>

              {/* Arrows to Ingress */}
              <path d="M 178 77 L 222 108" fill="none" stroke="#0891b2" strokeWidth="2" markerEnd="url(#w2p2-arr-c)" />
              <path d="M 178 215 L 222 178" fill="none" stroke="#4338ca" strokeWidth="1.6" strokeDasharray="5 3" markerEnd="url(#w2p2-arr-c)" />

              {/* Gate 1 & 2: Ingress + Traffic Router */}
              <rect
                x="228"
                y="46"
                width="184"
                height="198"
                rx="14"
                fill={isRollbackState ? '#fce8e6' : '#ecfeff'}
                stroke={isRollbackState ? '#c5221f' : '#0891b2'}
                strokeWidth="1.8"
              />
              <text x="320" y="74" textAnchor="middle" fontSize="14.5" fontWeight="700" fill={isRollbackState ? '#a50e0e' : '#155e75'}>
                入口認証 ＆ 振分
              </text>
              <rect x="244" y="88" width="152" height="44" rx="8" fill="#ffffff" stroke="#bae6fd" />
              <text x="320" y="107" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0e7490">
                ① Invoker 認証 ✓
              </text>
              <text x="320" y="124" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                非公開サービス保護
              </text>

              <rect x="244" y="144" width="152" height="84" rx="8" fill="#ffffff" stroke={isRollbackState ? '#f28b82' : '#f6c366'} strokeWidth="1.4" />
              <text x="320" y="166" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={isRollbackState ? '#c5221f' : '#7a4100'}>
                ② トラフィック比率
              </text>
              <text x="320" y="191" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                v1 {v1Percent}% / v2 {v2Percent}%
              </text>
              <text x="320" y="214" textAnchor="middle" fontSize="11.5" fill={isRollbackState ? '#c5221f' : '#5f6368'}>
                {isRollbackState ? '即ロールバック完了！' : 'サービス設定（即反映）'}
              </text>

              {/* Routing Lines to v1 and v2 */}
              <path
                d="M 412 108 C 468 108, 476 76, 536 76"
                fill="none"
                stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'}
                strokeWidth={v1Percent > 0 ? v1StrokeW : 1.5}
                strokeDasharray={v1Percent > 0 ? '7 5' : '3 4'}
                className={v1Percent > 0 ? 'svg-dash-flow' : undefined}
                markerEnd={v1Percent > 0 ? 'url(#w2p2-arr-g)' : 'url(#w2p2-arr-m)'}
              />
              <rect x="444" y="64" width="66" height="24" rx="12" fill="#ffffff" stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'} strokeWidth="1.3" />
              <text x="477" y="80" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={v1Percent > 0 ? '#137333' : '#64748b'}>
                {v1Percent}%
              </text>

              <path
                d="M 412 182 C 468 182, 476 212, 536 212"
                fill="none"
                stroke={v2Percent > 0 ? '#0b57d0' : '#cbd5e1'}
                strokeWidth={v2Percent > 0 ? v2StrokeW : 1.5}
                strokeDasharray={v2Percent > 0 ? '7 5' : '3 4'}
                className={v2Percent > 0 ? 'svg-dash-flow' : undefined}
                markerEnd={v2Percent > 0 ? 'url(#w2p2-arr-b)' : 'url(#w2p2-arr-m)'}
              />
              <rect x="444" y="196" width="66" height="24" rx="12" fill="#ffffff" stroke={v2Percent > 0 ? '#0b57d0' : '#cbd5e1'} strokeWidth="1.3" />
              <text x="477" y="212" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={v2Percent > 0 ? '#0b57d0' : '#64748b'}>
                {v2Percent}%
              </text>

              {/* Right Top: v1 Immutable Revision */}
              <rect
                x="542"
                y="22"
                width="254"
                height="112"
                rx="13"
                fill={v1Percent > 0 ? '#e6f4ea' : '#f8fafd'}
                stroke={v1Percent > 0 ? '#137333' : '#cbd5e1'}
                strokeWidth={v1Percent > 0 ? 2.2 : 1.3}
              />
              <text x="560" y="48" fontSize="15.5" fontWeight="700" fill="#0d652d">
                リビジョン v1（安定版・不変）
              </text>
              <text x="560" y="70" fontSize="12.5" fill="#1e4620">
                week01-manual-api-00001-v1
              </text>
              <text x="560" y="93" fontSize="12.5" fontWeight="650" fill="#137333">
                Startup Ready ✓ ／ 業務 200 OK
              </text>
              <text x="560" y="116" fontSize="12" fill="#5f6368">
                @sha256:4a10...（無傷で残置・戻し先）
              </text>

              {/* Right Bottom: v2 Immutable Revision */}
              <rect
                x="542"
                y="154"
                width="254"
                height="116"
                rx="13"
                fill={!v2Healthy ? '#fce8e6' : v2Percent > 0 ? '#e8f0fe' : '#f8fafd'}
                stroke={!v2Healthy ? '#c5221f' : v2Percent > 0 ? '#0b57d0' : '#94a3b8'}
                strokeWidth={!v2Healthy || v2Percent > 0 ? 2.2 : 1.4}
              />
              <text x="560" y="180" fontSize="15.5" fontWeight="700" fill={!v2Healthy ? '#a50e0e' : '#041e49'}>
                リビジョン v2（新版・tag: v2）
              </text>
              <text x="560" y="202" fontSize="12.5" fill="#444746">
                week01-manual-api-00002-v2
              </text>
              <text x="560" y="225" fontSize="12.5" fontWeight="700" fill={!v2Healthy ? '#c5221f' : '#0b57d0'}>
                {!v2Healthy
                  ? 'Ready ✓ だが業務 500 発生 → 配信停止'
                  : v2Percent === 0
                  ? 'Ready ✓（本番 0%・タグ URL で検証中）'
                  : `Ready ✓ ／ 本番 ${v2Percent}% 正常応答`}
              </text>
              <text x="560" y="249" fontSize="12" fill="#5f6368">
                @sha256:8f41...（不変スナップショット）
              </text>

              {/* Bottom 4-Stage Summary Strip */}
              <rect x="18" y="294" width="778" height="64" rx="11" fill="#ffffff" stroke="#e0e3eb" strokeWidth="1.2" />
              <text x="36" y="320" fontSize="13.5" fontWeight="700" fill="#1f1f1f">
                4 関門の分離：
              </text>
              <text x="148" y="320" fontSize="13" fill="#137333" fontWeight="650">
                ① 起動・Ready（Probe）
              </text>
              <text x="316" y="320" fontSize="13" fill="#0891b2" fontWeight="650">
                → ② 入口認証（Invoker）
              </text>
              <text x="488" y="320" fontSize="13" fill="#b06000" fontWeight="650">
                → ③ トラフィック（%）
              </text>
              <text x="646" y="320" fontSize="13" fill="#0b57d0" fontWeight="650">
                → ④ 業務 200 OK
              </text>
              <text x="36" y="344" fontSize="12" fill="#5f6368">
                Ready 成功＝業務正常とは限らないため、0% タグ検証と 10% カナリアで④を観測し、異常時は③だけ戻して数秒復旧する。
              </text>
            </svg>
          )}
        </div>

        <PlaybackBar
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (!isPlaying && stageIdx >= RELEASE_STAGES.length - 1) {
              setCustomV2Percent(null);
              setStageIdx(0);
            }
            setIsPlaying((prev) => !prev);
          }}
          onPrev={() => {
            setIsPlaying(false);
            setCustomV2Percent(null);
            setStageIdx((prev) => Math.max(0, prev - 1));
          }}
          prevDisabled={stageIdx === 0 && !isCustomSplit}
          onNext={() => {
            setIsPlaying(false);
            setCustomV2Percent(null);
            setStageIdx((prev) => (prev + 1) % RELEASE_STAGES.length);
          }}
          nextLabel="次の段階"
          speed={speed}
          onChangeSpeed={setSpeed}
          onReset={() => {
            setIsPlaying(false);
            setCustomV2Percent(null);
            setStageIdx(0);
          }}
        />
      </div>
    </div>
  );
}
