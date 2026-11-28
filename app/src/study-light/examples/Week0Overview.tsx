import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Cloud,
  Folder,
  Globe,
  IdCard,
  Layers,
  Shield,
  Users,
  Archive,
} from 'lucide-react';
import { Art, type ArtName } from '../ui/Art';
import { ChoiceGroup, Comparison, Insight } from '../ui/Diagrams';
import { Analogy, GuidedText, TermLink } from '../ui/Help';
import { CodeBlock, Disclosure } from '../ui/Lesson';
import { ResourceTree, type TreeItem } from '../ui/Relations';

type SkeletonKey = 'org' | 'folder' | 'project' | 'resources' | 'sa' | 'human' | 'location' | 'org-policy';

const SKELETON_DETAILS: Record<
  SkeletonKey,
  { title: string; badge: string; body: string; json: Record<string, unknown> }
> = {
  org: {
    badge: 'リソースの木・頂点',
    title: '組織（Organization）',
    body: '会社・ドメインに 1 つだけ存在する木の根です。ここに付けた IAM 権限や組織ポリシーは、配下の全フォルダ・全プロジェクトへ自動的に継承されます。通常の開発者権限は付けず、全社共通のガードレールに留めます。',
    json: {
      node: 'organizations/123456789012',
      typicalControls: ['組織ポリシー（SA キー作成禁止など）', '監査ログの集約シンク'],
      avoidHere: '個別プロジェクト向けの Editor / Owner 付与',
    },
  },
  folder: {
    badge: 'リソースの木・中間層',
    title: 'フォルダ（Folder）',
    body: '部門（広告事業部）や環境（本番 / 開発）ごとにプロジェクトを束ねる箱です。上位フォルダには「配下すべてに共通して許せる弱い権限（閲覧など）」だけを置き、本番と開発を別枝に分けて隔離します。',
    json: {
      structure: 'Organization -> 部門フォルダ -> 環境フォルダ(本番/開発) -> Project',
      principle: '上位に弱い権限（閲覧）、下位に強い権限（編集）',
    },
  },
  project: {
    badge: 'リソースの木・基本単位',
    title: 'プロジェクト（Project）',
    body: '課金アカウントの紐付け、API 有効化、クォータ上限、そしてリソース間のデフォルト隔離境界はすべてプロジェクト単位です。本番と開発は事故防止のため必ず別プロジェクトに分けます。',
    json: {
      project: 'manual-prod',
      boundaries: ['課金先（Billing Account）', '有効化する API', 'リソース間のデフォルト隔離'],
    },
  },
  resources: {
    badge: 'リソースの木・実体',
    title: '個別リソース（Cloud Storage / Cloud Run など）',
    body: 'アプリやデータの具体的な入れ物です。IAM はプロジェクト全体ではなく、特定の 1 バケットや 1 シークレット単体にも付けられます。最小権限の原則では、まずこの単位で絞れないかを考えます。',
    json: {
      resource: 'gs://manual-docs',
      binding: { role: 'roles/storage.objectViewer', member: 'serviceAccount:sa-reader@...' },
    },
  },
  sa: {
    badge: '最重要の二面性',
    title: 'サービスアカウント（リソース兼プリンシパル）',
    body: 'プロジェクトに属する「リソース」でありつつ、アプリが他リソースを操作する際の「プリンシパル（ID）」でもある唯一の二面性を持つ存在です。だから SA 自体にも「誰がこの SA を使ってよいか（actAs）」を設定できます。',
    json: {
      serviceAccount: 'sa-reader@manual-prod.iam.gserviceaccount.com',
      asPrincipal: 'Cloud Run から GCS バケットを読む主体',
      asResource: '開発者に roles/iam.serviceAccountUser (actAs) を付ける対象',
    },
  },
  human: {
    badge: '木の外にいる主体',
    title: 'Google アカウント・Google グループ（木の外）',
    body: '人間のアカウントやグループはプロジェクトの中には存在せず、木の外の Cloud Identity / Google Workspace で管理されます。リソース側の IAM ポリシーから参照して紐付け、実務では個人直付けを避けてグループ単位で付与します。',
    json: {
      principal: 'group:ads-developers@example.com',
      livesOutsideResourceTree: true,
      bestPractice: '個人アカウントではなく Google グループ単位で付与する',
    },
  },
  location: {
    badge: '権限の木とは別の軸',
    title: '物理配置：リージョンとゾーン（直交する別軸）',
    body: 'リソース階層（管理・権限・課金の軸）と、リージョン・ゾーン（物理的な置き場所の軸）は完全に別物です。1 つのプロジェクト内に東京リージョン（asia-northeast1）の Cloud Run と米国マルチリージョンのバケットを混在配置できます。',
    json: {
      governanceAxis: 'Organization -> Folder -> Project -> Resource',
      physicalAxis: 'Region (asia-northeast1) -> Zone (-a / -b / -c)',
    },
  },
  'org-policy': {
    badge: '全社ガードレール',
    title: '組織ポリシー（Organization Policy）',
    body: 'IAM が「誰に何の操作を許すか」を決めるのに対し、組織ポリシーは「たとえ Owner 権限を持っていても、この配下では SA の静的 JSON キー発行や外部公開を禁止する」という設定制約を階層全体へ強制します。',
    json: {
      constraint: 'constraints/iam.disableServiceAccountKeyCreation',
      effect: '権限があっても静的 JSON キーの作成をブロックする',
    },
  },
};

