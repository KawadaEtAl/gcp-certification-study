import { useEffect, useState } from 'react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

type SupplyNodeId = 'dev' | 'build' | 'ar-repo' | 'tag-digest' | 'agent' | 'runtime';

interface SupplyNodeInfo {
  id: SupplyNodeId;
  order: number;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  kvPairs: { label: string; value: string; tone?: 'neutral' | 'allow' | 'deny' | 'warn' | 'info' }[];
  payloadTitle: string;
  sampleJson: Record<string, unknown>;
}

const SUPPLY_NODES: Record<SupplyNodeId, SupplyNodeInfo> = {
  dev: {
    id: 'dev',
    order: 1,
    badge: '主体 ①・開発者 / 外部 CI',
    title: '開発者・CI（デプロイ指示を出す主体）',
    subtitle: 'ソースを渡し、Cloud Run の設定変更と実行時 SA 割り当て（actAs）を指示する',
    explanation:
      '第1週と同じく、デプロイコマンドを実行する主体には Cloud Run 側の操作権限と、実行時 SA に対する `iam.serviceAccounts.actAs` が必要です。ただし裏側で動くビルドやイメージ pull は別の SA が担当します。',
    kvPairs: [
      { label: '必要な代表ロール', value: '`roles/run.developer` ＋ SA 上の `actAs`', tone: 'info' },
      { label: '担当範囲', value: 'ビルド依頼・デプロイ設定の送信' },
      { label: '担当しない範囲', value: 'コンテナのビルド実行や実行時の GCS 読み取り' },
    ],
    payloadTitle: '主体 ① の責任範囲',
    sampleJson: {
      actor: 'developer / GitHub Actions (WIF)',
      permissions: ['roles/run.developer', 'roles/iam.serviceAccountUser (actAs)'],
      triggers: 'gcloud run deploy --source . or --image ...@sha256:...',
    },
  },
  build: {
    id: 'build',
    order: 2,
    badge: '主体 ②・裏の登場人物（ビルド用 SA）',
    title: 'Cloud Build ビルド用 SA（箱を詰めて push する裏役）',
    subtitle: '第1週の実機でも踏んだ裏役。Dockerfile からイメージを組み立て AR へ push する',
    explanation:
      '`gcloud run deploy --source .` を実行すると、裏側で Cloud Build が起動します。イメージをビルドして Artifact Registry へ保存（push）するのは開発者本人ではなく「ビルド用 SA」のため、`roles/artifactregistry.writer` 等が不足するとビルド段階で 403 失敗します。',
    kvPairs: [
      { label: '役割', value: 'ソースからコンテナをビルドし AR へ push', tone: 'warn' },
      { label: '必要な代表ロール', value: '`roles/artifactregistry.writer` / `roles/run.builder`' },
      { label: '実機での落とし穴', value: '開発者が Owner でもビルド用 SA に権限がないと失敗する', tone: 'deny' },
    ],
    payloadTitle: '主体 ② の権限構成',
    sampleJson: {
      actor: 'Cloud Build Service Account',
      action: 'Build container image -> Push to Artifact Registry',
      requiredRoles: ['roles/artifactregistry.writer', 'roles/logging.logWriter'],
    },
  },
  'ar-repo': {
    id: 'ar-repo',
    order: 3,
    badge: '倉庫本体・Artifact Registry',
    title: 'Artifact Registry（リージョン配置・リポジトリ単位 IAM）',
    subtitle: '旧 GCR（gcr.io）の後継。同リージョン配置・脆弱性診断・自動クリーンアップを備える',
    explanation:
      'Artifact Registry はアプリやチームごとに独立したリポジトリを作成でき、リポジトリ単位で最小権限 IAM を設定できます。Cloud Run と同じリージョン（`asia-northeast1`）に置くことで起動時の pull が速くなり、クロスリージョン転送課金も防げます。',
    kvPairs: [
      { label: '配置の鉄則', value: 'Cloud Run と同じリージョン（`asia-northeast1`）', tone: 'allow' },
      { label: 'セキュリティ機能', value: 'Artifact Analysis による自動脆弱性スキャン', tone: 'info' },
      { label: 'コスト最適化', value: 'クリーンアップポリシーで古い不要イメージを自動削除' },
    ],
    payloadTitle: 'Artifact Registry リポジトリ設計例',
    sampleJson: {
      location: 'asia-northeast1',
      format: 'DOCKER (他に Python / npm / Maven / Helm 等も対応)',
      url: 'asia-northeast1-docker.pkg.dev/gcp-study-sandbox/manual-repo',
      cleanupPolicy: '最新 5 世代を保持し、30 日以上前の未使用イメージを削除',
    },
  },
  'tag-digest': {
    id: 'tag-digest',
    order: 4,
    badge: '再現性の核心・タグ vs ダイジェスト',
    title: 'タグ（:latest）は付箋、ダイジェスト（@sha256:）は固有指紋',
    subtitle: '本番デプロイや切り戻しでは、上書きされないダイジェストで中身を厳密固定する',
    explanation:
      '`:latest` や `:prod` といったタグは後から別のイメージへ貼り替えられるため、「昨日と同じタグで戻したのに別の中身が動く」事故が起きます。中身から計算される `@sha256:...` ダイジェストを指定すれば、テスト済みのまったく同じバイナリを 100% 再現できます。',
    kvPairs: [
      { label: 'タグ（:latest / :v2）', value: '可変（Mutable）— 上書きで指す中身が変わる', tone: 'warn' },
      { label: 'ダイジェスト（@sha256:...）', value: '不変（Immutable）— 1 バイト変われば別 ID', tone: 'allow' },
      { label: 'Cloud Run の挙動', value: 'デプロイ時にタグを自動でダイジェストへ解決・固定' },
    ],
    payloadTitle: 'タグ指定 vs ダイジェスト指定',
    sampleJson: {
      avoidInProd: 'asia-northeast1-docker.pkg.dev/.../manual-api:latest',
      recommended: 'asia-northeast1-docker.pkg.dev/.../manual-api@sha256:8f41c9b2e0a1...',
      why: 'タグ上書きによる意図しないコード差し替えを防ぎ、完全な再現性を保証する',
    },
  },
  agent: {
    id: 'agent',
    order: 5,
    badge: '主体 ③・超頻出の裏の登場人物',
    title: 'Cloud Run サービスエージェント（AR から pull する配送員）',
    subtitle: '別プロジェクトの AR から pull する際、権限が必要なのは実行時 SA ではなくここ！',
    explanation:
      'Cloud Run がコンテナを起動する直前に Artifact Registry からイメージを pull する主体は、`service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`（Google 管理のサービスエージェント）です。別プロジェクトの共有 AR を使うときは、実行時 SA ではなくこのサービスエージェントに `roles/artifactregistry.reader` を付けます。',
    kvPairs: [
      { label: 'プリンシパル形式', value: '`service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`', tone: 'deny' },
      { label: '必要なロール（別 PJ 時）', value: '対象リポジトリ上の `roles/artifactregistry.reader`', tone: 'info' },
      { label: 'よくある誤解', value: '実行時 SA に reader を付けても pull 403 は解消しない', tone: 'warn' },
    ],
    payloadTitle: 'クロスプロジェクト pull の最小権限設定',
    sampleJson: {
      sharedBuildProjectRepo: 'projects/build-pj/locations/asia-northeast1/repositories/manual-repo',
      grantRole: 'roles/artifactregistry.reader',
      toPrincipal: 'serviceAccount:service-123456789012@serverless-robot-prod.iam.gserviceaccount.com',
      notTo: 'manual-api-sa（実行時 SA は起動後の GCS 読み取り用）',
    },
  },
  runtime: {
    id: 'runtime',
    order: 6,
    badge: '主体 ④・実行時 SA（ランタイム ID）',
    title: 'Cloud Run 実行時 SA（起動後に GCS 等を読む名札）',
    subtitle: 'イメージ pull 完了後、コンテナ内のアプリコードがデータへアクセスするときに使う',
    explanation:
      'コンテナが起動したあと、`week01-manual-api` が `manual-docs` バケットを読み取るときに名乗る ID です。第1週で設定した通り、ここにはデータアクセス用の最小権限（`roles/storage.objectViewer` 等）だけを付け、ビルド権限や AR 書き込み権限は一切持たせません。',
    kvPairs: [
      { label: '使うタイミング', value: 'コンテナ起動後（アプリ実行中のみ）', tone: 'allow' },
      { label: '付与するロール', value: '対象バケットの `roles/storage.objectViewer` 等' },
      { label: '分離する理由', value: '万が一アプリが侵害されても AR イメージを改ざんさせない', tone: 'info' },
    ],
    payloadTitle: '4 主体の責務分離まとめ',
    sampleJson: {
      actor1_deploy: '開発者 / CI（run.developer + actAs）',
      actor2_build: 'Cloud Build SA（artifactregistry.writer）',
      actor3_pull: 'Cloud Run サービスエージェント（artifactregistry.reader）',
      actor4_runtime: '実行時 SA（storage.objectViewer のみ）',
    },
  },
};

