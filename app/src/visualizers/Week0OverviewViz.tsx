import { useEffect, useState } from 'react';
import { ArrowRight, Check, Compass, Map } from 'lucide-react';
import type { LessonId, StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type LayerId = 'iam' | 'network' | 'compute' | 'data' | 'ops' | 'ai';
type ViewMode = 'map' | 'roadmap';

interface GcpLayer {
  id: LayerId;
  order: number;
  label: string;
  shortLabel: string;
  color: string;
  softBg: string;
  dotTone: 'info' | 'allow' | 'warn' | 'deny';
  services: string[];
  examWeight: string;
  targetWeeks: string;
  oneLiner: string;
  pcaFocus: string;
  jumpLessonId?: LessonId;
  sampleJson: Record<string, unknown>;
}

const LAYERS: GcpLayer[] = [
  {
    id: 'iam',
    order: 1,
    label: 'リソース階層・IAM・セキュリティ',
    shortLabel: 'IAM・階層',
    color: '#4338ca',
    softBg: '#eef2ff',
    dotTone: 'info',
    services: ['組織 / フォルダ / プロジェクト', 'IAM (Allow / Deny)', 'Service Account / WIF', 'Secret Manager', 'Cloud KMS'],
    examWeight: 'セキュリティ・コンプライアンス 17.5%',
    targetWeeks: '第1週・第5週・第12週・第19週',
    oneLiner: '「誰が・どの階層で・どのリソースに何をしてよいか」を貫く土台',
    pcaFocus:
      '最小権限、JSONキー廃止（ADC / WIF）、上位からの Allow 継承と IAM Deny の使い分けが最頻出。第1週で最初に手を動かして腹落ちさせます。',
    jumpLessonId: 'w01-p1',
    sampleJson: {
      layer: 'Identity & Resource Hierarchy',
      hierarchy: 'Organization -> Folder -> Project -> Resource',
      keyPrinciples: ['最小権限', '短命トークン (ADC / WIF)', 'Allow の和集合継承'],
      firstStop: 'Week 01 (Part 1〜3)',
    },
  },
  {
    id: 'network',
    order: 2,
    label: 'ネットワーク・入口と境界',
    shortLabel: 'ネットワーク',
    color: '#0891b2',
    softBg: '#ecfeff',
    dotTone: 'info',
    services: ['VPC / サブネット', 'Cloud Load Balancing', 'Cloud DNS / Cloud CDN', 'Cloud NAT', 'VPN / Interconnect / PSC'],
    examWeight: '設計・プロビジョニング横断（約20%）',
    targetWeeks: '第5週〜第6週・第19週',
    oneLiner: 'グローバル VPC と負荷分散・ハイブリッド接続で通信経路を制御する',
    pcaFocus:
      'GCP の VPC はグローバルリソース（サブネットがリージョン単位）。公開入口（LB + CDN）と非公開接続（Shared VPC / Private Service Connect / Interconnect）の選定理由が問われます。',
    sampleJson: {
      layer: 'Networking & Hybrid Connectivity',
      vpcScope: 'Global (Subnets are Regional)',
      hybridOptions: ['HA VPN (暗号化・手軽)', 'Dedicated/Partner Interconnect (高帯域・SLA)'],
      plannedWeeks: 'Week 05 - 06',
    },
  },
  {
    id: 'compute',
    order: 3,
    label: '実行基盤（コンピュート）',
    shortLabel: '実行基盤',
    color: '#0b57d0',
    softBg: '#e8f0fe',
    dotTone: 'info',
    services: ['Cloud Run（コンテナ・ゼロスケール）', 'GKE（Kubernetes）', 'Compute Engine（VM）', 'Artifact Registry'],
    examWeight: 'アーキテクチャ設計 25% の中核',
    targetWeeks: '第1週〜第2週・第7週',
    oneLiner: 'アプリを「サーバーレス / コンテナ基盤 / VM」のどれで動かすか選ぶ',
    pcaFocus:
      '迷ったら運用負荷が最小の Cloud Run から検討し、複雑なオーケストレーションやステートフル要件なら GKE、OS/ライセンス制御やレガシー移行なら GCE を選ぶ判断軸を身につけます。',
    jumpLessonId: 'w01-p1',
    sampleJson: {
      layer: 'Compute Selection',
      decisionLadder: [
        'Cloud Run: HTTP/イベント駆動・最小運用・0スケール',
        'GKE: マイクロサービス群・細かな制御・標準K8s',
        'Compute Engine: レガシー・特殊OS/GPU・Lift & Shift',
      ],
      plannedWeeks: 'Week 01 - 02, Week 07',
    },
  },
  {
    id: 'data',
    order: 4,
    label: 'データ保存・分析基盤',
    shortLabel: 'データ・分析',
    color: '#137333',
    softBg: '#e6f4ea',
    dotTone: 'allow',
    services: ['Cloud Storage (オブジェクト)', 'Firestore (NoSQL)', 'Cloud SQL / Spanner (RDB)', 'Bigtable', 'BigQuery / Pub/Sub / Dataflow'],
    examWeight: '設計・最適化の頻出領域',
    targetWeeks: '第3週・第8週〜第9週',
    oneLiner: 'アクセスパターン・一貫性・規模・分析用途から最適な保管先を選ぶ',
    pcaFocus:
      '「ファイルは GCS」「リージョン RDB は Cloud SQL」「グローバル強整合 RDB は Spanner」「大量時系列/IoT は Bigtable」「分析 DWH は BigQuery」という選択と棄却理由を整理します。',
    sampleJson: {
      layer: 'Storage, Database & Analytics',
      selectionMap: {
        blobsAndSnapshots: 'Cloud Storage',
        regionalSQL: 'Cloud SQL',
        globalStrongSQL: 'Cloud Spanner',
        highThroughputKV: 'Bigtable',
        analyticsDWH: 'BigQuery',
      },
      plannedWeeks: 'Week 03, Week 08 - 09',
    },
  },
  {
    id: 'ops',
    order: 5,
    label: '運用・CI/CD・コスト統制（FinOps）',
    shortLabel: '運用・FinOps',
    color: '#b06000',
    softBg: '#fef7e0',
    dotTone: 'warn',
    services: ['Terraform (IaC)', 'Cloud Build', 'Cloud Logging / Monitoring', 'Cloud Billing 予算 / クォータ', 'DR (RTO / RPO)'],
    examWeight: '実装管理 12.5% ＋ 運用改善 12.5%',
    targetWeeks: '第1週・第4週・第11週〜第15週',
    oneLiner: '変更を安全に届け、異常を観測し、障害復旧と費用暴走を防ぐ仕組み',
    pcaFocus:
      '予算通知（非同期・停止しない）とクォータ（同期制御）の区別、段階リリースと切り戻し基準、RTO/RPO に基づくバックアップ・DR 設計を押さえます。',
    jumpLessonId: 'w01-p4',
    sampleJson: {
      layer: 'Operations, IaC, SRE & FinOps',
      pillars: ['Terraform による再現性', 'SLO/ログ/メトリクス観測', 'Budget(通知) vs Quota(同期制御)', 'RTO/RPO と復旧試験'],
      firstStop: 'Week 01 (Part 4), Week 04, Week 11-14',
    },
  },
  {
    id: 'ai',
    order: 6,
    label: 'AI / Agent 基盤（PCA → PAA の橋渡し）',
    shortLabel: 'AI / Agent',
    color: '#7c3aed',
    softBg: '#f5f3ff',
    dotTone: 'info',
    services: ['Vertex AI / Gemini', 'Gemini Enterprise Agent Platform', 'ADK (Agent Development Kit)', '評価・ガバナンス'],
    examWeight: 'PCA 第16週 ＋ 後半半年 PAA へ接続',
    targetWeeks: '第16週〜第24週 → 7〜12か月目',
    oneLiner: '既製検索・生成 AI API と自作エージェント基盤を要件で選び運用する',
    pcaFocus:
      '前半の PCA 学習で作る架空 RAG アプリの土台（Cloud Run + GCS + IAM + 監視）を、そのまま第16週以降の AI 設計と後半半年の PAA 学習へ再利用します。',
    sampleJson: {
      layer: 'AI & Agentic Architecture',
      progression: 'Weeks 1-15 (Cloud Foundation) -> Week 16 (AI Ops) -> Weeks 17-24 (PCA Cases) -> PAA',
      reuseAsset: '架空マニュアル RAG アプリ',
    },
  },
];

const STAGES = [
  {
    num: '第1段階',
    weeks: '第1〜4週',
    title: '使っている仕組みを自分で説明する',
    goal: 'リクエスト1件の入口・権限・保存先・失敗時のログを手元メモなしで説明できる',
    items: [
      { wk: 'W01', title: 'IAM・Cloud Run・認証・予算通知', active: true, jumpId: 'w01-p1' as LessonId },
      { wk: 'W02', title: 'Cloud Run リビジョン・切り戻し・Artifact Registry', active: false },
      { wk: 'W03', title: 'Cloud Storage・Firestore・Cloud Tasks 再試行', active: false },
      { wk: 'W04', title: 'Cloud Build・Logging・Monitoring・リリース検証', active: false },
    ],
  },
  {
    num: '第2段階',
    weeks: '第5〜10週',
    title: '同じ要件に対する構成を比較する',
    goal: 'サービス名だけでなく、要件から選択肢を絞り採用案の不利な点も説明できる',
    items: [
      { wk: 'W05-06', title: 'VPC・Firewall・Cloud LB・DNS・VPN / Interconnect / PSC', active: false },
      { wk: 'W07-08', title: '実行基盤比較（Run/GKE/GCE）＆ DB比較（SQL/Spanner/Bigtable）', active: false },
      { wk: 'W09-10', title: 'BigQuery 最適化・Well-Architected 2案比較', active: false },
    ],
  },
  {
    num: '第3段階',
    weeks: '第11〜16週',
    title: '実装・統制・障害対応を設計する',
    goal: '変更前後の観測、切り戻し基準、RTO/RPO、移行境界を説明できる',
    items: [
      { wk: 'W11-12', title: 'Terraform IaC・鍵管理・監査・組織ポリシー', active: false },
      { wk: 'W13-15', title: 'CI/CD 段階リリース・DR 設計・段階移行', active: false },
      { wk: 'W16', title: 'AI サービス選定・Gemini Agent Platform 運用', active: false },
    ],
  },
  {
    num: '第4段階',
    weeks: '第17〜24週',
    title: '公式ケース 4 件と通し演習で穴を閉じる',
    goal: 'Altostrat / Cymbal / EHR / KnightMotives を制約から設計し時間内に解答できる',
    items: [
      { wk: 'W17-20', title: '公式 4 ケーススタディ徹底分析（出題の 20〜30%）', active: false },
      { wk: 'W21-24', title: '横断演習・弱点補強・口頭説明・受験判断 → PAA へ', active: false },
    ],
  },
];

interface Week0Props {
  onStepInsightChange: (insight: StepInsight) => void;
  onJumpToLesson: (id: LessonId) => void;
}

export function Week0OverviewViz({ onStepInsightChange, onJumpToLesson }: Week0Props) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeLayer = LAYERS[activeIdx];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => {
        if (prev >= LAYERS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    onStepInsightChange({
      stepNumber: activeLayer.order,
      totalSteps: LAYERS.length,
      badge: `GCP 全体マップ・${activeLayer.shortLabel}`,
      title: activeLayer.label,
      subtitle: activeLayer.oneLiner,
      explanation: activeLayer.pcaFocus,
      kvPairs: [
        { label: '試験比重の目安', value: activeLayer.examWeight, tone: 'info' },
        { label: '主な学習週', value: activeLayer.targetWeeks },
        { label: '主要サービス', value: activeLayer.services.join(' / ') },
      ],
      payloadTitle: 'このレイヤーの整理メモ',
      payloadJson: JSON.stringify(activeLayer.sampleJson, null, 2),
    });
  }, [activeLayer, onStepInsightChange]);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="segmented" role="group" aria-label="全体像の表示切替">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              <Map size={14} aria-hidden="true" />
              GCP 全体マップ
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'roadmap'}
              onClick={() => setViewMode('roadmap')}
            >
              <Compass size={14} aria-hidden="true" />
              24週インデックス
            </button>
          </div>

          {viewMode === 'map' && (
            <div className="toolbar-group">
              <span className="toolbar-label">領域:</span>
              <div className="scenario-bar" role="group" aria-label="GCP レイヤー選択">
                {LAYERS.map((layer, idx) => {
                  const selected = idx === activeIdx;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      className="scenario-pill"
                      aria-pressed={selected}
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveIdx(idx);
                      }}
                    >
                      {selected ? (
                        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <span className="chip-dot" style={{ background: layer.color }} aria-hidden="true" />
                      )}
                      {layer.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {viewMode === 'map' ? (
          <>
            <div className="blueprint-stage">
              {isMobile ? (
                /* 1:1 PORTRAIT MOBILE GCP ARCHITECTURE OVERVIEW (380px viewBox) */
                <svg className="blueprint-svg" viewBox="0 0 380 612" role="img" aria-label="Google Cloud 全体アーキテクチャマップ（モバイル）">
                  <title>Google Cloud 全体構成マップ（6領域）</title>

                  {/* Top Foundation Band: IAM & Hierarchy */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(0)}>
                    <rect
                      x="12"
                      y="10"
                      width="356"
                      height="82"
                      rx="12"
                      fill={activeLayer.id === 'iam' ? '#eef2ff' : '#ffffff'}
                      stroke={activeLayer.id === 'iam' ? '#4338ca' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'iam' ? 2.4 : 1.4}
                    />
                    <text x="26" y="34" fontSize="13.5" fontWeight="700" fill="#4338ca">1. 土台：リソース階層・IAM・セキュリティ</text>
                    <text x="26" y="56" fontSize="13" fill="#1f1f1f">組織 → フォルダ → プロジェクト</text>
                    <text x="26" y="77" fontSize="12.5" fill="#5f6368">IAM / サービスID / WIF / Secret Manager</text>
                  </g>

                  {/* Flow Arrow down */}
                  <line x1="190" y1="92" x2="190" y2="112" stroke="#94a3b8" strokeWidth="1.8" />

                  {/* Layer 2: Network */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(1)}>
                    <rect
                      x="12"
                      y="112"
                      width="356"
                      height="76"
                      rx="12"
                      fill={activeLayer.id === 'network' ? '#ecfeff' : '#ffffff'}
                      stroke={activeLayer.id === 'network' ? '#0891b2' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'network' ? 2.4 : 1.4}
                    />
                    <text x="26" y="136" fontSize="13.5" fontWeight="700" fill="#0891b2">2. 入口・境界：ネットワーク</text>
                    <text x="26" y="159" fontSize="13" fill="#1f1f1f">グローバル VPC / Cloud LB / Cloud DNS</text>
                    <text x="26" y="178" fontSize="12.5" fill="#5f6368">VPN・Interconnect・Private Service Connect</text>
                  </g>

                  <line x1="190" y1="188" x2="190" y2="208" stroke="#94a3b8" strokeWidth="1.8" />

                  {/* Layer 3: Compute */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(2)}>
                    <rect
                      x="12"
                      y="208"
                      width="356"
                      height="82"
                      rx="12"
                      fill={activeLayer.id === 'compute' ? '#e8f0fe' : '#ffffff'}
                      stroke={activeLayer.id === 'compute' ? '#0b57d0' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'compute' ? 2.4 : 1.4}
                    />
                    <text x="26" y="232" fontSize="13.5" fontWeight="700" fill="#0b57d0">3. 実行基盤（コンピュート）</text>
                    <text x="26" y="255" fontSize="13.5" fontWeight="650" fill="#1f1f1f">Cloud Run · GKE · Compute Engine</text>
                    <text x="26" y="276" fontSize="12.5" fill="#5f6368">最小運用 → K8s制御 → VM制御の判断軸</text>
                  </g>

                  <line x1="190" y1="290" x2="190" y2="310" stroke="#94a3b8" strokeWidth="1.8" />

                  {/* Layer 4: Data & Analytics */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(3)}>
                    <rect
                      x="12"
                      y="310"
                      width="356"
                      height="82"
                      rx="12"
                      fill={activeLayer.id === 'data' ? '#e6f4ea' : '#ffffff'}
                      stroke={activeLayer.id === 'data' ? '#137333' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'data' ? 2.4 : 1.4}
                    />
                    <text x="26" y="334" fontSize="13.5" fontWeight="700" fill="#137333">4. データ保存・分析基盤</text>
                    <text x="26" y="357" fontSize="13" fontWeight="650" fill="#1f1f1f">Cloud Storage · Firestore · SQL / Spanner</text>
                    <text x="26" y="378" fontSize="12.5" fill="#5f6368">Bigtable · BigQuery · Pub/Sub · Dataflow</text>
                  </g>

                  <line x1="190" y1="392" x2="190" y2="412" stroke="#94a3b8" strokeWidth="1.8" />

                  {/* Layer 5: Ops & FinOps */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(4)}>
                    <rect
                      x="12"
                      y="412"
                      width="356"
                      height="82"
                      rx="12"
                      fill={activeLayer.id === 'ops' ? '#fef7e0' : '#ffffff'}
                      stroke={activeLayer.id === 'ops' ? '#b06000' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'ops' ? 2.4 : 1.4}
                    />
                    <text x="26" y="436" fontSize="13.5" fontWeight="700" fill="#b06000">5. 運用・CI/CD・コスト統制（FinOps）</text>
                    <text x="26" y="459" fontSize="13" fill="#1f1f1f">Terraform · Cloud Build · Logging / Monitoring</text>
                    <text x="26" y="480" fontSize="12.5" fill="#5f6368">予算通知 vs クォータ · DR（RTO / RPO）</text>
                  </g>

                  {/* Layer 6: AI / Agent */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(5)}>
                    <rect
                      x="12"
                      y="510"
                      width="356"
                      height="88"
                      rx="12"
                      fill={activeLayer.id === 'ai' ? '#f5f3ff' : '#ffffff'}
                      stroke={activeLayer.id === 'ai' ? '#7c3aed' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'ai' ? 2.4 : 1.4}
                    />
                    <text x="26" y="534" fontSize="13.5" fontWeight="700" fill="#7c3aed">6. AI / Agent 基盤（PCA → PAA）</text>
                    <text x="26" y="558" fontSize="13" fill="#1f1f1f">Vertex AI · Gemini · ADK · 評価と監視</text>
                    <text x="26" y="580" fontSize="12.5" fill="#5f6368">第1〜15週の土台を再利用して第16週〜PAAへ</text>
                  </g>
                </svg>
              ) : (
                /* DESKTOP GCP ARCHITECTURE MAP (820x424, crisp >= 13.5px fonts) */
                <svg className="blueprint-svg" viewBox="0 0 820 426" role="img" aria-label="Google Cloud 全体アーキテクチャマップ">
                  <title>Google Cloud 全体構成マップ（6領域）</title>
                  <defs>
                    <marker id="w0-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#94a3b8" />
                    </marker>
                  </defs>

                  {/* Top Cross-Cutting Foundation: IAM & Hierarchy */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(0)}>
                    <rect
                      x="18"
                      y="14"
                      width="784"
                      height="76"
                      rx="13"
                      fill={activeLayer.id === 'iam' ? '#eef2ff' : '#ffffff'}
                      stroke={activeLayer.id === 'iam' ? '#4338ca' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'iam' ? 2.4 : 1.4}
                    />
                    <text x="36" y="42" fontSize="15" fontWeight="700" fill="#4338ca">
                      1. 共通の土台：リソース階層・IAM・セキュリティ（第1週から実践）
                    </text>
                    <text x="36" y="70" fontSize="13.5" fill="#444746">
                      組織 → フォルダ → プロジェクト → リソース ｜ IAM Allow/Deny ・ サービスID / ADC / WIF ・ Secret Manager ・ Cloud KMS
                    </text>
                  </g>

                  {/* Main Request Flow Row: Network -> Compute -> Data */}
                  {/* Layer 2: Network */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(1)}>
                    <rect
                      x="18"
                      y="114"
                      width="226"
                      height="176"
                      rx="13"
                      fill={activeLayer.id === 'network' ? '#ecfeff' : '#ffffff'}
                      stroke={activeLayer.id === 'network' ? '#0891b2' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'network' ? 2.4 : 1.4}
                    />
                    <text x="34" y="142" fontSize="15" fontWeight="700" fill="#0891b2">2. 入口・ネットワーク</text>
                    <text x="34" y="168" fontSize="13.5" fontWeight="650" fill="#1f1f1f">グローバル VPC</text>
                    <text x="34" y="192" fontSize="13" fill="#444746">・Cloud Load Balancing</text>
                    <text x="34" y="214" fontSize="13" fill="#444746">・Cloud DNS / CDN</text>
                    <text x="34" y="236" fontSize="13" fill="#444746">・Firewall / Cloud NAT</text>
                    <text x="34" y="258" fontSize="13" fill="#444746">・VPN / Interconnect / PSC</text>
                    <text x="34" y="279" fontSize="12" fontWeight="650" fill="#0891b2">第5〜6週</text>
                  </g>

                  <line x1="244" y1="202" x2="278" y2="202" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#w0-arr)" />

                  {/* Layer 3: Compute */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(2)}>
                    <rect
                      x="284"
                      y="114"
                      width="232"
                      height="176"
                      rx="13"
                      fill={activeLayer.id === 'compute' ? '#e8f0fe' : '#ffffff'}
                      stroke={activeLayer.id === 'compute' ? '#0b57d0' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'compute' ? 2.4 : 1.4}
                    />
                    <text x="300" y="142" fontSize="15" fontWeight="700" fill="#0b57d0">3. 実行基盤</text>
                    <text x="300" y="168" fontSize="13.5" fontWeight="650" fill="#1f1f1f">アプリを動かす場所</text>
                    <text x="300" y="194" fontSize="13" fill="#444746">・Cloud Run（最小運用）</text>
                    <text x="300" y="218" fontSize="13" fill="#444746">・GKE（Kubernetes制御）</text>
                    <text x="300" y="242" fontSize="13" fill="#444746">・Compute Engine（VM）</text>
                    <text x="300" y="279" fontSize="12" fontWeight="650" fill="#0b57d0">第1〜2週・第7週</text>
                  </g>

                  <line x1="516" y1="202" x2="550" y2="202" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#w0-arr)" />

                  {/* Layer 4: Data & Analytics */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(3)}>
                    <rect
                      x="556"
                      y="114"
                      width="246"
                      height="176"
                      rx="13"
                      fill={activeLayer.id === 'data' ? '#e6f4ea' : '#ffffff'}
                      stroke={activeLayer.id === 'data' ? '#137333' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'data' ? 2.4 : 1.4}
                    />
                    <text x="572" y="142" fontSize="15" fontWeight="700" fill="#137333">4. データ保存・分析</text>
                    <text x="572" y="168" fontSize="13.5" fontWeight="650" fill="#1f1f1f">用途別の最適ストア選定</text>
                    <text x="572" y="192" fontSize="13" fill="#444746">・Cloud Storage / Firestore</text>
                    <text x="572" y="214" fontSize="13" fill="#444746">・Cloud SQL / Spanner</text>
                    <text x="572" y="236" fontSize="13" fill="#444746">・Bigtable / BigQuery</text>
                    <text x="572" y="258" fontSize="13" fill="#444746">・Pub/Sub / Dataflow / Tasks</text>
                    <text x="572" y="279" fontSize="12" fontWeight="650" fill="#137333">第3週・第8〜9週</text>
                  </g>

                  {/* Bottom Row: Ops & FinOps + AI / Agent */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(4)}>
                    <rect
                      x="18"
                      y="314"
                      width="454"
                      height="98"
                      rx="13"
                      fill={activeLayer.id === 'ops' ? '#fef7e0' : '#ffffff'}
                      stroke={activeLayer.id === 'ops' ? '#b06000' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'ops' ? 2.4 : 1.4}
                    />
                    <text x="36" y="342" fontSize="15" fontWeight="700" fill="#b06000">
                      5. 運用・CI/CD・コスト統制（SRE / FinOps）
                    </text>
                    <text x="36" y="368" fontSize="13" fill="#444746">
                      Terraform ・ Cloud Build ・ Logging / Monitoring ・ 予算通知 vs クォータ ・ DR
                    </text>
                    <text x="36" y="394" fontSize="12.5" fontWeight="650" fill="#b06000">
                      第1週(Part 4)・第4週・第11〜15週
                    </text>
                  </g>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveIdx(5)}>
                    <rect
                      x="488"
                      y="314"
                      width="314"
                      height="98"
                      rx="13"
                      fill={activeLayer.id === 'ai' ? '#f5f3ff' : '#ffffff'}
                      stroke={activeLayer.id === 'ai' ? '#7c3aed' : '#cbd5e1'}
                      strokeWidth={activeLayer.id === 'ai' ? 2.4 : 1.4}
                    />
                    <text x="506" y="342" fontSize="15" fontWeight="700" fill="#7c3aed">
                      6. AI / Agent 基盤（→ PAA）
                    </text>
                    <text x="506" y="368" fontSize="13" fill="#444746">
                      Vertex AI ・ Gemini ・ ADK ・ 評価と監視
                    </text>
                    <text x="506" y="394" fontSize="12.5" fontWeight="650" fill="#7c3aed">
                      第16週〜第24週 → 後半半年 PAA
                    </text>
                  </g>
                </svg>
              )}
            </div>

            <PlaybackBar
              isPlaying={isPlaying}
              playLabel="全体ツアー再生"
              pauseLabel="一時停止"
              onTogglePlay={() => {
                if (!isPlaying && activeIdx >= LAYERS.length - 1) setActiveIdx(0);
                setIsPlaying((p) => !p);
              }}
              onPrev={() => {
                setIsPlaying(false);
                setActiveIdx((i) => Math.max(0, i - 1));
              }}
              prevDisabled={activeIdx === 0}
              onNext={() => {
                setIsPlaying(false);
                setActiveIdx((i) => (i + 1) % LAYERS.length);
              }}
              nextLabel="次の領域"
              onReset={() => {
                setIsPlaying(false);
                setActiveIdx(0);
              }}
            />

            {/* Quick Launch Bar into Week 1 */}
            <div className="index-launch-bar">
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  第1週ストーリー：社内マニュアル回答アプリを安全に動かす
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                  第1話 権限境界 → 第2話 鍵なし認証 → 第3話 秘密情報の最小スコープ → 第4話 課金暴走防止
                </span>
              </div>
              <button
                type="button"
                className="btn-play"
                onClick={() => onJumpToLesson(activeLayer.jumpLessonId ?? 'w01-p1')}
              >
                第1話から始める
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          /* 24-WEEK ROADMAP INDEX VIEW */
          <div className="roadmap-index-view">
            <div className="roadmap-stage-grid">
              {STAGES.map((stage) => (
                <section key={stage.num} className="roadmap-stage-card">
                  <div className="roadmap-stage-head">
                    <span className="status-chip info">{stage.num}</span>
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                      {stage.weeks}
                    </span>
                  </div>
                  <h3 className="roadmap-stage-title">{stage.title}</h3>
                  <p className="roadmap-stage-goal">到達基準：{stage.goal}</p>

                  <ul className="roadmap-stage-items" role="list">
                    {stage.items.map((item) => (
                      <li key={item.wk} className="roadmap-stage-item">
                        <span className="mono roadmap-item-wk">{item.wk}</span>
                        <span className="roadmap-item-label">{item.title}</span>
                        {item.active && item.jumpId ? (
                          <button
                            type="button"
                            className="btn-ghost-pill"
                            onClick={() => onJumpToLesson(item.jumpId!)}
                          >
                            学習中
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="status-chip neutral">準備中</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