const GCP_LAYERS: {
  id: string;
  art: ArtName;
  short: string;
  label: string;
  weight: string;
  weeks: string;
  services: string[];
  focus: string;
  jumpHash?: string;
  jumpLabel?: string;
}[] = [
  {
    id: 'iam',
    art: 'policy',
    short: 'IAM・階層',
    label: 'リソース階層・IAM・セキュリティ',
    weight: 'セキュリティ 17.5%',
    weeks: '第1・5・12・19週',
    services: ['組織 / フォルダ / プロジェクト', 'IAM (Allow / Deny)', 'Service Account / WIF', 'Secret Manager', 'Cloud KMS'],
    focus: '最小権限、JSON キー廃止（ADC / WIF）、上位からの Allow 継承と IAM Deny の使い分けが最頻出。第1週で最初に手を動かして腹落ちさせます。',
    jumpHash: '#w01-p1/0',
    jumpLabel: 'Week 1 Part 1 へ',
  },
  {
    id: 'network',
    art: 'vpc',
    short: 'ネットワーク',
    label: 'ネットワーク・入口と境界',
    weight: '設計横断 約20%',
    weeks: '第5〜6週・第19週',
    services: ['VPC / サブネット', 'Cloud Load Balancing', 'Cloud DNS / Cloud CDN', 'Cloud NAT', 'VPN / Interconnect / PSC'],
    focus: 'GCP の VPC はグローバルリソース（サブネットがリージョン単位）。公開入口（LB + CDN）と非公開接続（Shared VPC / PSC / Interconnect）の選定理由が問われます。',
  },
  {
    id: 'compute',
    art: 'server',
    short: '実行基盤',
    label: '実行基盤（コンピュート）',
    weight: '設計 25% の中核',
    weeks: '第1〜2週・第7週',
    services: ['Cloud Run（サービス / ジョブ）', 'Artifact Registry', 'GKE（Kubernetes）', 'Compute Engine（VM）'],
    focus: '迷ったら運用負荷が最小の Cloud Run から検討し、複雑なオーケストレーションなら GKE、OS・ライセンス制御やレガシー移行なら GCE を選ぶ判断軸を身につけます。',
    jumpHash: '#w02-p0/0',
    jumpLabel: 'Week 2 全体マップへ',
  },
  {
    id: 'data',
    art: 'sql',
    short: 'データ・分析',
    label: 'データ保存・分析基盤',
    weight: '設計・最適化の頻出',
    weeks: '第3週・第8〜9週',
    services: ['Cloud Storage', 'Firestore', 'Cloud SQL / Spanner', 'Bigtable', 'BigQuery / Pub/Sub / Dataflow'],
    focus: '「ファイルは GCS」「リージョン RDB は Cloud SQL」「世界規模強整合 RDB は Spanner」「大量時系列は Bigtable」「分析 DWH は BigQuery」という選定と棄却理由を整理します。',
  },
  {
    id: 'ops',
    art: 'metrics',
    short: '運用・FinOps',
    label: '運用・CI/CD・コスト統制（FinOps）',
    weight: '実装 12.5% ＋ 運用 12.5%',
    weeks: '第1・4週・第11〜15週',
    services: ['Terraform (IaC)', 'Cloud Build', 'Cloud Logging / Monitoring', 'Cloud Billing 予算 / クォータ', 'DR (RTO / RPO)'],
    focus: '予算通知（非同期・停止しない）とクォータ（同期制御）の区別、段階リリースと切り戻し基準、RTO / RPO に基づく復旧設計を押さえます。',
    jumpHash: '#w01-p4/0',
    jumpLabel: 'Week 1 Part 4 へ',
  },
  {
    id: 'ai',
    art: 'agent',
    short: 'AI / Agent',
    label: 'AI / Agent 基盤（PCA → PAA の橋渡し）',
    weight: '第16週 → 後半半年 PAA',
    weeks: '第16〜24週 → PAA',
    services: ['Vertex AI / Gemini', 'Gemini Enterprise Agent Platform', 'ADK', '評価・ガバナンス'],
    focus: '前半の PCA 学習で育てる架空マニュアル RAG アプリの土台（Cloud Run + GCS + IAM + 監視）を、そのまま第16週の AI 運用と後半半年の PAA 学習へ再利用します。',
  },
];