interface Part4Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Week02Part4ArtifactRegistryViz({ onStepInsightChange }: Part4Props) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<SupplyNodeId>('agent');
  const active = SUPPLY_NODES[activeId];

  useEffect(() => {
    onStepInsightChange({
      stepNumber: active.order,
      totalSteps: Object.keys(SUPPLY_NODES).length,
      badge: active.badge,
      title: active.title,
      subtitle: active.subtitle,
      explanation: active.explanation,
      kvPairs: active.kvPairs,
      payloadTitle: active.payloadTitle,
      payloadJson: JSON.stringify(active.sampleJson, null, 2),
    });
  }, [active, onStepInsightChange]);

  const strokeFor = (id: SupplyNodeId, base: string, activeColor: string) =>
    activeId === id ? activeColor : base;
  const widthFor = (id: SupplyNodeId) => (activeId === id ? 2.5 : 1.35);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <span className="skeleton-hint">
            ビルド〜保管〜pull〜実行の 6 ボックスをタップすると、裏側で動く 4 主体の権限と JSON が確認できます
          </span>
        </div>

        <div className="skeleton-stack">
          <section className="skeleton-section">
            <div className="skeleton-section-head">
              <span className="skeleton-num-badge">図</span>
              <div>
                <h2 className="skeleton-section-title">
                  コンテナ・サプライチェーン骨格図（4 つの主体 ＋ タグ vs ダイジェスト）
                </h2>
                <p className="skeleton-section-sub">
                  「誰がビルドして push し、誰が pull し、誰が起動後に GCS を読むか」を 1 本の線で分離すると、実機の 403 エラーも試験のひっかけも迷わなくなります。
                </p>
              </div>
            </div>

            <div className="blueprint-stage skeleton-stage">
              {isMobile ? (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 380 572"
                  role="img"
                  aria-label="Artifact Registry と 4 つの主体のサプライチェーン骨格図（モバイル）"
                >
                  <title>Artifact Registry サプライチェーン（モバイル）</title>
                  <defs>
                    <marker id="w2p4-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('dev')}>
                    <rect x="14" y="10" width="352" height="58" rx="10" fill="#eef2ff" stroke={strokeFor('dev', '#a5b4fc', '#4338ca')} strokeWidth={widthFor('dev')} />
                    <text x="190" y="34" textAnchor="middle" fontSize="14" fontWeight="700" fill="#312e81">
                      ① 開発者 / 外部 CI（デプロイ指示）
                    </text>
                    <text x="190" y="54" textAnchor="middle" fontSize="12" fill="#4338ca">
                      roles/run.developer ＋ 実行時 SA の actAs
                    </text>
                  </g>

                  <path d="M 190 68 L 190 92" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p4-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('build')}>
                    <rect x="14" y="96" width="352" height="62" rx="10" fill="#fef7e0" stroke={strokeFor('build', '#f6c366', '#b06000')} strokeWidth={widthFor('build')} />
                    <text x="190" y="121" textAnchor="middle" fontSize="14" fontWeight="700" fill="#7a4100">
                      ② Cloud Build ビルド用 SA（裏役）
                    </text>
                    <text x="190" y="142" textAnchor="middle" fontSize="12" fill="#8f4f00">
                      箱をビルドし AR へ push（artifactregistry.writer）
                    </text>
                  </g>

                  <path d="M 190 158 L 190 182" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p4-arr-m)" />

                  {/* Artifact Registry Box */}
                  <rect x="14" y="186" width="352" height="162" rx="12" fill="#f8fafd" stroke="#8ab4f8" strokeWidth="1.5" />
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('ar-repo')}>
                    <rect x="26" y="198" width="328" height="62" rx="9" fill="#e8f0fe" stroke={strokeFor('ar-repo', '#8ab4f8', '#0b57d0')} strokeWidth={widthFor('ar-repo')} />
                    <text x="190" y="222" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#041e49">
                      Artifact Registry（同リージョン倉庫）
                    </text>
                    <text x="190" y="243" textAnchor="middle" fontSize="12" fill="#1a4e9d">
                      リポジトリ単位 IAM・脆弱性診断・自動掃除
                    </text>
                  </g>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('tag-digest')}>
                    <rect x="26" y="272" width="328" height="64" rx="9" fill="#ffffff" stroke={strokeFor('tag-digest', '#cbd5e1', '#137333')} strokeWidth={widthFor('tag-digest')} />
                    <text x="190" y="295" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0d652d">
                      タグ（:latest 可変）vs 指紋（@sha256 不変）
                    </text>
                    <text x="190" y="317" textAnchor="middle" fontSize="12" fill="#444746">
                      本番・切り戻しは @sha256 固有指紋で固定
                    </text>
                  </g>

                  <path d="M 190 348 L 190 374" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p4-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('agent')}>
                    <rect x="14" y="378" width="352" height="72" rx="10" fill="#fce8e6" stroke={strokeFor('agent', '#f28b82', '#c5221f')} strokeWidth={widthFor('agent')} />
                    <text x="190" y="403" textAnchor="middle" fontSize="14" fontWeight="700" fill="#a50e0e">
                      ③ Cloud Run サービスエージェント（pull 役）
                    </text>
                    <text x="190" y="424" textAnchor="middle" fontSize="12" fill="#c5221f">
                      別 PJ の AR にはここに artifactregistry.reader
                    </text>
                    <text x="190" y="441" textAnchor="middle" fontSize="11" fill="#5f6368">
                      ※実行時 SA ではない（超頻出ひっかけ）
                    </text>
                  </g>

                  <path d="M 190 450 L 190 476" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p4-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('runtime')}>
                    <rect x="14" y="480" width="352" height="76" rx="10" fill="#e6f4ea" stroke={strokeFor('runtime', '#81c995', '#137333')} strokeWidth={widthFor('runtime')} />
                    <text x="190" y="506" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                      ④ Cloud Run 起動後：実行時 SA（ランタイム）
                    </text>
                    <text x="190" y="528" textAnchor="middle" fontSize="12" fill="#1e4620">
                      manual-docs バケット読み取り専用（Object Viewer）
                    </text>
                    <text x="190" y="546" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      AR 書き込み権限を持たせず被害を最小化
                    </text>
                  </g>
                </svg>
              ) : (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 820 356"
                  role="img"
                  aria-label="Artifact Registry と 4 つの主体のサプライチェーン骨格図"
                >
                  <title>Artifact Registry サプライチェーンと 4 主体分離</title>
                  <defs>
                    <marker id="w2p4-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* Left Column: Actor 1 & Actor 2 */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('dev')}>
                    <rect x="18" y="24" width="206" height="96" rx="12" fill="#eef2ff" stroke={strokeFor('dev', '#a5b4fc', '#4338ca')} strokeWidth={widthFor('dev')} />
                    <text x="121" y="50" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#312e81">
                      ① 開発者 / 外部 CI
                    </text>
                    <text x="121" y="74" textAnchor="middle" fontSize="12.5" fill="#4338ca">
                      デプロイ指示・設定変更
                    </text>
                    <text x="121" y="98" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      run.developer ＋ actAs
                    </text>
                  </g>

                  <path d="M 121 120 L 121 154" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p4-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('build')}>
                    <rect x="18" y="160" width="206" height="114" rx="12" fill="#fef7e0" stroke={strokeFor('build', '#f6c366', '#b06000')} strokeWidth={widthFor('build')} />
                    <text x="121" y="187" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#7a4100">
                      ② Cloud Build SA
                    </text>
                    <text x="121" y="210" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#8f4f00">
                      ビルド ＆ AR へ push
                    </text>
                    <text x="121" y="234" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      artifactregistry.writer
                    </text>
                    <text x="121" y="255" textAnchor="middle" fontSize="11.5" fill="#b06000">
                      ※開発者とは別の裏役
                    </text>
                  </g>

                  {/* Push arrow to AR */}
                  <path d="M 224 217 L 266 217" fill="none" stroke="#b06000" strokeWidth="2" markerEnd="url(#w2p4-arr)" />
                  <text x="245" y="206" textAnchor="middle" fontSize="12" fontWeight="700" fill="#b06000">
                    push
                  </text>

                  {/* Center: Artifact Registry */}
                  <rect x="272" y="24" width="248" height="250" rx="14" fill="#f8fafd" stroke="#8ab4f8" strokeWidth="1.6" />
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('ar-repo')}>
                    <rect x="286" y="38" width="220" height="104" rx="10" fill="#e8f0fe" stroke={strokeFor('ar-repo', '#8ab4f8', '#0b57d0')} strokeWidth={widthFor('ar-repo')} />
                    <text x="396" y="65" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#041e49">
                      Artifact Registry
                    </text>
                    <text x="396" y="88" textAnchor="middle" fontSize="12.5" fill="#1a4e9d">
                      asia-northeast1（同リージョン）
                    </text>
                    <text x="396" y="110" textAnchor="middle" fontSize="12" fill="#444746">
                      リポジトリ単位 IAM・脆弱性診断
                    </text>
                    <text x="396" y="128" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      クリーンアップポリシーで自動掃除
                    </text>
                  </g>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('tag-digest')}>
                    <rect x="286" y="156" width="220" height="104" rx="10" fill="#ffffff" stroke={strokeFor('tag-digest', '#cbd5e1', '#137333')} strokeWidth={widthFor('tag-digest')} />
                    <text x="396" y="182" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1f1f">
                      タグ vs ダイジェスト
                    </text>
                    <text x="396" y="204" textAnchor="middle" fontSize="12" fill="#b06000">
                      :latest（付箋・上書きで変化）
                    </text>
                    <text x="396" y="226" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#137333">
                      @sha256:...（固有指紋・不変）
                    </text>
                    <text x="396" y="246" textAnchor="middle" fontSize="11.5" fill="#5f6368">
                      本番・切り戻しは必ず指紋で固定
                    </text>
                  </g>

                  {/* Pull arrow from AR to Service Agent */}
                  <path d="M 520 96 L 564 96" fill="none" stroke="#c5221f" strokeWidth="2" markerEnd="url(#w2p4-arr)" />
                  <text x="542" y="85" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c5221f">
                    pull
                  </text>

                  {/* Right Column: Actor 3 & Actor 4 */}
                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('agent')}>
                    <rect x="570" y="24" width="226" height="118" rx="12" fill="#fce8e6" stroke={strokeFor('agent', '#f28b82', '#c5221f')} strokeWidth={widthFor('agent')} />
                    <text x="683" y="51" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#a50e0e">
                      ③ サービスエージェント
                    </text>
                    <text x="683" y="73" textAnchor="middle" fontSize="12" fontWeight="650" fill="#c5221f">
                      AR からイメージを pull する裏役
                    </text>
                    <text x="683" y="96" textAnchor="middle" fontSize="11.5" fill="#444746">
                      別 PJ の AR にはここへ
                    </text>
                    <text x="683" y="114" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#a50e0e">
                      roles/artifactregistry.reader
                    </text>
                    <text x="683" y="132" textAnchor="middle" fontSize="11" fill="#5f6368">
                      serverless-robot-prod
                    </text>
                  </g>

                  <path d="M 683 142 L 683 166" fill="none" stroke="#137333" strokeWidth="1.8" markerEnd="url(#w2p4-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('runtime')}>
                    <rect x="570" y="172" width="226" height="102" rx="12" fill="#e6f4ea" stroke={strokeFor('runtime', '#81c995', '#137333')} strokeWidth={widthFor('runtime')} />
                    <text x="683" y="199" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#0d652d">
                      ④ 実行時 SA（起動後）
                    </text>
                    <text x="683" y="222" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                      manual-docs を読む専用名札
                    </text>
                    <text x="683" y="244" textAnchor="middle" fontSize="11.5" fill="#137333">
                      roles/storage.objectViewer
                    </text>
                    <text x="683" y="262" textAnchor="middle" fontSize="11" fill="#5f6368">
                      AR の読み書き権限は持たせない
                    </text>
                  </g>

                  {/* Bottom Key Takeaway Strip */}
                  <rect x="18" y="294" width="778" height="48" rx="10" fill="#ffffff" stroke="#e0e3eb" strokeWidth="1.2" />
                  <text x="36" y="323" fontSize="13" fill="#444746">
                    <tspan fontWeight="700" fill="#c5221f">実機＆試験の最重要区別：</tspan>
                    開発者（指示）・ビルド用 SA（push）・サービスエージェント（pull）・実行時 SA（GCS 読み取り）の 4 者は完全に別主体。
                  </text>
                </svg>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
