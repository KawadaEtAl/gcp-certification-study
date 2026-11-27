import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type AttachScope = 'none' | 'project' | 'resource';
type LeafId = 'gcs-manual' | 'gcs-secret' | 'sec-api' | 'sec-db';

interface LeafResource {
  id: LeafId;
  name: string;
  kind: 'GCS Bucket' | 'Secret Manager';
  intended: boolean;
  x: number;
}

const LEAVES: LeafResource[] = [
  { id: 'gcs-manual', name: 'manual-docs', kind: 'GCS Bucket', intended: true, x: 112 },
  { id: 'gcs-secret', name: 'billing-confidential', kind: 'GCS Bucket', intended: false, x: 304 },
  { id: 'sec-api', name: 'rag-api-key', kind: 'Secret Manager', intended: true, x: 516 },
  { id: 'sec-db', name: 'db-master-pass', kind: 'Secret Manager', intended: false, x: 708 },
];

interface Part3Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Part3HierarchyViz({ onStepInsightChange }: Part3Props) {
  const isMobile = useIsMobile();
  const [gcsScope, setGcsScope] = useState<AttachScope>('project');
  const [secretScope, setSecretScope] = useState<AttachScope>('project');
  const [denySensitive, setDenySensitive] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState<LeafId>('sec-db');
  const [cascadeStage, setCascadeStage] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const runCascade = () => {
    clearTimers();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCascadeStage(3);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setCascadeStage(0);
    timersRef.current.push(
      window.setTimeout(() => setCascadeStage(1), 260),
      window.setTimeout(() => setCascadeStage(2), 560),
      window.setTimeout(() => {
        setCascadeStage(3);
        setIsPlaying(false);
      }, 920),
    );
  };

  const handleStepCascade = () => {
    clearTimers();
    setIsPlaying(false);
    setCascadeStage((prev) => (prev >= 3 ? 0 : prev + 1));
  };

  const evaluation = useMemo(() => {
    const res: Record<
      LeafId,
      {
        inheritedAllow: string[];
        directAllow: string[];
        deniedByPolicy: boolean;
        effective: 'allowed-intended' | 'allowed-leak' | 'denied-explicit' | 'denied-default';
      }
    > = {
      'gcs-manual': {
        inheritedAllow: gcsScope === 'project' ? ['roles/storage.objectViewer (Project継承)'] : [],
        directAllow: gcsScope === 'resource' ? ['roles/storage.objectViewer (直接付与)'] : [],
        deniedByPolicy: false,
        effective: gcsScope !== 'none' ? 'allowed-intended' : 'denied-default',
      },
      'gcs-secret': {
        inheritedAllow: gcsScope === 'project' ? ['roles/storage.objectViewer (Project継承)'] : [],
        directAllow: [],
        deniedByPolicy: denySensitive && gcsScope === 'project',
        effective:
          gcsScope === 'project'
            ? denySensitive
              ? 'denied-explicit'
              : 'allowed-leak'
            : 'denied-default',
      },
      'sec-api': {
        inheritedAllow: secretScope === 'project' ? ['roles/secretmanager.secretAccessor (Project継承)'] : [],
        directAllow: secretScope === 'resource' ? ['roles/secretmanager.secretAccessor (直接付与)'] : [],
        deniedByPolicy: false,
        effective: secretScope !== 'none' ? 'allowed-intended' : 'denied-default',
      },
      'sec-db': {
        inheritedAllow: secretScope === 'project' ? ['roles/secretmanager.secretAccessor (Project継承)'] : [],
        directAllow: [],
        deniedByPolicy: denySensitive && secretScope === 'project',
        effective:
          secretScope === 'project'
            ? denySensitive
              ? 'denied-explicit'
              : 'allowed-leak'
            : 'denied-default',
      },
    };
    return res;
  }, [gcsScope, secretScope, denySensitive]);