const STAGES = [
  {
    num: '第1段階',
    weeks: '第1〜4週',
    title: '使っている仕組みを自分で説明する',
    goal: 'リクエスト 1 件の入口・権限・保存先・失敗時のログをメモなしで説明できる',
    items: [
      { wk: 'W01', title: 'IAM・Cloud Run・キーレス認証・予算通知', href: '#w01-p1/0' },
      { wk: 'W02', title: 'Cloud Run サービス/ジョブ・リビジョン・スケール・AR', href: '#w02-p0/0' },
      { wk: 'W03', title: 'Cloud Storage 版管理・Firestore・Cloud Tasks 再試行' },
      { wk: 'W04', title: 'Cloud Build・Logging・Monitoring・リリース検証' },
    ],
  },
  {
    num: '第2段階',
    weeks: '第5〜10週',
    title: '同じ要件に対する構成を比較する',
    goal: '要件から候補を絞り、採用案のトレードオフと他案の棄却理由を説明できる',
    items: [
      { wk: 'W05-06', title: 'VPC・Firewall・Cloud LB・DNS・VPN / Interconnect / PSC' },
      { wk: 'W07-08', title: '実行基盤比較（Run / GKE / GCE）＆ DB 比較（SQL / Spanner / Bigtable）' },
      { wk: 'W09-10', title: 'BigQuery 最適化・Well-Architected 2案比較' },
    ],
  },
  {
    num: '第3段階',
    weeks: '第11〜16週',
    title: '実装・統制・障害対応を設計する',
    goal: '変更前後の観測、切り戻し基準、RTO/RPO、段階移行境界を説明できる',
    items: [
      { wk: 'W11-12', title: 'Terraform IaC・鍵管理・監査ログ・組織ポリシー' },
      { wk: 'W13-15', title: 'CI/CD 段階リリース・DR 設計・段階移行' },
      { wk: 'W16', title: 'AI サービス選定・Gemini Agent Platform 運用' },
    ],
  },
  {
    num: '第4段階',
    weeks: '第17〜24週',
    title: '公式 4 ケースと通し演習で穴を閉じる',
    goal: 'Altostrat / Cymbal / EHR / KnightMotives を制約から設計し時間内に解答する',
    items: [
      { wk: 'W17-20', title: '公式 4 ケーススタディ徹底分析（出題の 20〜30%）' },
      { wk: 'W21-24', title: '横断演習・弱点補強・口頭説明・受験判断 → PAA へ' },
    ],
  },
];

