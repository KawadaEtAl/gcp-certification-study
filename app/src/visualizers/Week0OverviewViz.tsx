import { useEffect, useState } from 'react';
import { ArrowRight, Check, Compass, GitFork, Map } from 'lucide-react';
import type { LessonId, StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type LayerId = 'iam' | 'network' | 'compute' | 'data' | 'ops' | 'ai';
type ViewMode = 'skeleton' | 'map' | 'roadmap';
type SkeletonNodeId =
  | 'org'
  | 'folder'
  | 'project'
  | 'resources'
  | 'sa'
  | 'human'
  | 'location'
  | 'org-policy'
  | 'dept-folder'
  | 'prod-folder'
  | 'dev-folder'
  | 'data-folder';

interface SkeletonNodeInfo {
  id: SkeletonNodeId;
  order: number;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  kvPairs: { label: string; value: string; tone?: 'neutral' | 'allow' | 'deny' | 'warn' | 'info' }[];
  payloadTitle: string;
  sampleJson: Record<string, unknown>;
}

const SKELETON_NODES: Record<SkeletonNodeId, SkeletonNodeInfo> = {
  org: {
    id: 'org',
    order: 1,
    badge: '骨格図 1・リソース階層',
    title: '組織（Organization）',
    subtitle: '会社・ドメインに 1 つだけ存在する、すべての木の根（ルート）',
    explanation:
      'Google Cloud のリソース管理の頂点です。ここに付けた IAM 権限や組織ポリシーは、配下の全フォルダ・全プロジェクトへ自動的に継承されます。個別のアプリ権限はここには付けず、全社共通のガードレール（組織ポリシー）や最小限の管理者設定に留めます。',
    kvPairs: [
      { label: '役割', value: '全社統制・組織ポリシーの起点', tone: 'allow' },
      { label: 'ポリシーの向き', value: '下位の全フォルダ・全プロジェクトへ継承' },
      { label: '設計のコツ', value: '通常の開発者権限は組織レベルに付けない' },
    ],
    payloadTitle: '組織レベルで設定するものの例',
    sampleJson: {
      node: 'organizations/123456789012',
      typicalControls: ['組織ポリシー（SA キー作成禁止・ドメイン制限）', '監査ログの集約シンク'],
      avoidHere: '個別プロジェクトの Editor / Owner 付与',
    },
  },
  folder: {
    id: 'folder',
    order: 2,
    badge: '骨格図 1・リソース階層',
    title: 'フォルダ（Folder）',
    subtitle: '部門・チーム・環境（本番 / 開発）ごとにプロジェクトを束ねる箱',
    explanation:
      'プロジェクトが増えても権限設定がプロジェクト数に比例して増えないようにするための中間階層です。たとえば「広告事業部」フォルダに閲覧者を付けておけば、配下に新プロジェクトが増えても自動で同じ権限が効きます。フォルダは入れ子（部門 → 本番 / 開発）にもできます。',
    kvPairs: [
      { label: '役割', value: '部門・環境単位の権限とルールの束ね', tone: 'allow' },
      { label: '入れ子', value: '最大 10 階層までネスト可能' },
      { label: 'よくある切り方', value: '部門フォルダ → 本番 / 開発フォルダ' },
    ],
    payloadTitle: 'フォルダ設計の基本パターン',
    sampleJson: {
      structure: 'Organization -> 部門フォルダ -> 環境フォルダ(本番/開発) -> Project',
      benefit: 'プロジェクト追加時に同じ IAM 設定を繰り返さずに済む',
      principle: '上位フォルダには弱い権限（閲覧）、下位フォルダに強い権限（編集）',
    },
  },
  project: {
    id: 'project',
    order: 3,
    badge: '骨格図 1・リソース階層',
    title: 'プロジェクト（Project）',
    subtitle: '課金・API 有効化・個別リソース作成の基本単位',
    explanation:
      'GCS バケットも Cloud Run サービスも、必ずどれか 1 つのプロジェクトの中に生まれます。課金アカウントの紐付け、利用する API の有効化、クォータの上限管理、そしてデフォルトの隔離境界はすべてプロジェクト単位です。本番と開発は必ず別プロジェクトに分けます。',
    kvPairs: [
      { label: '役割', value: '課金・API 有効化・リソースの入れ物', tone: 'allow' },
      { label: '必須ルール', value: 'すべてのリソースは必ず 1 プロジェクトに属する' },
      { label: '本番と開発', value: '事故防止のため別プロジェクトへ分離する' },
    ],
    payloadTitle: 'プロジェクトが持つ主な境界',
    sampleJson: {
      project: 'ads-rag-prod',
      boundaries: ['課金先（Billing Account 紐付け）', '有効化する Google Cloud API', 'リソース間のデフォルト隔離'],
    },
  },
  resources: {
    id: 'resources',
    order: 4,
    badge: '骨格図 1・個別リソース',
    title: '個別リソース（GCS バケット / Cloud Run など）',
    subtitle: 'プロジェクトの中に作られる、実際のアプリやデータの入れ物',
    explanation:
      'Cloud Storage バケットや Cloud Run サービスなどの実体です。IAM ポリシーはプロジェクト全体ではなく、こうした個別リソース単位にも付けられます。「特定の 1 バケットだけ読み取り許可（roles/storage.objectViewer）」のように範囲を絞るのが最小権限の基本です。',
    kvPairs: [
      { label: '所属先', value: '必ず 1 つのプロジェクト配下' },
      { label: '最小権限の単位', value: 'プロジェクト全体ではなくリソース単体に絞れる', tone: 'info' },
      { label: '具体例', value: 'GCS バケット / Cloud Run / Secret / BigQuery データセット' },
    ],
    payloadTitle: '個別リソース単位の最小権限の例',
    sampleJson: {
      resource: 'gs://manual-docs',
      binding: {
        role: 'roles/storage.objectViewer',
        member: 'serviceAccount:manual-api-sa@example.iam.gserviceaccount.com',
      },
      why: 'プロジェクト内の他バケットへ権限を広げないため',
    },
  },
  sa: {
    id: 'sa',
    order: 5,
    badge: '骨格図 1・二面性の重要ポイント',
    title: 'サービスアカウント（リソース兼 ID）',
    subtitle: 'プロジェクトに属する「リソース」でありつつ、操作する「プリンシパル（ID）」でもある',
    explanation:
      'サービスアカウント（SA）は GCP の中で唯一「リソース」と「プリンシパル」の 2 つの顔を持ちます。① アプリや CI が GCS 等を操作するときの名札（プリンシパル）として働き、② プロジェクトの中に作られるリソースでもあるため、SA 自体に IAM ポリシー（誰がこの SA を使ってよいか＝actAs）を付けられます。',
    kvPairs: [
      { label: '顔 1（プリンシパル）', value: 'Cloud Run や CI が他リソースを操作する際の ID', tone: 'deny' },
      { label: '顔 2（リソース）', value: 'プロジェクト配下に属し、SA 自体にも権限設定できる', tone: 'info' },
      { label: 'なぜ重要か', value: 'デプロイ時の actAs チェックは SA リソース側で評価される' },
    ],
    payloadTitle: 'サービスアカウントの二面性',
    sampleJson: {
      serviceAccount: 'manual-api-sa@ads-rag-prod.iam.gserviceaccount.com',
      asPrincipal: 'Cloud Run から GCS バケットを読む主体',
      asResource: 'デプロイ担当者に roles/iam.serviceAccountUser (actAs) を付ける対象',
    },
  },
  human: {
    id: 'human',
    order: 6,
    badge: '骨格図 1・木の外のプリンシパル',
    title: 'Google アカウント・Google グループ（木の外）',
    subtitle: 'リソースの木には属さず、Cloud Identity / Google Workspace で管理される人間の ID',
    explanation:
      '人間（開発者や SRE）のアカウントや Google グループは、プロジェクトやフォルダの「中」にはありません。木の外にある Cloud Identity 側で管理され、必要に応じて組織・フォルダ・プロジェクト・個別リソースの IAM ポリシーから「名前を呼ばれる（紐付けられる）」関係です。実務では個人ではなくグループ単位で権限を付けます。',
    kvPairs: [
      { label: '管理場所', value: '木の外（Cloud Identity / Google Workspace）', tone: 'deny' },
      { label: '権限の付け方', value: 'リソース側の IAM ポリシーから参照する' },
      { label: '運用ベストプラクティス', value: '個人アカウント直付けを避け、Google グループに付与' },
    ],
    payloadTitle: '人間の ID とリソースの関係',
    sampleJson: {
      principal: 'group:ads-developers@example.com',
      livesOutsideResourceTree: true,
      attachedTo: 'folders/dev-folder (roles/editor など必要なロール)',
    },
  },
  location: {
    id: 'location',
    order: 7,
    badge: '骨格図 1・物理配置（別軸）',
    title: '物理配置：リージョンとゾーン（権限の木とは別の軸）',
    subtitle: '組織→プロジェクトは「管理と権限の軸」、リージョン→ゾーンは「物理的な置き場所の軸」',
    explanation:
      '混同しやすいポイントですが、リソース階層（組織→フォルダ→プロジェクト）と物理配置（リージョン→ゾーン）は完全に別の軸です。たとえば 1 つのプロジェクトの中に、東京リージョン（asia-northeast1）の Cloud Run と米国マルチリージョンの GCS バケットを混在配置できます。',
    kvPairs: [
      { label: '管理・権限・課金の軸', value: '組織 → フォルダ → プロジェクト → リソース' },
      { label: '物理配置の軸', value: 'マルチリージョン / リージョン（例: 東京）→ ゾーン（-a/-b/-c）', tone: 'info' },
      { label: '試験での使い分け', value: 'データ所在地・レイテンシ・災害耐性（DR）は物理配置の軸で設計' },
    ],
    payloadTitle: '2 つの直交する軸',
    sampleJson: {
      governanceAxis: 'Organization -> Folder -> Project -> Resource',
      physicalAxis: 'Region (asia-northeast1) -> Zone (asia-northeast1-a / b / c)',
      keyFact: '1 プロジェクト内に複数リージョンのリソースを混在できる',
    },
  },
  'org-policy': {
    id: 'org-policy',
    order: 8,
    badge: '骨格図 2・組織ポリシー（ガードレール）',
    title: '組織ポリシー（Organization Policy）',
    subtitle: '「誰が」ではなく「この配下で何を禁止・制限するか」を決める全社ルール',
    explanation:
      'IAM が「誰に何の操作を許すか（人の権限）」を決めるのに対し、組織ポリシーは「たとえ Owner 権限を持っていても、SA の静的 JSON キー発行や外部公開を禁止する」といったガードレール（設定制約）をリソース階層全体へ強制します。',
    kvPairs: [
      { label: 'IAM との違い', value: 'IAM＝誰に許すか / 組織ポリシー＝全体の禁止・制限ルール', tone: 'warn' },
      { label: '代表例', value: 'iam.disableServiceAccountKeyCreation（JSON キー発行禁止）' },
      { label: '継承のしかた', value: '組織から配下の全フォルダ・全プロジェクトへ強制' },
    ],
    payloadTitle: '代表的な組織ポリシー制約',
    sampleJson: {
      constraint: 'constraints/iam.disableServiceAccountKeyCreation',
      enforcedAt: 'organizations/123456789012',
      effect: '配下の全プロジェクトで静的 JSON キーの作成をブロック（権限があっても作れない）',
    },
  },
  'dept-folder': {
    id: 'dept-folder',
    order: 9,
    badge: '骨格図 2・上位フォルダの継承',
    title: 'フォルダ：広告事業部（上位に弱い権限）',
    subtitle: 'ここに付けた「広告チーム：閲覧者」は本番・開発の両方へ自動継承される',
    explanation:
      '「広告事業部」フォルダに閲覧者ロールを 1 回付けておけば、配下の本番・開発だけでなく、来月 ads-rag-staging を新設しても最初から閲覧できます。上位には「配下すべてに共通して許してよい弱い権限（閲覧など）」だけを置くのが鉄則です。',
    kvPairs: [
      { label: '付与ポリシー', value: '広告チーム：閲覧者（Viewer）', tone: 'info' },
      { label: '継承先', value: '本番フォルダ（ads-rag-prod）と開発フォルダ（ads-rag-dev）の両方' },
      { label: '注意点', value: '親で付けた Allow は子で取り消せない（足し算のみ）', tone: 'warn' },
    ],
    payloadTitle: '上位フォルダのポリシー例',
    sampleJson: {
      folder: '広告事業部',
      iamBinding: 'group:ads-team@example.com -> roles/viewer',
      inheritedBy: ['ads-rag-prod', 'ads-rag-dev', '将来追加される staging 等'],
    },
  },
  'prod-folder': {
    id: 'prod-folder',
    order: 10,
    badge: '骨格図 2・本番環境の絞り込み',
    title: 'フォルダ：本番 → ads-rag-prod',
    subtitle: '親からの閲覧権限に「SRE のみ：編集者」が足し算される',
    explanation:
      '本番フォルダでは変更権限を SRE だけに絞ります。ads-rag-prod で最終的に有効になる権限は、親（広告事業部）から継承した「広告チーム＝閲覧者」と、本番フォルダの「SRE＝編集者」を足し合わせた結果になります。開発者は閲覧できても本番を変更できません。',
    kvPairs: [
      { label: '本番の追加権限', value: 'SRE のみ：編集者（実際は必要な事前定義ロールに絞る）', tone: 'info' },
      { label: '最終的な有効権限', value: '広告チーム（閲覧）＋ SRE（編集）', tone: 'allow' },
      { label: '開発者の扱い', value: '開発フォルダの編集権限は別枝なので本番には届かない' },
    ],
    payloadTitle: 'ads-rag-prod の有効権限（和集合）',
    sampleJson: {
      project: 'ads-rag-prod',
      effectivePermissions: ['広告チーム: 閲覧（親フォルダから継承）', 'SRE: 編集（本番フォルダから継承）'],
      orgPolicyGuardrail: 'SA キー作成禁止（組織から強制）',
    },
  },
  'dev-folder': {
    id: 'dev-folder',
    order: 11,
    badge: '骨格図 2・開発環境の自由度',
    title: 'フォルダ：開発 → ads-rag-dev',
    subtitle: '開発フォルダ配下だけ開発者に編集権限を足し算する',
    explanation:
      '開発環境ではスピード重視で開発者グループに編集権限を付けます。フォルダを本番と別枝に分けてあるため、開発フォルダで広げた権限が本番（ads-rag-prod）に漏れ出すことはありません。',
    kvPairs: [
      { label: '開発の追加権限', value: '開発者：編集者', tone: 'info' },
      { label: '最終的な有効権限', value: '広告チーム（閲覧）＋ 開発者（編集）', tone: 'allow' },
      { label: '隔離の効果', value: '本番フォルダとは兄弟関係なので権限は交わらない' },
    ],
    payloadTitle: 'ads-rag-dev の有効権限（和集合）',
    sampleJson: {
      project: 'ads-rag-dev',
      effectivePermissions: ['広告チーム: 閲覧（親フォルダから継承）', '開発者: 編集（開発フォルダから継承）'],
      isolatedFrom: 'フォルダ：本番（ads-rag-prod）',
    },
  },
  'data-folder': {
    id: 'data-folder',
    order: 12,
    badge: '骨格図 2・別部門の隔離',
    title: 'フォルダ：データ基盤部（別枝の隔離）',
    subtitle: 'IAM の継承は「親から子」へ縦にしか流れないため、隣部門の権限は一切届かない',
    explanation:
      '広告事業部フォルダに付けた権限は、兄弟フォルダである「データ基盤部」には一切影響しません。ただし、さらに上位の「組織」に付けた組織ポリシー（例：SA キー作成禁止）は全部門へ共通で効きます。',
    kvPairs: [
      { label: '広告事業部からの影響', value: 'なし（横方向には継承されない）', tone: 'allow' },
      { label: '組織からの影響', value: '全社共通の組織ポリシーはここにも効く', tone: 'warn' },
    ],
    payloadTitle: '兄弟フォルダの独立性',
    sampleJson: {
      folder: 'データ基盤部',
      inheritsFrom: ['組織（全社ガードレール）'],
      doesNotInheritFrom: ['フォルダ：広告事業部'],
    },
  },
};

const IAM_PRINCIPLES = [
  {
    num: '1',
    title: 'パーミッションは直接付けず「ロール」で束ねる',
    detail:
      'storage.objects.get のような細かい権限を 1 つずつ付けるのではなく、roles/storage.objectViewer のように用途別に束ねたロール単位で付与します。',
  },
  {
    num: '2',
    title: 'ポリシーはリソース側に付き、下へ「足し算」で継承される',
    detail:
      '親（組織・フォルダ）で付けた Allow は子で打ち消せません。だから上位に弱い権限（閲覧）・下位に強い権限（編集）を置くのが鉄則です。',
  },
  {
    num: '3',
    title: 'サービスアカウント（SA）は「リソース」兼「プリンシパル（ID）」',
    detail:
      'プロジェクトに属する箱でありながら、アプリが他リソースを操作するときの主体にもなります。だから SA 自体にも「誰がこの SA を使ってよいか（actAs）」を設定できます。',
  },
];

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
    jumpLessonId: 'w02-p0',
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
      { wk: 'W02', title: 'Cloud Run サービス/ジョブ・リビジョン・スケール・Artifact Registry', active: true, jumpId: 'w02-p0' as LessonId },
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
  const [viewMode, setViewMode] = useState<ViewMode>('skeleton');
  const [activeNodeId, setActiveNodeId] = useState<SkeletonNodeId>('sa');
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeLayer = LAYERS[activeIdx];
  const activeSkeletonNode = SKELETON_NODES[activeNodeId];

  useEffect(() => {
    if (!isPlaying || viewMode !== 'map') return;
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
  }, [isPlaying, viewMode]);

  useEffect(() => {
    if (viewMode === 'skeleton') {
      onStepInsightChange({
        stepNumber: activeSkeletonNode.order,
        totalSteps: Object.keys(SKELETON_NODES).length,
        badge: activeSkeletonNode.badge,
        title: activeSkeletonNode.title,
        subtitle: activeSkeletonNode.subtitle,
        explanation: activeSkeletonNode.explanation,
        kvPairs: activeSkeletonNode.kvPairs,
        payloadTitle: activeSkeletonNode.payloadTitle,
        payloadJson: JSON.stringify(activeSkeletonNode.sampleJson, null, 2),
      });
      return;
    }

    onStepInsightChange({
      stepNumber: activeLayer.order,
      totalSteps: LAYERS.length,
      badge: `GCP 6領域マップ・${activeLayer.shortLabel}`,
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
  }, [viewMode, activeSkeletonNode, activeLayer, onStepInsightChange]);

  const nodeStroke = (id: SkeletonNodeId, baseStroke: string, activeStroke: string) =>
    activeNodeId === id ? activeStroke : baseStroke;
  const nodeWidth = (id: SkeletonNodeId) => (activeNodeId === id ? 2.4 : 1.3);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="segmented" role="group" aria-label="全体像の表示切替">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'skeleton'}
              onClick={() => {
                setIsPlaying(false);
                setViewMode('skeleton');
              }}
            >
              <GitFork size={14} aria-hidden="true" />
              骨格図
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              <Map size={14} aria-hidden="true" />
              6領域マップ
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'roadmap'}
              onClick={() => {
                setIsPlaying(false);
                setViewMode('roadmap');
              }}
            >
              <Compass size={14} aria-hidden="true" />
              24週計画
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

          {viewMode === 'skeleton' && (
            <span className="skeleton-hint">各ボックスをタップするとインスペクタに要点が表示されます</span>
          )}
        </div>

        {viewMode === 'skeleton' ? (
          <div className="skeleton-stack">
            {/* Static Skeleton Diagram 1: Resource Tree vs Principals Outside + Physical Axis */}
            <section className="skeleton-section">
              <div className="skeleton-section-head">
                <span className="skeleton-num-badge">1</span>
                <div>
                  <h2 className="skeleton-section-title">リソースの木構造 vs 木の外のプリンシパル（＋物理配置の別軸）</h2>
                  <p className="skeleton-section-sub">
                    GCP は「リソースの木」と「木の外にいる人間（プリンシパル）」、そして「物理的な置き場所（リージョン／ゾーン）」の 3 つに分けて捉えると全体が一気に整理できます。
                  </p>
                </div>
              </div>

              <div className="blueprint-stage skeleton-stage">
                {isMobile ? (
                  <svg
                    className="blueprint-svg"
                    viewBox="0 0 380 572"
                    role="img"
                    aria-label="GCP リソースの木構造と木の外のプリンシパル、物理配置の別軸（モバイル）"
                  >
                    <title>GCP リソースの木構造 vs プリンシパル ＋ 物理配置（別軸）</title>
                    <defs>
                      <marker id="sk1-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 1l8 4-8 4z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Organization */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('org')}>
                      <rect
                        x="12"
                        y="10"
                        width="356"
                        height="52"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('org', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('org')}
                      />
                      <text x="190" y="32" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#0d652d">
                        組織（Organization）
                      </text>
                      <text x="190" y="51" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                        会社に 1 つ、木の根
                      </text>
                    </g>

                    {/* Org -> Folder */}
                    <path d="M 28 62 L 28 98 L 40 98" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk1-arr-m)" />

                    {/* Folder */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('folder')}>
                      <rect
                        x="44"
                        y="72"
                        width="324"
                        height="52"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('folder')}
                      />
                      <text x="206" y="94" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#0d652d">
                        フォルダ（Folder）
                      </text>
                      <text x="206" y="113" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                        部門・環境（本番 / 開発）単位の箱
                      </text>
                    </g>

                    {/* Folder -> Project */}
                    <path d="M 60 124 L 60 160 L 72 160" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk1-arr-m)" />

                    {/* Project */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('project')}>
                      <rect
                        x="76"
                        y="134"
                        width="292"
                        height="52"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('project', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('project')}
                      />
                      <text x="222" y="156" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#0d652d">
                        プロジェクト（Project）
                      </text>
                      <text x="222" y="175" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                        課金と API 有効化の単位
                      </text>
                    </g>

                    {/* Project -> 3 child resources */}
                    <path d="M 92 186 L 92 318" fill="none" stroke="#64748b" strokeWidth="1.6" />
                    <path d="M 92 214 L 104 214" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk1-arr-m)" />
                    <path d="M 92 264 L 104 264" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk1-arr-m)" />
                    <path d="M 92 318 L 104 318" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk1-arr-m)" />

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('resources')}>
                      <rect
                        x="108"
                        y="194"
                        width="260"
                        height="40"
                        rx="9"
                        fill="#f1f3f4"
                        stroke={nodeStroke('resources', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('resources')}
                      />
                      <text x="122" y="219" fontSize="13.5" fontWeight="650" fill="#202124">
                        GCS バケット
                      </text>
                      <text x="354" y="219" textAnchor="end" fontSize="12" fill="#5f6368">
                        ファイル置き場
                      </text>
                    </g>

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('resources')}>
                      <rect
                        x="108"
                        y="244"
                        width="260"
                        height="40"
                        rx="9"
                        fill="#f1f3f4"
                        stroke={nodeStroke('resources', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('resources')}
                      />
                      <text x="122" y="269" fontSize="13.5" fontWeight="650" fill="#202124">
                        Cloud Run
                      </text>
                      <text x="354" y="269" textAnchor="end" fontSize="12" fill="#5f6368">
                        コンテナ実行
                      </text>
                    </g>

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('sa')}>
                      <rect
                        x="108"
                        y="296"
                        width="260"
                        height="44"
                        rx="9"
                        fill="#fce8e6"
                        stroke={nodeStroke('sa', '#f28b82', '#c5221f')}
                        strokeWidth={nodeWidth('sa')}
                      />
                      <text x="122" y="323" fontSize="13.5" fontWeight="700" fill="#a50e0e">
                        サービスアカウント
                      </text>
                      <text x="354" y="323" textAnchor="end" fontSize="12" fontWeight="650" fill="#c5221f">
                        リソース兼 ID
                      </text>
                    </g>

                    {/* Boundary line: Outside of tree */}
                    <line x1="12" y1="356" x2="368" y2="356" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 5" />

                    {/* Human Principals outside the tree */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('human')}>
                      <rect
                        x="12"
                        y="368"
                        width="356"
                        height="52"
                        rx="10"
                        fill="#fce8e6"
                        stroke={nodeStroke('human', '#f28b82', '#c5221f')}
                        strokeWidth={nodeWidth('human')}
                      />
                      <text x="190" y="390" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#a50e0e">
                        Google アカウント・グループ
                      </text>
                      <text x="190" y="409" textAnchor="middle" fontSize="12.5" fill="#7f1d1d">
                        木の外（Cloud Identity）で管理される人間の ID
                      </text>
                    </g>

                    {/* Orthogonal Physical Axis */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('location')}>
                      <rect
                        x="12"
                        y="434"
                        width="356"
                        height="90"
                        rx="10"
                        fill="#f0f6ff"
                        stroke={nodeStroke('location', '#8ab4f8', '#0b57d0')}
                        strokeWidth={nodeWidth('location')}
                        strokeDasharray={activeNodeId === 'location' ? undefined : '6 4'}
                      />
                      <text x="26" y="458" fontSize="13.5" fontWeight="700" fill="#0b57d0">
                        物理配置（別の軸）：リージョン → ゾーン
                      </text>
                      <text x="26" y="481" fontSize="12.5" fill="#1f1f1f">
                        例：asia-northeast1（東京）→ -a / -b / -c
                      </text>
                      <text x="26" y="505" fontSize="12" fill="#444746">
                        権限の木とは独立。1 プロジェクトに複数リージョン混在可
                      </text>
                    </g>

                    {/* Legend */}
                    <rect x="12" y="538" width="12" height="12" rx="3" fill="#e6f4ea" stroke="#81c995" />
                    <text x="29" y="548" fontSize="11.5" fill="#444746">リソース階層</text>
                    <rect x="112" y="538" width="12" height="12" rx="3" fill="#f1f3f4" stroke="#bdc1c6" />
                    <text x="129" y="548" fontSize="11.5" fill="#444746">個別リソース</text>
                    <rect x="212" y="538" width="12" height="12" rx="3" fill="#fce8e6" stroke="#f28b82" />
                    <text x="229" y="548" fontSize="11.5" fill="#444746">プリンシパル</text>
                    <rect x="12" y="556" width="12" height="12" rx="3" fill="#f0f6ff" stroke="#8ab4f8" />
                    <text x="29" y="566" fontSize="11.5" fill="#444746">物理配置（別軸）｜ 矢印＝親子関係（許可は下へ継承）</text>
                  </svg>
                ) : (
                  <svg
                    className="blueprint-svg"
                    viewBox="0 0 820 442"
                    role="img"
                    aria-label="GCP リソースの木構造と木の外のプリンシパル、物理配置の別軸"
                  >
                    <title>GCP リソースの木構造 vs プリンシパル ＋ 物理配置（別軸）</title>
                    <defs>
                      <marker id="sk1-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 1l8 4-8 4z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Organization */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('org')}>
                      <rect
                        x="18"
                        y="14"
                        width="558"
                        height="58"
                        rx="11"
                        fill="#e6f4ea"
                        stroke={nodeStroke('org', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('org')}
                      />
                      <text x="297" y="38" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#0d652d">
                        組織（Organization）
                      </text>
                      <text x="297" y="58" textAnchor="middle" fontSize="13" fill="#1e4620">
                        会社に 1 つ、木の根
                      </text>
                    </g>

                    {/* Org -> Folder */}
                    <path d="M 40 72 L 40 115 L 56 115" fill="none" stroke="#64748b" strokeWidth="1.7" markerEnd="url(#sk1-arr)" />

                    {/* Folder */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('folder')}>
                      <rect
                        x="60"
                        y="86"
                        width="516"
                        height="58"
                        rx="11"
                        fill="#e6f4ea"
                        stroke={nodeStroke('folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('folder')}
                      />
                      <text x="318" y="110" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#0d652d">
                        フォルダ（Folder）
                      </text>
                      <text x="318" y="130" textAnchor="middle" fontSize="13" fill="#1e4620">
                        部門・チーム・環境（本番 / 開発）単位の箱
                      </text>
                    </g>

                    {/* Folder -> Project */}
                    <path d="M 82 144 L 82 187 L 98 187" fill="none" stroke="#64748b" strokeWidth="1.7" markerEnd="url(#sk1-arr)" />

                    {/* Project */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('project')}>
                      <rect
                        x="102"
                        y="158"
                        width="474"
                        height="58"
                        rx="11"
                        fill="#e6f4ea"
                        stroke={nodeStroke('project', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('project')}
                      />
                      <text x="339" y="182" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#0d652d">
                        プロジェクト（Project）
                      </text>
                      <text x="339" y="202" textAnchor="middle" fontSize="13" fill="#1e4620">
                        課金と API 有効化の単位
                      </text>
                    </g>

                    {/* Project -> 3 child resources */}
                    <path d="M 339 216 L 339 233" fill="none" stroke="#64748b" strokeWidth="1.7" />
                    <path d="M 176 233 L 502 233" fill="none" stroke="#64748b" strokeWidth="1.7" />
                    <path d="M 176 233 L 176 248" fill="none" stroke="#64748b" strokeWidth="1.7" markerEnd="url(#sk1-arr)" />
                    <path d="M 339 233 L 339 248" fill="none" stroke="#64748b" strokeWidth="1.7" markerEnd="url(#sk1-arr)" />
                    <path d="M 502 233 L 502 248" fill="none" stroke="#64748b" strokeWidth="1.7" markerEnd="url(#sk1-arr)" />

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('resources')}>
                      <rect
                        x="102"
                        y="252"
                        width="148"
                        height="60"
                        rx="10"
                        fill="#f1f3f4"
                        stroke={nodeStroke('resources', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('resources')}
                      />
                      <text x="176" y="278" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#202124">
                        GCS バケット
                      </text>
                      <text x="176" y="298" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                        ファイル置き場
                      </text>
                    </g>

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('resources')}>
                      <rect
                        x="265"
                        y="252"
                        width="148"
                        height="60"
                        rx="10"
                        fill="#f1f3f4"
                        stroke={nodeStroke('resources', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('resources')}
                      />
                      <text x="339" y="278" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#202124">
                        Cloud Run
                      </text>
                      <text x="339" y="298" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                        コンテナ実行
                      </text>
                    </g>

                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('sa')}>
                      <rect
                        x="428"
                        y="252"
                        width="148"
                        height="60"
                        rx="10"
                        fill="#fce8e6"
                        stroke={nodeStroke('sa', '#f28b82', '#c5221f')}
                        strokeWidth={nodeWidth('sa')}
                      />
                      <text x="502" y="278" textAnchor="middle" fontSize="14" fontWeight="700" fill="#a50e0e">
                        サービスアカウント
                      </text>
                      <text x="502" y="298" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#c5221f">
                        リソース兼 ID
                      </text>
                    </g>

                    {/* Boundary between tree and outside */}
                    <line x1="18" y1="330" x2="576" y2="330" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 5" />

                    {/* Human Principals outside the tree */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('human')}>
                      <rect
                        x="18"
                        y="344"
                        width="558"
                        height="58"
                        rx="11"
                        fill="#fce8e6"
                        stroke={nodeStroke('human', '#f28b82', '#c5221f')}
                        strokeWidth={nodeWidth('human')}
                      />
                      <text x="297" y="368" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#a50e0e">
                        Google アカウント・グループ
                      </text>
                      <text x="297" y="388" textAnchor="middle" fontSize="13" fill="#7f1d1d">
                        木の外（Cloud Identity）で管理される人間の ID
                      </text>
                    </g>

                    {/* Orthogonal Physical Axis Column (Right side, >= 24px right margin) */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('location')}>
                      <rect
                        x="598"
                        y="14"
                        width="198"
                        height="388"
                        rx="12"
                        fill="#f0f6ff"
                        stroke={nodeStroke('location', '#8ab4f8', '#0b57d0')}
                        strokeWidth={nodeWidth('location')}
                        strokeDasharray={activeNodeId === 'location' ? undefined : '6 4'}
                      />
                      <text x="697" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0b57d0">
                        物理配置（別の軸）
                      </text>
                      <text x="697" y="64" textAnchor="middle" fontSize="12.5" fill="#444746">
                        権限の木とは独立した軸
                      </text>

                      <rect x="614" y="82" width="166" height="54" rx="9" fill="#ffffff" stroke="#8ab4f8" strokeWidth="1.3" />
                      <text x="697" y="104" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#174ea6">
                        マルチリージョン
                      </text>
                      <text x="697" y="124" textAnchor="middle" fontSize="12" fill="#444746">
                        asia / us など広域
                      </text>

                      <path d="M 697 136 L 697 154" fill="none" stroke="#1a73e8" strokeWidth="1.6" markerEnd="url(#sk1-arr)" />

                      <rect x="614" y="158" width="166" height="58" rx="9" fill="#ffffff" stroke="#8ab4f8" strokeWidth="1.3" />
                      <text x="697" y="182" textAnchor="middle" fontSize="14" fontWeight="700" fill="#174ea6">
                        リージョン
                      </text>
                      <text x="697" y="203" textAnchor="middle" fontSize="12" fill="#444746">
                        asia-northeast1（東京）
                      </text>

                      <path d="M 697 216 L 697 234" fill="none" stroke="#1a73e8" strokeWidth="1.6" markerEnd="url(#sk1-arr)" />

                      <rect x="614" y="238" width="166" height="58" rx="9" fill="#ffffff" stroke="#8ab4f8" strokeWidth="1.3" />
                      <text x="697" y="262" textAnchor="middle" fontSize="14" fontWeight="700" fill="#174ea6">
                        ゾーン
                      </text>
                      <text x="697" y="283" textAnchor="middle" fontSize="12" fill="#444746">
                        -a / -b / -c（データセンタ）
                      </text>

                      <text x="697" y="328" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#174ea6">
                        1 プロジェクトの中に
                      </text>
                      <text x="697" y="349" textAnchor="middle" fontSize="12.5" fill="#444746">
                        東京と米国リソースを
                      </text>
                      <text x="697" y="370" textAnchor="middle" fontSize="12.5" fill="#444746">
                        混在配置できる
                      </text>
                    </g>

                    {/* Legend */}
                    <rect x="18" y="418" width="13" height="13" rx="3" fill="#e6f4ea" stroke="#81c995" />
                    <text x="37" y="429" fontSize="12.5" fill="#444746">リソース階層</text>
                    <rect x="126" y="418" width="13" height="13" rx="3" fill="#f1f3f4" stroke="#bdc1c6" />
                    <text x="145" y="429" fontSize="12.5" fill="#444746">個別リソース</text>
                    <rect x="236" y="418" width="13" height="13" rx="3" fill="#fce8e6" stroke="#f28b82" />
                    <text x="255" y="429" fontSize="12.5" fill="#444746">プリンシパル（操作する側）</text>
                    <rect x="424" y="418" width="13" height="13" rx="3" fill="#f0f6ff" stroke="#8ab4f8" />
                    <text x="443" y="429" fontSize="12.5" fill="#444746">物理配置（別軸）｜ 矢印＝親子関係・許可は下へ継承</text>
                  </svg>
                )}
              </div>
            </section>

            {/* Static Skeleton Diagram 2: Folder & Policy Inheritance Practical Example */}
            <section className="skeleton-section">
              <div className="skeleton-section-head">
                <span className="skeleton-num-badge">2</span>
                <div>
                  <h2 className="skeleton-section-title">フォルダ運用とポリシー継承の実例（IAM 許可 vs 組織ポリシー）</h2>
                  <p className="skeleton-section-sub">
                    部門と環境（本番・開発）でフォルダを切る定番構成。上位には弱い権限（閲覧）、下位に強い権限（編集）を足し算し、全社禁止ルールは組織ポリシーで強制します。
                  </p>
                </div>
              </div>

              <div className="blueprint-stage skeleton-stage">
                {isMobile ? (
                  <svg
                    className="blueprint-svg"
                    viewBox="0 0 380 468"
                    role="img"
                    aria-label="フォルダ運用とポリシー継承の実例（モバイル）"
                  >
                    <title>フォルダとポリシー継承・組織ポリシーの実例</title>
                    <defs>
                      <marker id="sk2-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 1l8 4-8 4z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Tree lines */}
                    <path d="M 22 60 L 22 385" fill="none" stroke="#64748b" strokeWidth="1.5" />
                    <path d="M 22 97 L 30 97" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />
                    <path d="M 22 385 L 30 385" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />

                    <path d="M 42 122 L 42 273" fill="none" stroke="#64748b" strokeWidth="1.5" />
                    <path d="M 42 159 L 50 159" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />
                    <path d="M 42 273 L 50 273" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />

                    <path d="M 62 184 L 62 213 L 70 213" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />
                    <path d="M 62 298 L 62 327 L 70 327" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#sk2-arr-m)" />

                    {/* Row 1: Org + Org Policy */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('org-policy')}>
                      <rect
                        x="12"
                        y="10"
                        width="204"
                        height="50"
                        rx="9"
                        fill="#e6f4ea"
                        stroke={nodeStroke('org-policy', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('org-policy')}
                      />
                      <text x="114" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                        組織
                      </text>
                      <rect
                        x="224"
                        y="10"
                        width="144"
                        height="50"
                        rx="9"
                        fill="#fef7e0"
                        stroke={nodeStroke('org-policy', '#f59e0b', '#b06000')}
                        strokeWidth={nodeWidth('org-policy')}
                      />
                      <text x="296" y="30" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#92400e">
                        組織ポリシー
                      </text>
                      <text x="296" y="48" textAnchor="middle" fontSize="12" fontWeight="650" fill="#78350f">
                        SA キー作成禁止
                      </text>
                    </g>

                    {/* Row 2: Dept Folder + Viewer */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('dept-folder')}>
                      <rect
                        x="32"
                        y="72"
                        width="184"
                        height="50"
                        rx="9"
                        fill="#e6f4ea"
                        stroke={nodeStroke('dept-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('dept-folder')}
                      />
                      <text x="124" y="102" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#0d652d">
                        フォルダ：広告事業部
                      </text>
                      <rect
                        x="224"
                        y="72"
                        width="144"
                        height="50"
                        rx="9"
                        fill="#ede9fe"
                        stroke={nodeStroke('dept-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('dept-folder')}
                      />
                      <text x="296" y="92" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#5b21b6">
                        IAM 許可
                      </text>
                      <text x="296" y="110" textAnchor="middle" fontSize="12" fontWeight="650" fill="#4c1d95">
                        広告チーム：閲覧者
                      </text>
                    </g>

                    {/* Row 3: Prod Folder + SRE */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('prod-folder')}>
                      <rect
                        x="52"
                        y="134"
                        width="164"
                        height="50"
                        rx="9"
                        fill="#e6f4ea"
                        stroke={nodeStroke('prod-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="134" y="164" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#0d652d">
                        フォルダ：本番
                      </text>
                      <rect
                        x="224"
                        y="134"
                        width="144"
                        height="50"
                        rx="9"
                        fill="#ede9fe"
                        stroke={nodeStroke('prod-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="296" y="154" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#5b21b6">
                        IAM 許可
                      </text>
                      <text x="296" y="172" textAnchor="middle" fontSize="12" fontWeight="650" fill="#4c1d95">
                        SRE のみ：編集者
                      </text>

                      {/* Row 4: ads-rag-prod */}
                      <rect
                        x="72"
                        y="192"
                        width="144"
                        height="42"
                        rx="9"
                        fill="#f1f3f4"
                        stroke={nodeStroke('prod-folder', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="144" y="218" textAnchor="middle" fontSize="13" fontWeight="650" fill="#202124">
                        ads-rag-prod
                      </text>
                      <text x="228" y="209" fontSize="11.5" fill="#5f6368">
                        継承：広告=閲覧
                      </text>
                      <text x="228" y="226" fontSize="11.5" fill="#5f6368">
                        ＋ SRE=編集
                      </text>
                    </g>

                    {/* Row 5: Dev Folder + Devs */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('dev-folder')}>
                      <rect
                        x="52"
                        y="248"
                        width="164"
                        height="50"
                        rx="9"
                        fill="#e6f4ea"
                        stroke={nodeStroke('dev-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="134" y="278" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#0d652d">
                        フォルダ：開発
                      </text>
                      <rect
                        x="224"
                        y="248"
                        width="144"
                        height="50"
                        rx="9"
                        fill="#ede9fe"
                        stroke={nodeStroke('dev-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="296" y="268" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#5b21b6">
                        IAM 許可
                      </text>
                      <text x="296" y="286" textAnchor="middle" fontSize="12" fontWeight="650" fill="#4c1d95">
                        開発者：編集者
                      </text>

                      {/* Row 6: ads-rag-dev */}
                      <rect
                        x="72"
                        y="306"
                        width="144"
                        height="42"
                        rx="9"
                        fill="#f1f3f4"
                        stroke={nodeStroke('dev-folder', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="144" y="332" textAnchor="middle" fontSize="13" fontWeight="650" fill="#202124">
                        ads-rag-dev
                      </text>
                      <text x="228" y="323" fontSize="11.5" fill="#5f6368">
                        継承：広告=閲覧
                      </text>
                      <text x="228" y="340" fontSize="11.5" fill="#5f6368">
                        ＋ 開発者=編集
                      </text>
                    </g>

                    {/* Row 7: Data Platform Folder */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('data-folder')}>
                      <rect
                        x="32"
                        y="362"
                        width="184"
                        height="46"
                        rx="9"
                        fill="#e6f4ea"
                        stroke={nodeStroke('data-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('data-folder')}
                      />
                      <text x="124" y="390" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#0d652d">
                        フォルダ：データ基盤部
                      </text>
                      <text x="228" y="381" fontSize="11.5" fill="#5f6368">
                        別枝のため
                      </text>
                      <text x="228" y="398" fontSize="11.5" fill="#5f6368">
                        広告チームの権限なし
                      </text>
                    </g>

                    {/* Legend */}
                    <rect x="12" y="424" width="12" height="12" rx="3" fill="#e6f4ea" stroke="#81c995" />
                    <text x="29" y="434" fontSize="11.5" fill="#444746">組織・フォルダ</text>
                    <rect x="122" y="424" width="12" height="12" rx="3" fill="#f1f3f4" stroke="#bdc1c6" />
                    <text x="139" y="434" fontSize="11.5" fill="#444746">プロジェクト</text>
                    <rect x="12" y="446" width="12" height="12" rx="3" fill="#ede9fe" stroke="#a78bfa" />
                    <text x="29" y="456" fontSize="11.5" fill="#444746">IAM（下へ足し算継承）</text>
                    <rect x="172" y="446" width="12" height="12" rx="3" fill="#fef7e0" stroke="#f59e0b" />
                    <text x="189" y="456" fontSize="11.5" fill="#444746">組織ポリシー（禁止ルール）</text>
                  </svg>
                ) : (
                  <svg
                    className="blueprint-svg"
                    viewBox="0 0 820 456"
                    role="img"
                    aria-label="フォルダ運用とポリシー継承の実例"
                  >
                    <title>フォルダとポリシー継承・組織ポリシーの実例</title>
                    <defs>
                      <marker id="sk2-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0 1l8 4-8 4z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Tree lines */}
                    <path d="M 34 62 L 34 400" fill="none" stroke="#64748b" strokeWidth="1.6" />
                    <path d="M 34 102 L 50 102" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />
                    <path d="M 34 400 L 50 400" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />

                    <path d="M 74 126 L 74 284" fill="none" stroke="#64748b" strokeWidth="1.6" />
                    <path d="M 74 166 L 90 166" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />
                    <path d="M 74 284 L 90 284" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />

                    <path d="M 114 190 L 114 224 L 130 224" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />
                    <path d="M 114 308 L 114 342 L 130 342" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#sk2-arr)" />

                    {/* Row 1: Org + Org Policy */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('org-policy')}>
                      <rect
                        x="18"
                        y="14"
                        width="498"
                        height="48"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('org-policy', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('org-policy')}
                      />
                      <text x="267" y="43" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#0d652d">
                        組織（Organization）
                      </text>
                      <rect
                        x="536"
                        y="14"
                        width="260"
                        height="48"
                        rx="10"
                        fill="#fef7e0"
                        stroke={nodeStroke('org-policy', '#f59e0b', '#b06000')}
                        strokeWidth={nodeWidth('org-policy')}
                      />
                      <text x="666" y="43" textAnchor="middle" fontSize="14" fontWeight="700" fill="#92400e">
                        組織ポリシー：SA キー作成禁止
                      </text>
                    </g>

                    {/* Row 2: Dept Folder + Viewer */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('dept-folder')}>
                      <rect
                        x="56"
                        y="78"
                        width="460"
                        height="48"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('dept-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('dept-folder')}
                      />
                      <text x="286" y="107" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                        フォルダ：広告事業部
                      </text>
                      <rect
                        x="536"
                        y="78"
                        width="260"
                        height="48"
                        rx="10"
                        fill="#ede9fe"
                        stroke={nodeStroke('dept-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('dept-folder')}
                      />
                      <text x="666" y="107" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5b21b6">
                        IAM：広告チーム ＝ 閲覧者
                      </text>
                    </g>

                    {/* Row 3-4: Prod Folder + SRE + ads-rag-prod */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('prod-folder')}>
                      <rect
                        x="96"
                        y="142"
                        width="420"
                        height="48"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('prod-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="306" y="171" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                        フォルダ：本番
                      </text>
                      <rect
                        x="536"
                        y="142"
                        width="260"
                        height="48"
                        rx="10"
                        fill="#ede9fe"
                        stroke={nodeStroke('prod-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="666" y="171" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5b21b6">
                        IAM：SRE のみ ＝ 編集者
                      </text>

                      <rect
                        x="136"
                        y="202"
                        width="380"
                        height="44"
                        rx="10"
                        fill="#f1f3f4"
                        stroke={nodeStroke('prod-folder', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('prod-folder')}
                      />
                      <text x="326" y="229" textAnchor="middle" fontSize="14.5" fontWeight="650" fill="#202124">
                        ads-rag-prod
                      </text>
                      <text x="542" y="229" fontSize="13" fill="#5f6368">
                        継承結果：広告=閲覧 ＋ SRE=編集
                      </text>
                    </g>

                    {/* Row 5-6: Dev Folder + Devs + ads-rag-dev */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('dev-folder')}>
                      <rect
                        x="96"
                        y="260"
                        width="420"
                        height="48"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('dev-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="306" y="289" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                        フォルダ：開発
                      </text>
                      <rect
                        x="536"
                        y="260"
                        width="260"
                        height="48"
                        rx="10"
                        fill="#ede9fe"
                        stroke={nodeStroke('dev-folder', '#a78bfa', '#6d28d9')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="666" y="289" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5b21b6">
                        IAM：開発者 ＝ 編集者
                      </text>

                      <rect
                        x="136"
                        y="320"
                        width="380"
                        height="44"
                        rx="10"
                        fill="#f1f3f4"
                        stroke={nodeStroke('dev-folder', '#bdc1c6', '#5f6368')}
                        strokeWidth={nodeWidth('dev-folder')}
                      />
                      <text x="326" y="347" textAnchor="middle" fontSize="14.5" fontWeight="650" fill="#202124">
                        ads-rag-dev
                      </text>
                      <text x="542" y="347" fontSize="13" fill="#5f6368">
                        継承結果：広告=閲覧 ＋ 開発者=編集
                      </text>
                    </g>

                    {/* Row 7: Data Platform Folder */}
                    <g style={{ cursor: 'pointer' }} onClick={() => setActiveNodeId('data-folder')}>
                      <rect
                        x="56"
                        y="378"
                        width="460"
                        height="44"
                        rx="10"
                        fill="#e6f4ea"
                        stroke={nodeStroke('data-folder', '#81c995', '#137333')}
                        strokeWidth={nodeWidth('data-folder')}
                      />
                      <text x="286" y="405" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                        フォルダ：データ基盤部
                      </text>
                      <text x="542" y="405" fontSize="13" fill="#5f6368">
                        別枝のため広告チームの権限は届かない
                      </text>
                    </g>

                    {/* Legend */}
                    <rect x="18" y="436" width="13" height="13" rx="3" fill="#e6f4ea" stroke="#81c995" />
                    <text x="37" y="447" fontSize="12.5" fill="#444746">組織・フォルダ</text>
                    <rect x="142" y="436" width="13" height="13" rx="3" fill="#f1f3f4" stroke="#bdc1c6" />
                    <text x="161" y="447" fontSize="12.5" fill="#444746">プロジェクト</text>
                    <rect x="252" y="436" width="13" height="13" rx="3" fill="#ede9fe" stroke="#a78bfa" />
                    <text x="271" y="447" fontSize="12.5" fill="#444746">IAM 許可（下へ足し算継承）</text>
                    <rect x="458" y="436" width="13" height="13" rx="3" fill="#fef7e0" stroke="#f59e0b" />
                    <text x="477" y="447" fontSize="12.5" fill="#444746">組織ポリシー（下位を縛るガードレール）</text>
                  </svg>
                )}
              </div>
            </section>

            {/* IAM 3 Principles Strip */}
            <section className="skeleton-principles" aria-label="IAM の 3 原則">
              <div className="skeleton-principles-head">
                <h2 className="skeleton-section-title">すべての週に効く IAM の 3 原則</h2>
                <p className="skeleton-section-sub">
                  細かいサービス名より先に、この 3 つを土台として頭に入れておくと第1週〜第24週の設計問題が一気につながります。
                </p>
              </div>
              <ol className="principles-grid">
                {IAM_PRINCIPLES.map((item) => (
                  <li key={item.num} className="principle-card">
                    <span className="principle-num">{item.num}</span>
                    <div>
                      <h3 className="principle-title">{item.title}</h3>
                      <p className="principle-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

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
                onClick={() => onJumpToLesson('w01-p1')}
              >
                第1話から始める
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : viewMode === 'map' ? (
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