  const blastRadiusCount = (['gcs-secret', 'sec-db'] as LeafId[]).filter(
    (id) => evaluation[id].effective === 'allowed-leak',
  ).length;
  const intendedReadyCount = (['gcs-manual', 'sec-api'] as LeafId[]).filter(
    (id) => evaluation[id].effective === 'allowed-intended',
  ).length;

  useEffect(() => {
    const leaf = LEAVES.find((l) => l.id === selectedLeaf)!;
    const ev = evaluation[selectedLeaf];
    const tone =
      ev.effective === 'allowed-intended'
        ? 'allow'
        : ev.effective === 'allowed-leak'
        ? 'deny'
        : ev.effective === 'denied-explicit'
        ? 'warn'
        : 'neutral';

    const statusLabel =
      ev.effective === 'allowed-intended'
        ? '許可・意図通りアクセス可'
        : ev.effective === 'allowed-leak'
        ? '許可（危険）・上位継承で露出'
        : ev.effective === 'denied-explicit'
        ? '拒否・IAM Deny で遮断'
        : '権限なし（安全）';

    onStepInsightChange({
      stepNumber: LEAVES.findIndex((l) => l.id === selectedLeaf) + 1,
      totalSteps: LEAVES.length,
      badge: `有効ポリシー・${leaf.kind}`,
      title: `${leaf.name} の有効ポリシー評価`,
      subtitle: leaf.intended
        ? '実行時ID（sa-reader）が読むべき対象リソース'
        : '機密リソース：実行時IDに読ませてはいけない対象',
      explanation:
        ev.effective === 'allowed-leak'
          ? 'このリソース自身の IAM は空ですが、親の Project に付与されたロールが下位へ「足し算」で継承されているため、`sa-reader` が読み取れてしまいます。最小権限にするには Project の付与を外し、対象リソース単体へ移します。'
          : ev.effective === 'denied-explicit'
          ? '親の Project から Allow が継承されていますが、IAM Deny ポリシーは Allow の和集合より優先して評価されるためアクセスが遮断されます。'
          : ev.effective === 'allowed-intended'
          ? '必要なロールが有効になっているため、アプリから正常に読み取れます。'
          : '上位からの継承も直接付与も無いため、デフォルト拒否で安全に保護されています。',
      kvPairs: [
        { label: '対象リソース', value: leaf.name },
        { label: '直接付与', value: ev.directAllow.length ? ev.directAllow[0] : 'なし（空）' },
        { label: '親からの継承', value: ev.inheritedAllow.length ? ev.inheritedAllow[0] : 'なし' },
        { label: '最終評価', value: statusLabel, tone },
      ],
      payloadTitle: '有効ポリシーの評価結果（和集合）',
      payloadJson: JSON.stringify(
        {
          resource: leaf.name,
          principal: 'sa-reader@study.iam.gserviceaccount.com',
          allowUnion: [...ev.inheritedAllow, ...ev.directAllow],
          denyPolicyMatched: ev.deniedByPolicy,
          finalDecision:
            ev.effective === 'allowed-intended' || ev.effective === 'allowed-leak' ? 'ALLOW' : 'DENY',
        },
        null,
        2,
      ),
    });
  }, [selectedLeaf, evaluation, onStepInsightChange]);

  const activePreset =
    gcsScope === 'resource' && secretScope === 'resource' && !denySensitive
      ? 'least'
      : gcsScope === 'project' && secretScope === 'project' && !denySensitive
      ? 'project-trap'
      : gcsScope === 'project' && secretScope === 'project' && denySensitive
      ? 'deny-guard'
      : null;