const treeNodes: TreeItem[] = [
  {
    id: 'org',
    icon: <Building2 size={18} />,
    label: (
      <>
        <TermLink id="resource-hierarchy">組織</TermLink>
        <b>サンプル社</b>
      </>
    ),
    children: [
      {
        id: 'folder',
        icon: <Folder size={18} />,
        label: (
          <>
            <TermLink id="resource-hierarchy">フォルダ</TermLink>
            <b>広告事業部（閲覧者を付与）</b>
          </>
        ),
        children: [
          {
            id: 'project',
            icon: <Layers size={18} />,
            label: (
              <>
                <TermLink id="resource-hierarchy">プロジェクト</TermLink>
                <b>manual-prod（課金・API 境界）</b>
              </>
            ),
            children: [
              {
                id: 'resources',
                icon: <Archive size={18} />,
                label: (
                  <>
                    <TermLink id="cloud-storage">個別リソース</TermLink>
                    <b>manual-docs / manual-rag</b>
                  </>
                ),
              },
              {
                id: 'sa',
                icon: <IdCard size={18} />,
                label: (
                  <>
                    <TermLink id="service-account">サービスアカウント</TermLink>
                    <b>sa-reader（リソース兼 ID）</b>
                  </>
                ),
              },
            ],
          },
          {
            id: 'dev-proj',
            icon: <Cloud size={18} />,
            label: (
              <>
                <TermLink id="resource-hierarchy">プロジェクト</TermLink>
                <b>manual-dev（開発用の別枝）</b>
              </>
            ),
          },
        ],
      },
    ],
  },
];

