import { useEffect, useState } from 'react';
import { ArrowRight, BookMarked } from 'lucide-react';
import type { LessonId, StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

type OverviewNodeId = 'ar' | 'service' | 'traffic' | 'revisions' | 'scaling' | 'job';

interface OverviewNodeInfo {
  id: OverviewNodeId;
  order: number;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  jumpLessonId: LessonId;
  jumpLabel: string;
  kvPairs: { label: string; value: string; tone?: 'neutral' | 'allow' | 'deny' | 'warn' | 'info' }[];
  payloadTitle: string;
  sampleJson: Record<string, unknown>;
}

const OVERVIEW_NODES: Record<OverviewNodeId, OverviewNodeInfo> = {
  ar: {
    id: 'ar',
    order: 1,
    badge: 'Part 4・コンテナ倉庫',
    title: 'Artifact Registry（完成品の倉庫）',
    subtitle: 'ビルド済みコンテナイメージをリージョン単位で保管し、固有指紋（@sha256）で固定する',
    explanation:
      'ソースコードをビルドした完成品（コンテナイメージ）を保管する公式レジストリです。上書き可能なタグ（`:latest`）ではなく不変のダイジェスト（`@sha256:...`）で中身を固定するため、昨日とまったく同じバイナリを確実に再現・切り戻しできます。',
    jumpLessonId: 'w02-p4',
    jumpLabel: 'Part 4：Artifact Registry を詳しく見る',
    kvPairs: [
      { label: '主な役割', value: 'イメージ保管・リポジトリ単位 IAM・脆弱性スキャン', tone: 'info' },
      { label: '推奨配置', value: 'Cloud Run と同じリージョン（asia-northeast1）' },
      { label: '本番の鉄則', value: '`:latest` 禁止・`@sha256:...` ダイジェスト固定', tone: 'allow' },
    ],
    payloadTitle: 'イメージ参照の例（タグ vs ダイジェスト）',
    sampleJson: {
      repository: 'asia-northeast1-docker.pkg.dev/gcp-study-sandbox/manual-repo',
      mutableTag: 'week01-manual-api:v2',
      immutableDigest: 'week01-manual-api@sha256:8f41c9b2e0a1...（不変の固有指紋）',
    },
  },
  service: {
    id: 'service',
    order: 2,
    badge: 'Part 1・HTTP 常駐型',
    title: 'Cloud Run サービス（HTTP 受付）',
    subtitle: 'HTTPS エンドポイントを持ち、リクエストに応答し続ける Web API / Web アプリ向け基盤',
    explanation:
      '社内マニュアル API（`week01-manual-api`）のように HTTP リクエストを受け取ってレスポンスを返す用途に使います。入口で `roles/run.invoker` と ID トークンを検証し、通過したリクエストだけを裏側のリビジョンへ渡します。',
    jumpLessonId: 'w02-p1',
    jumpLabel: 'Part 1：サービス vs ジョブを詳しく見る',
    kvPairs: [
      { label: '起動契機', value: 'HTTP リクエスト（ブラウザ / API / Pub/Sub Push 等）', tone: 'info' },
      { label: 'コンテナ契約', value: '`$PORT`（例：8080）で待ち受けて HTTP 応答を返す' },
      { label: '得意分野', value: 'Web API・Webhook・マイクロサービス', tone: 'allow' },
    ],
    payloadTitle: 'Cloud Run サービスの入口構成',
    sampleJson: {
      service: 'week01-manual-api',
      region: 'asia-northeast1',
      auth: '--no-allow-unauthenticated (roles/run.invoker 必須)',
      endpoint: 'https://week01-manual-api-xxxxx-an.a.run.app',
    },
  },
  traffic: {
    id: 'traffic',
    order: 3,
    badge: 'Part 2・段階リリース',
    title: 'トラフィック振分 ＆ タグ URL',
    subtitle: '本番 URL へのアクセスを v1 / v2 へ割合分割し、異常時は数秒で v1=100% へ戻す',
    explanation:
      '新しいリビジョンをいきなり 100% 公開せず、`--no-traffic --tag v2` で 0% のまま専用タグ URL で事前検証できます。その後 10% → 50% → 100% と段階切替し、エラーが出たら再ビルドなしでルーティングだけ即座に旧版へ戻せます。',
    jumpLessonId: 'w02-p2',
    jumpLabel: 'Part 2：段階切替＆ロールバックを体験する',
    kvPairs: [
      { label: '0% 事前検証', value: '専用タグ URL（`https://v2---...`）で単体確認', tone: 'info' },
      { label: 'カナリア配信', value: '例：v1 90% / v2 10% でエラー率を観測', tone: 'warn' },
      { label: '即時ロールバック', value: '再ビルド不要・ルーティング変更だけで数秒復旧', tone: 'allow' },
    ],
    payloadTitle: 'トラフィック配分の状態例',
    sampleJson: {
      service: 'week01-manual-api',
      traffic: [
        { revision: 'week01-manual-api-00001-v1', percent: 90 },
        { revision: 'week01-manual-api-00002-v2', percent: 10, tag: 'v2' },
      ],
    },
  },
  revisions: {
    id: 'revisions',
    order: 4,
    badge: 'Part 2・不変の版',
    title: 'リビジョン（v1 / v2：不変スナップショット）',
    subtitle: 'イメージ・環境変数・実行時 SA・スケール設定を 1 時点に凍結した「版」',
    explanation:
      'デプロイや設定変更のたびに新しいリビジョンが 1 つ生まれます。一度できたリビジョンは後から中身が書き換わらない（Immutable）ため、安定版 v1 をそのまま残して安全に切り戻せます。',
    jumpLessonId: 'w02-p2',
    jumpLabel: 'Part 2：リビジョンの仕組みを見る',
    kvPairs: [
      { label: '性質', value: '不変（Immutable）— 変更時は新版を新規作成', tone: 'allow' },
      { label: '公開条件', value: 'Startup Probe 通過（Ready）後にのみ通信を受け取る' },
      { label: '凍結される中身', value: 'イメージダイジェスト / 環境変数 / 実行時 SA / スケール設定' },
    ],
    payloadTitle: 'リビジョンが固定保持する設定',
    sampleJson: {
      revision: 'week01-manual-api-00002-v2',
      immutable: true,
      ready: true,
      imageDigest: 'sha256:8f41c9b2e0a1...',
      serviceAccount: 'manual-api-sa@gcp-study-sandbox.iam.gserviceaccount.com',
    },
  },
  scaling: {
    id: 'scaling',
    order: 5,
    badge: 'Part 3・自動伸縮',
    title: 'インスタンス自動スケール ＆ コールドスタート',
    subtitle: '同時リクエスト ÷ 同時実行数で稼働台数が増減。0 台からの初回起動がコールドスタート',
    explanation:
      'リビジョン（版）を実際に何台動かすかが「インスタンス」です。アクセスゼロなら 0 台に縮んで課金ゼロになりますが、0 台からの初回リクエストは起動待ち（コールドスタート）が発生します。`min-instances` と `max-instances` で遅延とコストのバランスを取ります。',
    jumpLessonId: 'w02-p3',
    jumpLabel: 'Part 3：スケール＆コールドスタートを調整する',
    kvPairs: [
      { label: '台数の決まり方', value: 'ceil(同時リクエスト数 ÷ concurrency)', tone: 'info' },
      { label: '初回遅延対策', value: '軽量化・起動時 CPU ブースト・`min-instances >= 1`', tone: 'warn' },
      { label: '暴走防止の上限', value: '`max-instances`（同期制御・超過時は 429）', tone: 'allow' },
    ],
    payloadTitle: 'スケール設定の代表例',
    sampleJson: {
      concurrency: 80,
      minInstances: 1,
      maxInstances: 5,
      tradeoff: 'min=1 で初回遅延を解消する代わりにアイドル待機料金が発生',
    },
  },
  job: {
    id: 'job',
    order: 6,
    badge: 'Part 1・バッチ完結型',
    title: 'Cloud Run ジョブ（やり切りバッチ）',
    subtitle: 'HTTP ポートを持たず、複数タスク並列で処理を終えたら exit 0 で終了する',
    explanation:
      '毎晩の PDF 索引作成や DB マイグレーションなど、HTTP 応答が不要で時間が掛かる処理はジョブとして切り出します。1 回の実行（Execution）で複数タスク（Task 0..N）を並列実行し、完了したら即座に課金が止まります。',
    jumpLessonId: 'w02-p1',
    jumpLabel: 'Part 1：サービス vs ジョブを詳しく見る',
    kvPairs: [
      { label: '起動契機', value: 'Cloud Scheduler / Workflows / 手動 execute', tone: 'info' },
      { label: 'コンテナ契約', value: 'HTTP 待ち受け不要。処理完了で `exit 0` 終了' },
      { label: '並列と再試行', value: '複数タスク分割並列＋失敗タスク単位の自動リトライ', tone: 'allow' },
    ],
    payloadTitle: 'Cloud Run ジョブ実行の構成例',
    sampleJson: {
      job: 'manual-index-nightly-job',
      trigger: 'Cloud Scheduler (毎日 02:00)',
      tasks: 10,
      parallelism: 5,
      timeoutPerTask: '30m (最大 24h)',
    },
  },
};

const PREREQ_WORDS = [
  {
    termId: 'container',
    word: 'コンテナイメージ',
    sub: 'Container Image',
    meaning: 'アプリ本体と必要なライブラリ・OS 部品をひとまとめに梱包した「完成品の箱」。',
    analogy: '道具が一式入った引っ越しコンテナ。どの環境でも同じように動く。',
  },
  {
    termId: 'artifact-registry',
    word: 'Artifact Registry',
    sub: 'コンテナ保管倉庫',
    meaning: 'ビルド済みコンテナイメージやパッケージをリージョン単位で安全に保管する GCP の公式倉庫。',
    analogy: '品質検査と入室管理（IAM）が付いた地域別の専用倉庫。',
  },
  {
    termId: 'tag-vs-digest',
    word: 'タグ vs ダイジェスト',
    sub: ':latest vs @sha256:...',
    meaning: 'タグは貼り替え可能な名前、ダイジェストは中身から算出される改ざん不能な固有指紋。',
    analogy: 'タグ＝貼り替えできる付箋、ダイジェスト＝中身そのものの DNA 指紋。',
  },
  {
    termId: 'revision',
    word: 'リビジョン',
    sub: 'Revision（不変の版）',
    meaning: 'イメージ・環境変数・SA・スケール設定を 1 時点に凍結した Cloud Run の版。',
    analogy: '製本済みの「第1版・第2版の本」。直すときは上書きせず新しい版を出す。',
  },
  {
    termId: 'concurrency',
    word: 'インスタンス ＆ 同時実行数',
    sub: 'Instance & Concurrency',
    meaning: 'インスタンスは稼働中のコンテナ台数、同時実行数は 1 台が同時に捌けるリクエスト上限。',
    analogy: 'インスタンス＝出勤中の店員数、同時実行数＝店員 1 人が同時に捌ける注文数。',
  },
  {
    termId: 'cold-start',
    word: 'コールドスタート',
    sub: 'Cold Start',
    meaning: '0 台の休止状態から初回リクエストが来たとき、新規起動のぶん初回応答が遅くなる現象。',
    analogy: '閉めていた店舗のシャッターを開けてレジを立ち上げるまでの待ち時間。',
  },
  {
    termId: 'traffic-split',
    word: 'カナリア ＆ ロールバック',
    sub: 'Canary / Rollback',
    meaning: '新版へ一部（例 10%）だけ流して安全を確認し、異常時は即座に旧版 100% へ戻す手法。',
    analogy: '新メニューをまず一部テーブルで試食し、不評ならすぐ定番メニューへ戻す運用。',
  },
];

interface Part0Props {
  onStepInsightChange: (insight: StepInsight) => void;
  onJumpToLesson: (id: LessonId) => void;
  onOpenGlossary: (termId?: string) => void;
}

export function Week02Part0OverviewViz({
  onStepInsightChange,
  onJumpToLesson,
  onOpenGlossary,
}: Part0Props) {
  const isMobile = useIsMobile();
  const [activeNodeId, setActiveNodeId] = useState<OverviewNodeId>('traffic');
  const activeNode = OVERVIEW_NODES[activeNodeId];

  useEffect(() => {
    onStepInsightChange({
      stepNumber: activeNode.order,
      totalSteps: Object.keys(OVERVIEW_NODES).length,
      badge: activeNode.badge,
      title: activeNode.title,
      subtitle: activeNode.subtitle,
      explanation: activeNode.explanation,
      kvPairs: activeNode.kvPairs,
      payloadTitle: activeNode.payloadTitle,
      payloadJson: JSON.stringify(activeNode.sampleJson, null, 2),
    });
  }, [activeNode, onStepInsightChange]);

  const strokeFor = (id: OverviewNodeId, base: string, active: string) =>
    activeNodeId === id ? active : base;
  const widthFor = (id: OverviewNodeId) => (activeNodeId === id ? 2.5 : 1.35);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <span className="skeleton-hint">
            各ボックスをタップすると右のインスペクタに要点が表示されます
          </span>
          <button
            type="button"
            className="btn-ghost-pill"
            onClick={() => onJumpToLesson(activeNode.jumpLessonId)}
          >
            {activeNode.jumpLabel}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>

        <div className="skeleton-stack">
          <section className="skeleton-section">
            <div className="skeleton-section-head">
              <span className="skeleton-num-badge">図</span>
              <div>
                <h2 className="skeleton-section-title">
                  第2週の全体マップ：倉庫（Artifact Registry）→ Cloud Run（サービス / ジョブ）
                </h2>
                <p className="skeleton-section-sub">
                  「どこに完成品を置き（Part 4）」「HTTP とバッチをどう分け（Part 1）」「どう安全に切り替え（Part 2）」「どう自動伸縮させるか（Part 3）」の 4 関係を一枚で俯瞰します。
                </p>
              </div>
            </div>

            <div className="blueprint-stage skeleton-stage">
              {isMobile ? (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 380 584"
                  role="img"
                  aria-label="第2週の全体マップ（Artifact Registry から Cloud Run サービスとジョブへの骨格図・モバイル）"
                >
                  <title>第2週 全体マップ（モバイル）</title>
                  <defs>
                    <marker id="w2p0-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* Build & Artifact Registry */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('ar')}>
                    <rect
                      x="12"
                      y="10"
                      width="356"
                      height="68"
                      rx="11"
                      fill="#eef2ff"
                      stroke={strokeFor('ar', '#a5b4fc', '#4338ca')}
                      strokeWidth={widthFor('ar')}
                    />
                    <text x="190" y="34" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#312e81">
                      Artifact Registry（Part 4・倉庫）
                    </text>
                    <text x="190" y="54" textAnchor="middle" fontSize="12.5" fill="#4338ca">
                      完成コンテナ箱を @sha256 ダイジェスト固定
                    </text>
                    <text x="190" y="70" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      push: Cloud Build SA / pull: サービスエージェント
                    </text>
                  </g>

                  {/* Branch down to Service and Job */}
                  <path d="M 190 78 L 190 104" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p0-arr-m)" />

                  {/* Service Container */}
                  <rect x="12" y="110" width="356" height="316" rx="12" fill="#f8fafd" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 4" />
                  <text x="26" y="132" fontSize="12.5" fontWeight="700" fill="#0891b2">
                    経路 A：HTTP 待ち受け（Part 1〜3）
                  </text>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('service')}>
                    <rect
                      x="24"
                      y="144"
                      width="332"
                      height="52"
                      rx="10"
                      fill="#ecfeff"
                      stroke={strokeFor('service', '#67e8f9', '#0891b2')}
                      strokeWidth={widthFor('service')}
                    />
                    <text x="190" y="166" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#155e75">
                      Cloud Run サービス（HTTPS 入口）
                    </text>
                    <text x="190" y="185" textAnchor="middle" fontSize="12" fill="#0e7490">
                      入口認証（Invoker）→ 本番 URL / タグ URL
                    </text>
                  </g>

                  <path d="M 190 196 L 190 218" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p0-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('traffic')}>
                    <rect
                      x="24"
                      y="222"
                      width="332"
                      height="50"
                      rx="10"
                      fill="#fef7e0"
                      stroke={strokeFor('traffic', '#f6c366', '#b06000')}
                      strokeWidth={widthFor('traffic')}
                    />
                    <text x="190" y="244" textAnchor="middle" fontSize="14" fontWeight="700" fill="#7a4100">
                      トラフィック段階切替（Part 2）
                    </text>
                    <text x="190" y="262" textAnchor="middle" fontSize="12" fill="#8f4f00">
                      0% 検証 → 10% カナリア → 3 秒ロールバック
                    </text>
                  </g>

                  <path d="M 190 272 L 190 294" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p0-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('revisions')}>
                    <rect
                      x="24"
                      y="298"
                      width="332"
                      height="48"
                      rx="10"
                      fill="#e6f4ea"
                      stroke={strokeFor('revisions', '#81c995', '#137333')}
                      strokeWidth={widthFor('revisions')}
                    />
                    <text x="190" y="320" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                      不変リビジョン（v1 安定版 / v2 新版）
                    </text>
                    <text x="190" y="338" textAnchor="middle" fontSize="12" fill="#1e4620">
                      Startup Probe 通過（Ready）後に公開
                    </text>
                  </g>

                  <path d="M 190 346 L 190 366" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p0-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('scaling')}>
                    <rect
                      x="24"
                      y="370"
                      width="332"
                      height="46"
                      rx="10"
                      fill="#e8f0fe"
                      stroke={strokeFor('scaling', '#8ab4f8', '#0b57d0')}
                      strokeWidth={widthFor('scaling')}
                    />
                    <text x="190" y="391" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#041e49">
                      自動スケール 0〜max 台（Part 3）
                    </text>
                    <text x="190" y="408" textAnchor="middle" fontSize="12" fill="#1a4e9d">
                      Concurrency・コールドスタート・min/max 制御
                    </text>
                  </g>

                  {/* Path B: Cloud Run Job */}
                  <path d="M 38 78 L 38 102 M 190 426 L 190 456" fill="none" stroke="#64748b" strokeWidth="1.4" strokeDasharray="4 3" />
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('job')}>
                    <rect
                      x="12"
                      y="456"
                      width="356"
                      height="112"
                      rx="12"
                      fill="#f5f3ff"
                      stroke={strokeFor('job', '#c4b5fd', '#6d28d9')}
                      strokeWidth={widthFor('job')}
                    />
                    <text x="26" y="479" fontSize="12.5" fontWeight="700" fill="#5b21b6">
                      経路 B：バッチ完結型（Part 1）
                    </text>
                    <text x="190" y="505" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#4c1d95">
                      Cloud Run ジョブ（夜間索引・集計）
                    </text>
                    <text x="190" y="527" textAnchor="middle" fontSize="12.5" fill="#5b21b6">
                      Scheduler / 手動起動 → Task 0..N 並列実行
                    </text>
                    <text x="190" y="549" textAnchor="middle" fontSize="12" fill="#5f6368">
                      HTTP ポート不要・exit 0 で完了して課金終了
                    </text>
                  </g>
                </svg>
              ) : (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 820 406"
                  role="img"
                  aria-label="第2週の全体マップ：Artifact Registry から Cloud Run サービス（トラフィック・リビジョン・スケール）とジョブへの骨格図"
                >
                  <title>第2週 全体マップ</title>
                  <defs>
                    <marker id="w2p0-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* Left: Artifact Registry (Part 4) */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('ar')}>
                    <rect
                      x="18"
                      y="104"
                      width="206"
                      height="196"
                      rx="14"
                      fill="#eef2ff"
                      stroke={strokeFor('ar', '#a5b4fc', '#4338ca')}
                      strokeWidth={widthFor('ar')}
                    />
                    <text x="121" y="132" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#4338ca">
                      Part 4・コンテナ保管倉庫
                    </text>
                    <text x="121" y="160" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e1b4b">
                      Artifact Registry
                    </text>
                    <rect x="34" y="176" width="174" height="48" rx="8" fill="#ffffff" stroke="#c7d2fe" strokeWidth="1" />
                    <text x="121" y="196" textAnchor="middle" fontSize="13" fontWeight="650" fill="#312e81">
                      ダイジェスト固定
                    </text>
                    <text x="121" y="214" textAnchor="middle" fontSize="12" fill="#4338ca">
                      @sha256:...（不変指紋）
                    </text>
                    <text x="121" y="248" textAnchor="middle" fontSize="12.5" fill="#444746">
                      同リージョン配置・脆弱性診断
                    </text>
                    <text x="121" y="268" textAnchor="middle" fontSize="12" fill="#5f6368">
                      push: Cloud Build SA
                    </text>
                    <text x="121" y="286" textAnchor="middle" fontSize="12" fill="#5f6368">
                      pull: サービスエージェント
                    </text>
                  </g>

                  {/* Connector AR -> Service & Job */}
                  <path d="M 224 166 L 264 166 L 264 128 L 284 128" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p0-arr)" />
                  <path d="M 224 236 L 264 236 L 264 334 L 284 334" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p0-arr)" />
                  <text x="255" y="96" textAnchor="middle" fontSize="12" fontWeight="600" fill="#5f6368">
                    pull
                  </text>

                  {/* Top Right Container: Cloud Run Service (Part 1, 2, 3) */}
                  <rect x="288" y="16" width="508" height="252" rx="14" fill="#f8fafd" stroke="#cbd5e1" strokeWidth="1.3" strokeDasharray="6 4" />
                  <text x="306" y="40" fontSize="13" fontWeight="700" fill="#0891b2">
                    経路 A：Cloud Run サービス（HTTP リクエスト応答型・Part 1〜3）
                  </text>

                  {/* Service Entrance */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('service')}>
                    <rect
                      x="306"
                      y="54"
                      width="148"
                      height="88"
                      rx="11"
                      fill="#ecfeff"
                      stroke={strokeFor('service', '#67e8f9', '#0891b2')}
                      strokeWidth={widthFor('service')}
                    />
                    <text x="380" y="80" textAnchor="middle" fontSize="15" fontWeight="700" fill="#155e75">
                      HTTPS 入口
                    </text>
                    <text x="380" y="102" textAnchor="middle" fontSize="12.5" fill="#0e7490">
                      Invoker 認証
                    </text>
                    <text x="380" y="122" textAnchor="middle" fontSize="12" fill="#444746">
                      本番 URL / タグ URL
                    </text>
                  </g>

                  <path d="M 454 98 L 478 98" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p0-arr)" />

                  {/* Traffic Splitting */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('traffic')}>
                    <rect
                      x="482"
                      y="54"
                      width="138"
                      height="88"
                      rx="11"
                      fill="#fef7e0"
                      stroke={strokeFor('traffic', '#f6c366', '#b06000')}
                      strokeWidth={widthFor('traffic')}
                    />
                    <text x="551" y="79" textAnchor="middle" fontSize="15" fontWeight="700" fill="#7a4100">
                      トラフィック
                    </text>
                    <text x="551" y="101" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#8f4f00">
                      90% / 10% 振分
                    </text>
                    <text x="551" y="122" textAnchor="middle" fontSize="12" fill="#5f6368">
                      3 秒ロールバック
                    </text>
                  </g>

                  <path d="M 620 98 L 642 98" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p0-arr)" />

                  {/* Immutable Revisions */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('revisions')}>
                    <rect
                      x="646"
                      y="54"
                      width="134"
                      height="88"
                      rx="11"
                      fill="#e6f4ea"
                      stroke={strokeFor('revisions', '#81c995', '#137333')}
                      strokeWidth={widthFor('revisions')}
                    />
                    <text x="713" y="79" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                      不変リビジョン
                    </text>
                    <text x="713" y="101" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                      v1（安定） / v2
                    </text>
                    <text x="713" y="122" textAnchor="middle" fontSize="12" fill="#137333">
                      Ready 済のみ配信
                    </text>
                  </g>

                  {/* Scaling Layer underneath Revisions */}
                  <path d="M 713 142 L 713 166" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p0-arr)" />
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('scaling')}>
                    <rect
                      x="306"
                      y="170"
                      width="474"
                      height="82"
                      rx="11"
                      fill="#e8f0fe"
                      stroke={strokeFor('scaling', '#8ab4f8', '#0b57d0')}
                      strokeWidth={widthFor('scaling')}
                    />
                    <text x="543" y="196" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#041e49">
                      Part 3・自動スケール（稼働インスタンス 0 〜 max-instances 台）
                    </text>
                    <text x="543" y="219" textAnchor="middle" fontSize="12" fill="#1a4e9d">
                      ceil(同時リクエスト ÷ Concurrency) で自動伸縮 ／ 0 台起動＝コールドスタート
                    </text>
                    <text x="543" y="239" textAnchor="middle" fontSize="11.5" fill="#444746">
                      min-instances で初回遅延を抑え、max-instances で暴走課金と DB 過負荷を防ぐ
                    </text>
                  </g>

                  {/* Bottom Right: Cloud Run Job (Part 1) */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('job')}>
                    <rect
                      x="288"
                      y="286"
                      width="508"
                      height="102"
                      rx="14"
                      fill="#f5f3ff"
                      stroke={strokeFor('job', '#c4b5fd', '#6d28d9')}
                      strokeWidth={widthFor('job')}
                    />
                    <text x="308" y="311" fontSize="13" fontWeight="700" fill="#5b21b6">
                      経路 B：Cloud Run ジョブ（バッチ完結型・Part 1）
                    </text>
                    <text x="308" y="338" fontSize="15.5" fontWeight="700" fill="#3b0764">
                      夜間 PDF 索引作成・集計・DB マイグレーション
                    </text>
                    <text x="308" y="362" fontSize="12.2" fill="#4c1d95">
                      Scheduler / 手動起動 → Execution → Task 0..N 並列 → exit 0 で終了
                    </text>
                    <text x="308" y="379" fontSize="12" fill="#5f6368">
                      HTTP 待ち受け不要・失敗タスク単位の自動リトライ・最大 24 時間（タスク単位）
                    </text>
                  </g>
                </svg>
              )}
            </div>
          </section>

          {/* Prerequisite 7 Words Grid */}
          <section className="skeleton-principles" aria-labelledby="w2-prereq-heading">
            <div className="skeleton-principles-head">
              <p className="panel-kicker">Part 0・まず押さえる前提ワード（7 語）</p>
              <h2 id="w2-prereq-heading" className="skeleton-section-title">
                第2週で頻出する 7 つの基礎語を「一言＋比喩」で先に固定する
              </h2>
            </div>

            <ul className="prereq-grid" role="list">
              {PREREQ_WORDS.map((item, idx) => (
                <li key={item.termId} className="prereq-card">
                  <div className="prereq-card-top">
                    <span className="principle-num" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <div className="prereq-title-wrap">
                      <h3 className="principle-title">{item.word}</h3>
                      <span className="prereq-sub mono">{item.sub}</span>
                    </div>
                  </div>
                  <p className="principle-detail">{item.meaning}</p>
                  <p className="prereq-analogy">比喩：{item.analogy}</p>
                  <button
                    type="button"
                    className="prereq-glossary-link"
                    onClick={() => onOpenGlossary(item.termId)}
                  >
                    <BookMarked size={12} aria-hidden="true" />
                    用語集で試験ポイントを見る
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