  const applyPreset = (preset: 'least' | 'project-trap' | 'deny-guard') => {
    if (preset === 'least') {
      setGcsScope('resource');
      setSecretScope('resource');
      setDenySensitive(false);
    } else if (preset === 'project-trap') {
      setGcsScope('project');
      setSecretScope('project');
      setDenySensitive(false);
    } else {
      setGcsScope('project');
      setSecretScope('project');
      setDenySensitive(true);
    }
    runCascade();
  };

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        {/* Preset Toolbar (cleanly separated from manual controls) */}
        <div className="canvas-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">プリセット:</span>
            <div className="scenario-bar" role="group" aria-label="設計プリセット">
              {[
                { id: 'least' as const, label: '理想：単体付与', dot: 'allow' },
                { id: 'project-trap' as const, label: '罠：プロジェクト付与', dot: 'deny' },
                { id: 'deny-guard' as const, label: '上位Allow＋Deny', dot: 'warn' },
              ].map((p) => {
                const selected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="scenario-pill"
                    aria-pressed={selected}
                    onClick={() => applyPreset(p.id)}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <span className={`chip-dot ${p.dot}`} aria-hidden="true" />
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="blueprint-stage">
          {isMobile ? (
            /* 1:1 PORTRAIT MOBILE TREE WITH FULL LEFT-TRUNK CONNECTOR TO ALL 4 RESOURCES */
            <svg
              className="blueprint-svg"
              viewBox="0 0 380 572"
              role="img"
              aria-label="Google Cloud リソース階層と IAM 権限継承ツリー（モバイル）"
            >
              <title>リソース階層と IAM 継承・影響範囲ツリー（モバイル）</title>

              {/* Level 0: Org */}
              <g opacity={cascadeStage >= 0 ? 1 : 0.35}>
                <rect x="40" y="12" width="320" height="48" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="200" y="34" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">組織（Organization）</text>
                <text x="200" y="51" textAnchor="middle" fontSize="12" fill="#5f6368" fontFamily="ui-monospace, monospace">example-org.com</text>
              </g>
              <line x1="200" y1="60" x2="200" y2="82" stroke="#94a3b8" strokeWidth="1.8" />

              {/* Level 1: Folder */}
              <g opacity={cascadeStage >= 1 ? 1 : 0.35}>
                <rect x="40" y="82" width="320" height="48" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="200" y="104" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">フォルダ（Folder）</text>
                <text x="200" y="121" textAnchor="middle" fontSize="12" fill="#5f6368" fontFamily="ui-monospace, monospace">folder/prod-apps</text>
              </g>
              <line x1="200" y1="130" x2="200" y2="156" stroke={cascadeStage >= 2 ? '#0b57d0' : '#94a3b8'} strokeWidth="2" />

              {/* Level 2: Project */}
              <g opacity={cascadeStage >= 2 ? 1 : 0.35}>
                <rect
                  x="16"
                  y="156"
                  width="348"
                  height="72"
                  rx="12"
                  fill={gcsScope === 'project' || secretScope === 'project' ? '#eef2ff' : '#ffffff'}
                  stroke={gcsScope === 'project' || secretScope === 'project' ? '#4338ca' : '#0b57d0'}
                  strokeWidth="2"
                />
                <text x="190" y="183" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                  プロジェクト：manual-rag-prod
                </text>
                <text x="190" y="210" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#4338ca">
                  {gcsScope === 'project' && secretScope === 'project'
                    ? '付与中: Storage + Secret（4件すべてへ継承）'
                    : gcsScope === 'project'
                    ? '付与中: Storage Viewer（バケットへ継承）'
                    : secretScope === 'project'
                    ? '付与中: Secret Accessor（シークレットへ継承）'
                    : 'プロジェクト階層の広い権限なし（安全）'}
                </text>
              </g>

              {/* Left-edge vertical trunk + branches connecting Project to BOTH rows (all 4 resources!) */}
              <path
                d="M 28 228 L 28 486"
                fill="none"
                stroke={gcsScope === 'project' || secretScope === 'project' ? '#4338ca' : '#94a3b8'}
                strokeWidth="2.4"
                strokeDasharray={gcsScope === 'project' || secretScope === 'project' ? '6 4' : undefined}
                className={(gcsScope === 'project' || secretScope === 'project') && cascadeStage >= 3 ? 'svg-dash-flow' : ''}
              />
              {/* Row 1 (GCS) horizontal branch feeding both top cards */}
              <path d="M 28 264 L 284 264 M 116 264 L 116 284 M 284 264 L 284 284" fill="none" stroke={gcsScope === 'project' ? '#4338ca' : '#94a3b8'} strokeWidth="2" />
              {/* Row 2 (Secret Manager) horizontal branch feeding both bottom cards */}
              <path d="M 28 412 L 284 412 M 116 412 L 116 432 M 284 412 L 284 432" fill="none" stroke={secretScope === 'project' ? '#4338ca' : '#94a3b8'} strokeWidth="2" />

              {/* 2x2 Grid of Leaf Resources (shifted right of x=28 trunk) */}
              {LEAVES.map((leaf, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const x = col === 0 ? 40 : 208;
                const y = row === 0 ? 284 : 432;
                const cx = x + 78;
                const ev = evaluation[leaf.id];
                const isSelected = selectedLeaf === leaf.id;
                let fill = '#ffffff';
                let stroke = '#94a3b8';
                let badgeBg = '#f1f3f4';
                let badgeInk = '#5f6368';
                let badgeText = '権限なし';

                if (cascadeStage >= 3) {
                  if (ev.effective === 'allowed-intended') {
                    fill = '#e6f4ea'; stroke = '#137333'; badgeBg = '#137333'; badgeInk = '#ffffff'; badgeText = '✓ 意図通り読取可';
                  } else if (ev.effective === 'allowed-leak') {
                    fill = '#fce8e6'; stroke = '#c5221f'; badgeBg = '#c5221f'; badgeInk = '#ffffff'; badgeText = '⚠ 継承で露出!';
                  } else if (ev.effective === 'denied-explicit') {
                    fill = '#fef7e0'; stroke = '#b06000'; badgeBg = '#b06000'; badgeInk = '#ffffff'; badgeText = '✕ Deny で遮断';
                  }
                }

                return (
                  <g key={`m-${leaf.id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedLeaf(leaf.id)}>
                    <rect
                      x={x}
                      y={y}
                      width="156"
                      height="114"
                      rx="12"
                      fill={fill}
                      stroke={isSelected ? '#0b57d0' : stroke}
                      strokeWidth={isSelected ? 2.8 : 1.6}
                    />
                    <text x={cx} y={y + 21} textAnchor="middle" fontSize="11.5" fontWeight="650" fill="#5f6368">
                      {leaf.kind}
                    </text>
                    <text x={cx} y={y + 44} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#1f1f1f">
                      {leaf.name}
                    </text>
                    <text x={cx} y={y + 66} textAnchor="middle" fontSize="12" fill="#444746">
                      {leaf.intended ? '目的：読ませたい' : '機密：読ませない'}
                    </text>
                    <rect x={x + 10} y={y + 78} width="136" height="25" rx="12.5" fill={badgeBg} />
                    <text x={cx} y={y + 94.5} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={badgeInk}>
                      {badgeText}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            /* DESKTOP TREE (larger legible fonts >= 13px) */
            <svg
              className="blueprint-svg"
              viewBox="0 0 820 424"
              role="img"
              aria-label="Google Cloud リソース階層と IAM 権限継承ヒートマップ"
            >
              <title>リソース階層と IAM 継承・影響範囲ツリー</title>

              <g opacity={cascadeStage >= 0 ? 1 : 0.35}>
                <rect x="275" y="14" width="270" height="48" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="410" y="36" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">組織（Organization）</text>
                <text x="410" y="54" textAnchor="middle" fontSize="12.5" fill="#5f6368" fontFamily="ui-monospace, monospace">example-org.com</text>
              </g>

              <line x1="410" y1="62" x2="410" y2="88" stroke="#94a3b8" strokeWidth="1.8" />

              <g opacity={cascadeStage >= 1 ? 1 : 0.35}>
                <rect x="275" y="88" width="270" height="48" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="410" y="110" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">フォルダ（Folder）</text>
                <text x="410" y="128" textAnchor="middle" fontSize="12.5" fill="#5f6368" fontFamily="ui-monospace, monospace">folder/prod-apps</text>
              </g>

              <line x1="410" y1="136" x2="410" y2="164" stroke={cascadeStage >= 2 ? '#0b57d0' : '#94a3b8'} strokeWidth="2" />

              <g opacity={cascadeStage >= 2 ? 1 : 0.35}>
                <rect
                  x="200"
                  y="164"
                  width="420"
                  height="68"
                  rx="12"
                  fill={gcsScope === 'project' || secretScope === 'project' ? '#eef2ff' : '#ffffff'}
                  stroke={gcsScope === 'project' || secretScope === 'project' ? '#4338ca' : '#0b57d0'}
                  strokeWidth="2"
                />
                <text x="410" y="191" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                  プロジェクト：manual-rag-prod
                </text>
                <text x="410" y="216" textAnchor="middle" fontSize="13" fontWeight="650" fill="#4338ca">
                  {gcsScope === 'project' && secretScope === 'project'
                    ? '付与中: Storage Viewer + Secret Accessor（全4件へ継承）'
                    : gcsScope === 'project'
                    ? '付与中: Storage Object Viewer（全バケットへ継承）'
                    : secretScope === 'project'
                    ? '付与中: Secret Accessor（全シークレットへ継承）'
                    : 'プロジェクト階層の広いデータ権限なし（クリーン）'}
                </text>
              </g>

              {LEAVES.map((leaf) => {
                const ev = evaluation[leaf.id];
                const isInherited = ev.inheritedAllow.length > 0;
                const branchColor =
                  cascadeStage < 3
                    ? '#cbd5e1'
                    : ev.effective === 'allowed-leak'
                    ? '#c5221f'
                    : ev.effective === 'denied-explicit'
                    ? '#b06000'
                    : isInherited
                    ? '#137333'
                    : '#94a3b8';

                return (
                  <g key={`branch-${leaf.id}`}>
                    <path
                      d={`M 410 232 L 410 262 L ${leaf.x} 262 L ${leaf.x} 288`}
                      fill="none"
                      stroke={branchColor}
                      strokeWidth={isInherited ? 2.6 : 1.6}
                      strokeDasharray={isInherited ? '6 4' : undefined}
                      className={isInherited && cascadeStage >= 3 ? 'svg-dash-flow' : ''}
                    />
                    {ev.deniedByPolicy && cascadeStage >= 3 && (
                      <g transform={`translate(${leaf.x}, 264)`}>
                        <rect x="-40" y="-12" width="80" height="24" rx="12" fill="#fef7e0" stroke="#b06000" strokeWidth="1.5" />
                        <text y="4.5" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#7c4300">
                          IAM Deny
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {LEAVES.map((leaf) => {
                const ev = evaluation[leaf.id];
                const isSelected = selectedLeaf === leaf.id;
                let fill = '#ffffff';
                let stroke = '#94a3b8';
                let badgeBg = '#f1f3f4';
                let badgeInk = '#5f6368';
                let badgeText = '権限なし';

                if (cascadeStage >= 3) {
                  if (ev.effective === 'allowed-intended') {
                    fill = '#e6f4ea'; stroke = '#137333'; badgeBg = '#137333'; badgeInk = '#ffffff'; badgeText = '✓ 意図通り読取可';
                  } else if (ev.effective === 'allowed-leak') {
                    fill = '#fce8e6'; stroke = '#c5221f'; badgeBg = '#c5221f'; badgeInk = '#ffffff'; badgeText = '⚠ 継承により露出!';
                  } else if (ev.effective === 'denied-explicit') {
                    fill = '#fef7e0'; stroke = '#b06000'; badgeBg = '#b06000'; badgeInk = '#ffffff'; badgeText = '✕ Deny で遮断';
                  }
                }

                return (
                  <g key={leaf.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLeaf(leaf.id)}>
                    <rect
                      x={leaf.x - 88}
                      y="290"
                      width="176"
                      height="118"
                      rx="12"
                      fill={fill}
                      stroke={isSelected ? '#0b57d0' : stroke}
                      strokeWidth={isSelected ? 2.8 : 1.6}
                    />
                    <text x={leaf.x} y="313" textAnchor="middle" fontSize="12" fontWeight="650" fill="#5f6368">
                      {leaf.kind}
                    </text>
                    <text x={leaf.x} y="338" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#1f1f1f">
                      {leaf.name}
                    </text>
                    <text x={leaf.x} y="360" textAnchor="middle" fontSize="12.5" fill="#444746">
                      {leaf.intended ? '目的：読ませたい' : '機密：読ませない'}
                    </text>
                    <rect x={leaf.x - 74} y="372" width="148" height="26" rx="13" fill={badgeBg} />
                    <text x={leaf.x} y="389.5" textAnchor="middle" fontSize="12" fontWeight="700" fill={badgeInk}>
                      {badgeText}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Unified Playback Bar + Unified Mobile Dock (now present on Part 3 too!) */}
        <PlaybackBar
          isPlaying={isPlaying}
          playLabel="伝播を再生"
          pauseLabel="再生中…"
          onTogglePlay={runCascade}
          onNext={handleStepCascade}
          nextLabel="階層ステップ"
          onReset={() => {
            clearTimers();
            setIsPlaying(false);
            setCascadeStage(3);
          }}
        />

        {/* Manual Adjustment Section: Segmented controls + Material Switch */}
        <div className="manual-controls-panel">
          <p className="manual-controls-title">手動で調整（付与スコープと Deny ポリシー）</p>

          <div className="manual-controls-grid">
            <div className="scope-control">
              <span className="scope-control-label">Storage Viewer:</span>
              <div className="segmented" role="group" aria-label="Storage Viewer の付与先">
                {(['none', 'project', 'resource'] as AttachScope[]).map((sc) => (
                  <button
                    key={`gcs-${sc}`}
                    type="button"
                    className="seg-btn"
                    aria-pressed={gcsScope === sc}
                    onClick={() => {
                      setGcsScope(sc);
                      runCascade();
                    }}
                  >
                    {sc === 'none' ? 'なし' : sc === 'project' ? 'プロジェクト' : '単体'}
                  </button>
                ))}
              </div>
            </div>

            <div className="scope-control">
              <span className="scope-control-label">Secret Accessor:</span>
              <div className="segmented" role="group" aria-label="Secret Accessor の付与先">
                {(['none', 'project', 'resource'] as AttachScope[]).map((sc) => (
                  <button
                    key={`sec-${sc}`}
                    type="button"
                    className="seg-btn"
                    aria-pressed={secretScope === sc}
                    onClick={() => {
                      setSecretScope(sc);
                      runCascade();
                    }}
                  >
                    {sc === 'none' ? 'なし' : sc === 'project' ? 'プロジェクト' : '単体'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={denySensitive}
              className="material-switch"
              onClick={() => {
                setDenySensitive((prev) => !prev);
                runCascade();
              }}
            >
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
              <span>IAM Deny（機密2件を遮断）</span>
            </button>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="metric-strip">
          <div className="metric-box">
            <span className="metric-label">必要リソース到達</span>
            <span className={`metric-val ${intendedReadyCount === 2 ? 'allow' : 'warn'}`}>
              {intendedReadyCount} / 2 読取可
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">機密露出（影響範囲）</span>
            <span className={`metric-val ${blastRadiusCount === 0 ? 'allow' : 'deny'}`}>
              {blastRadiusCount} / 2 {blastRadiusCount === 0 ? '安全' : '露出リスク'}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">最小権限の評価</span>
            <span
              className={`metric-val ${
                intendedReadyCount === 2 && blastRadiusCount === 0 && !denySensitive ? 'allow' : 'info'
              }`}
            >
              {intendedReadyCount === 2 && blastRadiusCount === 0
                ? denySensitive
                  ? '保護済（Deny併用）'
                  : '最適（最小スコープ）'
                : '見直しが必要'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