export function Week0Overview() {
  const [mode, setMode] = useState(0);
  const [selectedNode, setSelectedNode] = useState<SkeletonKey>('sa');
  const [layerIdx, setLayerIdx] = useState(0);

  const activeDetail = SKELETON_DETAILS[selectedNode];
  const activeLayer = GCP_LAYERS[layerIdx];

  return (
    <>
      <div className="diagram-tools">
        <ChoiceGroup label="全体地図の見方" choices={['骨格図', '6領域マップ', '24週計画']} value={mode} onChange={setMode} />
      </div>

      {mode === 0 && (
        <>
          <section className="figure policy-example" aria-label="GCP のリソース階層と2つの別軸">
            <div className="policy-toolbar">
              <div>
                <div>
                  <b>1. リソースの木構造</b>
                  <span className="sub"> 組織 → フォルダ → プロジェクト → 個別リソース</span>
                </div>
              </div>
              <ChoiceGroup
                label="要素の詳細を選ぶ"
                choices={['組織', 'フォルダ', 'プロジェクト', 'SA(二面性)', '組織ポリシー']}
                value={(['org', 'folder', 'project', 'sa', 'org-policy'] as SkeletonKey[]).indexOf(selectedNode)}
                onChange={(i) => setSelectedNode((['org', 'folder', 'project', 'sa', 'org-policy'] as SkeletonKey[])[i])}
              />
            </div>
            <div className="tree-caption">
              <span>Allow ポリシーは上から下へ「足し算」で継承</span>
              <span>クリックして各軸の役割を確認</span>
            </div>
            <ResourceTree
              label="Google Cloud リソース階層"
              items={treeNodes}
              annotation={({ id }) => {
                if (id === 'sa') return <b data-access="direct">リソース兼 ID</b>;
                if (id === 'org') return '全社ガードレール';
                if (id === 'folder') return '部門・環境の束ね';
                if (id === 'project') return '本番（SRE のみ編集）';
                if (id === 'dev-proj') return '開発（別枝で隔離）';
                return '最小権限の付与先';
              }}
            />
            <div style={{ padding: '14px 24px 20px' }}>
              <div className="sl-grid-2">
                <button
                  type="button"
                  className="sl-card-interactive"
                  aria-pressed={selectedNode === 'human'}
                  onClick={() => setSelectedNode('human')}
                >
                  <span className="sl-pill warn">
                    <Users size={13} /> 木の外にいる主体
                  </span>
                  <b>Google アカウント・Google グループ</b>
                  <small>リソースの木には属さず、Cloud Identity で管理。リソース側の IAM から参照する。</small>
                </button>
                <button
                  type="button"
                  className="sl-card-interactive"
                  aria-pressed={selectedNode === 'location'}
                  onClick={() => setSelectedNode('location')}
                >
                  <span className="sl-pill ok">
                    <Globe size={13} /> 物理配置の別軸
                  </span>
                  <b>リージョン → ゾーン（asia-northeast1-a 等）</b>
                  <small>権限の木とは直交する別軸。1 プロジェクト内に東京と米国のリソースを混在できる。</small>
                </button>
              </div>
            </div>
          </section>

          <Insight title={activeDetail.title}>
            <GuidedText text={activeDetail.body} />
          </Insight>

          <Disclosure title="選択中の要素を JSON メモで見る">
            <CodeBlock text={JSON.stringify(activeDetail.json, null, 2)} />
          </Disclosure>

          <h2>全単元に共通する IAM の 3 原則</h2>
          <Comparison
            label="IAM の 3 原則"
            items={[
              {
                id: 'role',
                title: '1. ロールで束ねる',
                data: {
                  rule: '個別権限ではなく事前定義ロールで付与',
                  trap: 'Owner / Editor（基本ロール）の乱用は NG',
                },
              },
              {
                id: 'inherit',
                title: '2. 下へ足し算で継承',
                data: {
                  rule: '上位に弱い権限（閲覧）、下位に強い権限',
                  trap: '子リソースを空にしても親の Allow は消えない',
                },
              },
              {
                id: 'sa',
                title: '3. SA はリソース兼 ID',
                data: {
                  rule: 'アプリ実行主体であり、保護対象でもある',
                  trap: 'デプロイ時の actAs は SA リソース側で判定',
                },
              },
            ]}
            axes={[
              { label: '原則', value: (d) => d.rule },
              { label: '注意点', value: (d) => d.trap },
            ]}
          />
          <Analogy title="IAM と組織ポリシーの違い">
            <Shield size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            IAM は「誰にどの部屋の鍵を渡すか（人の権限）」、組織ポリシーは「たとえ社長でも JSON 合い鍵の複製は禁止する（全社ガードレール）」という役割分担です。
          </Analogy>
        </>
      )}

      {mode === 1 && (
        <>
          <section className="figure sheet" aria-label="Google Cloud 6 領域マップ">
            <div className="sl-layer-grid">
              {GCP_LAYERS.map((layer, idx) => (
                <button
                  key={layer.id}
                  type="button"
                  className="sl-layer-btn"
                  aria-pressed={idx === layerIdx}
                  onClick={() => setLayerIdx(idx)}
                >
                  <Art name={layer.art} />
                  <b>{layer.short}</b>
                  <small>{layer.weeks}</small>
                </button>
              ))}
            </div>
          </section>

          <Insight
            title={activeLayer.label}
            action={
              activeLayer.jumpHash ? (
                <a className="bridge-link" href={activeLayer.jumpHash} style={{ marginTop: 0 }}>
                  {activeLayer.jumpLabel}
                  <ArrowRight size={15} />
                </a>
              ) : undefined
            }
          >
            <GuidedText text={activeLayer.focus} />
          </Insight>

          <Comparison
            label="選択中の領域の概要"
            items={[
              {
                id: activeLayer.id,
                title: activeLayer.short + ' の学習ポイント',
                data: activeLayer,
              },
            ]}
            axes={[
              { label: '試験比重', value: (d) => d.weight },
              { label: '学習週', value: (d) => d.weeks },
              { label: '主要サービス', value: (d) => d.services.join(' / ') },
            ]}
          />
        </>
      )}

      {mode === 2 && (
        <>
          <section className="figure sheet" aria-label="PCA 24 週ロードマップ">
            <div className="sl-roadmap">
              {STAGES.map((st) => (
                <div key={st.num} className="sl-stage-card">
                  <div className="sl-stage-head">
                    <span className="sl-pill ok">{st.num}</span>
                    <small>{st.weeks}</small>
                  </div>
                  <h3>{st.title}</h3>
                  <p className="sub">{st.goal}</p>
                  <div className="sl-stage-list">
                    {st.items.map((item) =>
                      item.href ? (
                        <a key={item.wk} href={item.href} className="sl-week-row">
                          <span>
                            <strong>{item.wk}</strong>　{item.title}
                          </span>
                          <ArrowRight size={15} />
                        </a>
                      ) : (
                        <div key={item.wk} className="sl-week-row">
                          <span>
                            <strong>{item.wk}</strong>　{item.title}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <Analogy title="1 年計画：PCA（前半半年）→ PAA（後半半年）">
            前半 24 週で育てる「社内マニュアル回答アプリ（Cloud Run + Cloud Storage + IAM + 監視）」の土台を、そのまま第16週の AI 運用と後半半年の Professional Agentic Architect（PAA）演習へ再利用します。
          </Analogy>
        </>
      )}
    </>
  );
}
