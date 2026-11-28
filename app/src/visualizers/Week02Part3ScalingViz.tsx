import { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

type PresetId = 'cost-zero' | 'warm-morning' | 'burst-cap';

interface PresetConfig {
  id: PresetId;
  label: string;
  dotTone: 'allow' | 'info' | 'deny';
  requests: number;
  concurrency: number;
  minInstances: number;
  maxInstances: number;
}

const PRESETS: PresetConfig[] = [
  {
    id: 'cost-zero',
    label: 'コスト最小 (min=0)',
    dotTone: 'info',
    requests: 0,
    concurrency: 80,
    minInstances: 0,
    maxInstances: 5,
  },
  {
    id: 'warm-morning',
    label: '朝9時対策 (min=1)',
    dotTone: 'allow',
    requests: 1,
    concurrency: 80,
    minInstances: 1,
    maxInstances: 5,
  },
  {
    id: 'burst-cap',
    label: '急増飽和 (max=3)',
    dotTone: 'deny',
    requests: 220,
    concurrency: 50,
    minInstances: 1,
    maxInstances: 3,
  },
];

const TIER_ROWS = [
  {
    tier: '第1層：プロジェクトのクォータ',
    scope: 'プロジェクト × リージョン全体',
    examples: 'リージョン総 vCPU 上限・総メモリ上限・API レート上限',
    changeEffect: '全サービス共通の天井。超えるとどのサービスも新規インスタンスを起動できない',
  },
  {
    tier: '第2層：サービス設定',
    scope: 'Cloud Run サービス単体',
    examples: 'トラフィック配分（%）・入口認証（Invoker）・Ingress（内部/外部）',
    changeEffect: '変更しても新しいリビジョンは作られず、数秒でサービス全体へ反映',
  },
  {
    tier: '第3層：リビジョン設定',
    scope: 'デプロイごとの不変スナップショット',
    examples: '`min-instances`・`max-instances`・`concurrency`・CPU/メモリ・環境変数・実行時 SA',
    changeEffect: '1 項目でも変えると必ず新しいリビジョンが 1 つ生成される（旧版は不変）',
  },
];

interface Part3Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Week02Part3ScalingViz({ onStepInsightChange }: Part3Props) {
  const isMobile = useIsMobile();
  const reqSliderId = useId();
  const concSliderId = useId();

  const [activePreset, setActivePreset] = useState<PresetId | null>('warm-morning');
  const [requests, setRequests] = useState(1);
  const [concurrency, setConcurrency] = useState(80);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(5);

  const rawNeeded = requests === 0 ? 0 : Math.ceil(requests / concurrency);
  const effectiveInstances = Math.min(maxInstances, Math.max(minInstances, rawNeeded));
  const maxCapacity = maxInstances * concurrency;
  const overflowRequests = Math.max(0, requests - maxCapacity);
  const isSaturated = overflowRequests > 0;
  const isColdStartRisk = minInstances === 0 && requests === 0;
  const isWarmIdle = minInstances > 0 && requests === 0;

  useEffect(() => {
    const statusTitle = isSaturated
      ? `上限飽和：max-instances=${maxInstances} に到達（超過 ${overflowRequests} 件は待機 / 429）`
      : isColdStartRisk
      ? 'スケール・トゥ・ゼロ（0 台）：課金ゼロだが初回アクセスでコールドスタート発生'
      : isWarmIdle
      ? `ウォーム待機中（min-instances=${minInstances}）：初回遅延なし・アイドル課金あり`
      : `正常稼働中（${effectiveInstances} 台で同時 ${requests} 件を処理）`;

    const explanation = isSaturated
      ? `同時リクエスト ${requests} 件を処理するには本来 ${rawNeeded} 台（ceil(${requests} ÷ ${concurrency})）必要ですが、max-instances=${maxInstances} で同期的に頭打ちにしています。最大処理枠 ${maxCapacity} 件を超えた ${overflowRequests} 件はキュー待ち後に 429 となり、暴走課金や裏側 DB の過負荷を防ぎます。`
      : isColdStartRisk
      ? 'リクエストがないため稼働台数が 0 台まで縮小し、課金は $0 です。ただし次に最初のリクエストが来た瞬間、コンテナ起動＋初期化（コールドスタート：数秒）の待ち時間が発生します。'
      : isWarmIdle
      ? `リクエストが 0 件でも ${minInstances} 台を常時ウォーム待機させています。朝 9 時の最初のリクエストも数十〜数百 ms で応答できますが、待機時間にもアイドル課金が発生するトレードオフがあります。`
      : `同時リクエスト ${requests} 件 ÷ 同時実行数 ${concurrency} = 必要 ${rawNeeded} 台（下限 ${minInstances} / 上限 ${maxInstances} の範囲内）でスムーズに処理できています。`;

    onStepInsightChange({
      stepNumber: isSaturated ? 3 : minInstances >= 1 ? 2 : 1,
      totalSteps: 3,
      badge: isSaturated ? 'max-instances 到達（429 保護）' : minInstances === 0 ? 'min=0（コスト優先）' : `min=${minInstances}（低遅延優先）`,
      title: statusTitle,
      subtitle: `必要台数 ceil(${requests} ÷ ${concurrency}) = ${rawNeeded} 台 → 実稼働 ${effectiveInstances} 台`,
      explanation,
      kvPairs: [
        {
          label: '実稼働インスタンス',
          value: `${effectiveInstances} 台（下限 ${minInstances} / 上限 ${maxInstances}）`,
          tone: isSaturated ? 'deny' : effectiveInstances === 0 ? 'warn' : 'allow',
        },
        {
          label: '初回アクセス応答',
          value: minInstances === 0 ? 'コールドスタートあり（約 2〜4 秒）' : 'ウォーム即時応答（約 0.1〜0.3 秒）',
          tone: minInstances === 0 ? 'warn' : 'allow',
        },
        {
          label: 'アイドル時コスト',
          value: minInstances === 0 ? '$0（0 台スケール）' : `アイドル待機課金あり（${minInstances} 台分）`,
          tone: minInstances === 0 ? 'allow' : 'info',
        },
        {
          label: '同時処理上限',
          value: isSaturated ? `上限 ${maxCapacity} 件を超過（+${overflowRequests} 件 429/待機）` : `最大 ${maxCapacity} 件まで余裕あり`,
          tone: isSaturated ? 'deny' : 'neutral',
        },
      ],
      payloadTitle: '現在のリビジョン・スケール設定（JSON）',
      payloadJson: JSON.stringify(
        {
          settingsLayer: '第3層：リビジョン設定（変更時は新リビジョン生成）',
          concurrentRequests: requests,
          concurrencyPerInstance: concurrency,
          minInstances,
          maxInstances,
          calculatedNeededInstances: rawNeeded,
          activeInstances: effectiveInstances,
          overflow429Count: overflowRequests,
        },
        null,
        2,
      ),
    });
  }, [
    requests,
    concurrency,
    minInstances,
    maxInstances,
    rawNeeded,
    effectiveInstances,
    maxCapacity,
    overflowRequests,
    isSaturated,
    isColdStartRisk,
    isWarmIdle,
    onStepInsightChange,
  ]);

  const applyPreset = (p: PresetConfig) => {
    setActivePreset(p.id);
    setRequests(p.requests);
    setConcurrency(p.concurrency);
    setMinInstances(p.minInstances);
    setMaxInstances(p.maxInstances);
  };

  const slotIndices = Array.from({ length: maxInstances }, (_, i) => i);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">プリセット:</span>
            <div className="scenario-bar" role="group" aria-label="スケーリングプリセット選択">
              {PRESETS.map((p) => {
                const selected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="scenario-pill"
                    aria-pressed={selected}
                    onClick={() => applyPreset(p)}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <span className={`chip-dot ${p.dotTone}`} aria-hidden="true" />
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Manual Tuning Panel */}
        <div className="scaling-controls-grid">
          <div className="scaling-slider-card">
            <div className="scaling-slider-head">
              <label htmlFor={reqSliderId}>同時リクエスト数</label>
              <span className="mono scaling-val">{requests} req</span>
            </div>
            <input
              id={reqSliderId}
              type="range"
              className="modern-range"
              min={0}
              max={240}
              step={10}
              value={requests}
              aria-valuetext={`同時リクエスト数 ${requests} 件`}
              style={
                {
                  '--attr-min': 0,
                  '--attr-max': 240,
                  '--control-value': requests,
                } as React.CSSProperties
              }
              onChange={(e) => {
                setActivePreset(null);
                setRequests(Number(e.target.value));
              }}
            />
          </div>

          <div className="scaling-slider-card">
            <div className="scaling-slider-head">
              <label htmlFor={concSliderId}>同時実行数（Concurrency）</label>
              <span className="mono scaling-val">{concurrency} / 台</span>
            </div>
            <input
              id={concSliderId}
              type="range"
              className="modern-range"
              min={10}
              max={80}
              step={10}
              value={concurrency}
              aria-valuetext={`1 インスタンスあたりの同時実行数 ${concurrency} 件`}
              style={
                {
                  '--attr-min': 10,
                  '--attr-max': 80,
                  '--control-value': concurrency,
                } as React.CSSProperties
              }
              onChange={(e) => {
                setActivePreset(null);
                setConcurrency(Number(e.target.value));
              }}
            />
          </div>

          <div className="scaling-toggle-row">
            <div className="scaling-seg-wrap">
              <span className="toolbar-label">min-instances:</span>
              <div className="segmented" role="group" aria-label="最小インスタンス数">
                {[0, 1, 2].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="seg-btn"
                    aria-pressed={minInstances === val}
                    onClick={() => {
                      setActivePreset(null);
                      setMinInstances(val);
                    }}
                  >
                    {val} 台
                  </button>
                ))}
              </div>
            </div>

            <div className="scaling-seg-wrap">
              <span className="toolbar-label">max-instances:</span>
              <div className="segmented" role="group" aria-label="最大インスタンス数">
                {[3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="seg-btn"
                    aria-pressed={maxInstances === val}
                    onClick={() => {
                      setActivePreset(null);
                      setMaxInstances(val);
                    }}
                  >
                    上限 {val} 台
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Scaling SVG */}
        <div className="blueprint-stage">
          {isMobile ? (
            <svg
              className="blueprint-svg"
              viewBox="0 0 380 358"
              role="img"
              aria-label={`Cloud Run スケーリング状態図（同時 ${requests} 件、稼働 ${effectiveInstances} / 最大 ${maxInstances} 台・モバイル）`}
            >
              <title>スケーリングとコールドスタート（モバイル）</title>

              {/* Formula Banner */}
              <rect x="12" y="10" width="356" height="60" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
              <text x="190" y="34" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#1f1f1f">
                必要台数 = ceil({requests} ÷ {concurrency}) = {rawNeeded} 台
              </text>
              <text x="190" y="55" textAnchor="middle" fontSize="12.5" fontWeight="650" fill={isSaturated ? '#c5221f' : '#0b57d0'}>
                実稼働：{effectiveInstances} 台（下限 {minInstances} / 上限 {maxInstances}）
              </text>

              {/* Instance Slots */}
              <rect x="12" y="84" width="356" height="168" rx="11" fill="#f8fafd" stroke="#e0e3eb" strokeWidth="1.2" />
              <text x="26" y="106" fontSize="12.5" fontWeight="700" fill="#444746">
                稼働コンテナインスタンス枠（最大 {maxInstances} 台）
              </text>

              {slotIndices.map((idx) => {
                const isActive = idx < effectiveInstances;
                const isWarmOnly = isActive && idx >= rawNeeded;
                const slotW = maxInstances === 3 ? 104 : 62;
                const gap = maxInstances === 3 ? 10 : 6;
                const startX = 24;
                const x = startX + idx * (slotW + gap);
                const fill = !isActive ? '#f1f3f4' : isWarmOnly ? '#fef7e0' : '#e6f4ea';
                const stroke = !isActive ? '#cbd5e1' : isWarmOnly ? '#b06000' : '#137333';
                return (
                  <g key={idx}>
                    <rect x={x} y="120" width={slotW} height="82" rx="9" fill={fill} stroke={stroke} strokeWidth={isActive ? 1.8 : 1.1} strokeDasharray={isActive ? undefined : '4 3'} />
                    <text x={x + slotW / 2} y="148" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={!isActive ? '#5f6368' : isWarmOnly ? '#7a4100' : '#0d652d'}>
                      #{idx + 1}
                    </text>
                    <text x={x + slotW / 2} y="172" textAnchor="middle" fontSize="11.5" fontWeight="600" fill={!isActive ? '#64748b' : isWarmOnly ? '#b06000' : '#137333'}>
                      {!isActive ? '休止' : isWarmOnly ? '待機' : '処理中'}
                    </text>
                    <text x={x + slotW / 2} y="191" textAnchor="middle" fontSize="10.5" fill="#5f6368">
                      {isActive && !isWarmOnly ? `〜${concurrency}件` : isWarmOnly ? 'min枠' : '0件'}
                    </text>
                  </g>
                );
              })}

              <text x="26" y="232" fontSize="11.5" fill="#5f6368">
                緑＝処理中 / 黄＝min 待機（課金あり） / 灰＝休止（$0）
              </text>

              {/* Status Banner */}
              <rect
                x="12"
                y="266"
                width="356"
                height="80"
                rx="11"
                fill={isSaturated ? '#fce8e6' : isColdStartRisk ? '#fef7e0' : '#e6f4ea'}
                stroke={isSaturated ? '#c5221f' : isColdStartRisk ? '#b06000' : '#137333'}
                strokeWidth="1.5"
              />
              <text x="26" y="293" fontSize="13.5" fontWeight="700" fill={isSaturated ? '#a50e0e' : isColdStartRisk ? '#7a4100' : '#0d652d'}>
                {isSaturated
                  ? `429 保護発動：超過 ${overflowRequests} 件を上限でブロック`
                  : isColdStartRisk
                  ? 'コールドスタート注意（0 台待機・課金 $0）'
                  : isWarmIdle
                  ? `ウォーム待機中（朝 9 時も即時応答・${minInstances} 台課金）`
                  : '安定スケール中（コールドスタートなし）'}
              </text>
              <text x="26" y="317" fontSize="12" fill="#444746">
                {isSaturated
                  ? 'max-instances は暴走課金＆下流 DB 過負荷を防ぐ安全弁'
                  : isColdStartRisk
                  ? '初回アクセスのみ起動待ち（2〜4 秒）が発生'
                  : '起動時 CPU ブースト＋軽量イメージで追加起動も高速化'}
              </text>
            </svg>
          ) : (
            <svg
              className="blueprint-svg"
              viewBox="0 0 820 264"
              role="img"
              aria-label={`Cloud Run スケーリング状態図（同時 ${requests} 件、稼働 ${effectiveInstances} / 最大 ${maxInstances} 台）`}
            >
              <title>自動スケーリングとコールドスタート</title>
              <defs>
                <marker id="w2p3-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#64748b" />
                </marker>
              </defs>

              {/* Left: Incoming Load */}
              <rect x="18" y="20" width="188" height="148" rx="12" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.5" />
              <text x="112" y="48" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#155e75">
                同時リクエスト負荷
              </text>
              <text x="112" y="88" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0e7490">
                {requests}
              </text>
              <text x="112" y="110" textAnchor="middle" fontSize="12.5" fill="#155e75">
                req（同時接続）
              </text>
              <text x="112" y="140" textAnchor="middle" fontSize="12" fill="#444746">
                ÷ Concurrency {concurrency} = {rawNeeded} 台必要
              </text>

              <path d="M 206 94 L 246 94" fill="none" stroke="#64748b" strokeWidth="2" markerEnd="url(#w2p3-arr)" />

              {/* Right: Instance Pool */}
              <rect x="252" y="20" width="544" height="148" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.4" />
              <text x="272" y="45" fontSize="14" fontWeight="700" fill="#1f1f1f">
                Cloud Run インスタンス枠（下限 min={minInstances} ／ 上限 max={maxInstances} 台）
              </text>

              {slotIndices.map((idx) => {
                const isActive = idx < effectiveInstances;
                const isWarmOnly = isActive && idx >= rawNeeded;
                const slotW = maxInstances === 3 ? 156 : 94;
                const gap = maxInstances === 3 ? 18 : 10;
                const x = 272 + idx * (slotW + gap);
                const fill = !isActive ? '#f1f3f4' : isWarmOnly ? '#fef7e0' : '#e6f4ea';
                const stroke = !isActive ? '#cbd5e1' : isWarmOnly ? '#b06000' : '#137333';
                return (
                  <g key={idx}>
                    <rect x={x} y="60" width={slotW} height="90" rx="10" fill={fill} stroke={stroke} strokeWidth={isActive ? 2 : 1.2} strokeDasharray={isActive ? undefined : '4 3'} />
                    <text x={x + slotW / 2} y="88" textAnchor="middle" fontSize="14" fontWeight="700" fill={!isActive ? '#5f6368' : isWarmOnly ? '#7a4100' : '#0d652d'}>
                      コンテナ #{idx + 1}
                    </text>
                    <text x={x + slotW / 2} y="112" textAnchor="middle" fontSize="12.5" fontWeight="650" fill={!isActive ? '#64748b' : isWarmOnly ? '#b06000' : '#137333'}>
                      {!isActive ? '未起動 (0)' : isWarmOnly ? 'ウォーム待機' : '稼働処理中'}
                    </text>
                    <text x={x + slotW / 2} y="134" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      {!isActive ? '課金なし' : isWarmOnly ? 'アイドル課金' : `最大 ${concurrency} 件`}
                    </text>
                  </g>
                );
              })}

              {/* Bottom Outcome Banner */}
              <rect
                x="18"
                y="186"
                width="778"
                height="62"
                rx="11"
                fill={isSaturated ? '#fce8e6' : isColdStartRisk ? '#fef7e0' : '#e6f4ea'}
                stroke={isSaturated ? '#c5221f' : isColdStartRisk ? '#b06000' : '#137333'}
                strokeWidth="1.5"
              />
              <text x="38" y="213" fontSize="14.5" fontWeight="700" fill={isSaturated ? '#a50e0e' : isColdStartRisk ? '#7a4100' : '#0d652d'}>
                {isSaturated
                  ? `上限到達：最大処理枠 ${maxCapacity} 件を超えた ${overflowRequests} 件は待機／429（課金暴走＆下流 DB を保護）`
                  : isColdStartRisk
                  ? 'スケール・トゥ・ゼロ（0 台）：アイドル課金 $0 ／ 次の初回リクエストのみコールドスタート（2〜4 秒）発生'
                  : isWarmIdle
                  ? `ウォーム待機（min-instances=${minInstances}）：朝 9 時の初回も即時応答 ／ 待機分のアイドル課金が発生`
                  : `正常稼働（${effectiveInstances} 台）：同時 ${requests} 件を処理中（最大キャパシティ ${maxCapacity} 件）`}
              </text>
              <text x="38" y="236" fontSize="12.5" fill="#444746">
                ヒント：コールドスタート対策は「① イメージ軽量化・初期化削減 → ② 起動時 CPU ブースト → ③ 本番 API のみ min-instances=1」の順で検討する。
              </text>
            </svg>
          )}
        </div>

        {/* 3-Tier Settings Hierarchy Table */}
        <section className="skeleton-principles" aria-labelledby="w2p3-tiers-heading">
          <div className="skeleton-principles-head">
            <p className="panel-kicker">実機で迷わない「設定の 3 階層」</p>
            <h2 id="w2p3-tiers-heading" className="skeleton-section-title">
              クォータ・サービス設定・リビジョン設定のどこで効くか
            </h2>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="w2p3-tiers-heading"
            className="responsive-table-wrap"
          >
            <table className="comparison-table comparison-table--tiers">
              <caption className="visually-hidden">
                クォータ・サービス設定・リビジョン設定の 3 階層比較表
              </caption>
              <thead>
                <tr>
                  <th scope="col">設定階層</th>
                  <th scope="col">効く範囲</th>
                  <th scope="col">代表的な設定項目</th>
                  <th scope="col">変更時の挙動</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map((row) => (
                  <tr key={row.tier}>
                    <th scope="row">{row.tier}</th>
                    <td>{row.scope}</td>
                    <td>{row.examples}</td>
                    <td>{row.changeEffect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
