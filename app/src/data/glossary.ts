import type { GlossaryCategoryId, GlossaryTerm, LessonId } from '../types';

export const GLOSSARY_CATEGORY_LABELS: Record<GlossaryCategoryId, string> = {
  basics: '共通基礎',
  'w01-p1': 'Part 1・IAM',
  'w01-p2': 'Part 2・認証',
  'w01-p3': 'Part 3・階層',
  'w01-p4': 'Part 4・予算',
  overview: '全体像',
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // 共通・基本用語（Web / クラウド基礎）
  {
    id: 'iam',
    term: 'IAM',
    subtitle: 'Identity and Access Management',
    category: 'basics',
    lessons: ['w00-overview', 'w01-p1', 'w01-p2', 'w01-p3'],
    aliases: ['アクセス管理', '権限管理', 'アイアム'],
    summary:
      'Google Cloud 内で「誰が」「何に対して」「どんな操作をしてよいか」を管理する仕組み。',
    analogy: '会社の入館証と各部屋のアクセス権台帳。',
    examPoint:
      'すべての Google Cloud サービスに横断して効く土台。基本は「プリンシパル（誰）× ロール（何ができる）× リソース（どこで）」の 3 点セットで考える。',
    relatedIds: ['principal', 'role-permission', 'least-privilege', 'resource-hierarchy'],
  },
  {
    id: 'principal',
    term: 'プリンシパル（主体）',
    subtitle: 'Principal',
    category: 'basics',
    lessons: ['w01-p1', 'w01-p2', 'w01-p3'],
    aliases: ['主体', '誰が', 'アカウント'],
    summary:
      'Google Cloud を操作する「誰か」のこと。人間の Google アカウントだけでなく、サービスアカウントや Google グループも含む。',
    analogy: '入館証を持っている「人」や「ロボット」そのもの。',
    examPoint:
      'トラブル調査や試験問題では、まず「今アクセスしようとしているプリンシパルは誰か（人か、CI か、アプリの実行時 ID か）」を特定する。',
    relatedIds: ['iam', 'service-account', 'runtime-sa'],
  },
  {
    id: 'role-permission',
    term: 'ロールと権限',
    subtitle: 'Role / Permission',
    category: 'basics',
    lessons: ['w01-p1', 'w01-p3'],
    aliases: ['roles/', 'パーミッション', '役割'],
    summary:
      '個別の操作許可が「権限」（例：`storage.objects.get`）、それらを用途別に束ねたセットが「ロール」（例：`roles/storage.objectViewer`）。',
    analogy: '権限＝「コピー機を使う権利」、ロール＝「閲覧専用ゲスト」という役割パック。',
    examPoint:
      'Google Cloud では権限を 1 つずつ直接付けるのではなく、ロール単位でプリンシパルに付与する。',
    relatedIds: ['iam', 'basic-vs-predefined-roles', 'least-privilege'],
  },
  {
    id: 'least-privilege',
    term: '最小権限の原則',
    subtitle: 'Least Privilege',
    category: 'basics',
    lessons: ['w00-overview', 'w01-p1', 'w01-p3'],
    aliases: ['最小権限', 'セキュリティ原則'],
    summary:
      '目的を果たすのに必要な最小限の権限だけを渡し、余計な権限は付けないセキュリティの基本原則。',
    analogy: '掃除業者に「会議室の鍵」だけ渡し、社長室の金庫の鍵は渡さない。',
    examPoint:
      'PCA 試験で最頻出の判断軸。読み取りしか不要なアプリに書き込み権限や `Editor` を付ける選択肢は原則不正解になる。',
    relatedIds: ['basic-vs-predefined-roles', 'allow-inheritance', 'secret-manager'],
  },
  {
    id: 'service-account',
    term: 'サービスアカウント（SA）',
    subtitle: 'Service Account',
    category: 'basics',
    lessons: ['w01-p1', 'w01-p2', 'w01-p3'],
    aliases: ['SA', 'サービスID', 'ロボットアカウント'],
    summary:
      '人間ではなく、アプリや CI などのプログラムが Google Cloud を操作するときに使う専用アカウント。',
    analogy: '社員証の「システム・ボット版」。パスワードではなく短命トークン等で認証する。',
    examPoint:
      'デフォルト SA は権限が広すぎるため、本番・演習とも用途別の専用 SA を作って必要最小限のロールだけを付ける。',
    relatedIds: ['runtime-sa', 'sa-json-key', 'act-as', 'impersonation'],
  },
  {
    id: 'container',
    term: 'コンテナ',
    subtitle: 'Container',
    category: 'basics',
    lessons: ['w00-overview', 'w01-p1', 'w01-p2', 'w01-p4'],
    aliases: ['Docker', 'イメージ', 'コンテナイメージ'],
    summary:
      'アプリ本体と、それを動かすのに必要なライブラリや設定をひとまとめに梱包した実行単位（箱）。',
    analogy: '中身と道具が一式入った引っ越しコンテナ。Mac でも Cloud Run でも同じように動かせる。',
    examPoint:
      'Cloud Run はこのコンテナを渡すだけで自動で公開・スケーリングしてくれる。秘密鍵をイメージ内に焼き込まないのが鉄則。',
    relatedIds: ['cloud-run', 'gke-gce', 'max-instances'],
  },
  {
    id: 'http-status',
    term: 'HTTP ステータス（200 / 401 / 403）',
    subtitle: 'HTTP Status Codes',
    category: 'basics',
    lessons: ['w01-p1', 'w01-p2'],
    aliases: ['200', '401', '403', 'Permission Denied', '認可エラー'],
    summary:
      'Web リクエストの結果を伝える 3 桁の番号。`200`＝成功、`401`＝認証エラー（誰かわからない）、`403`＝認可エラー（身元はわかったが権限がない）。',
    analogy: '`401`＝「社員証を見せてください」、`403`＝「社員証は確認できたが、この部屋には入れません」。',
    examPoint:
      'Cloud Run の入口で 403 なら Invoker 不足、入口は通過したのに裏で 403 なら実行時 SA のデータ権限不足と切り分ける。',
    relatedIds: ['run-invoker', 'runtime-sa', 'control-data-plane'],
  },
  {
    id: 'api',
    term: 'API',
    subtitle: 'Application Programming Interface',
    category: 'basics',
    lessons: ['w01-p1', 'w01-p2', 'w01-p4'],
    aliases: ['Google Cloud API', 'API呼び出し'],
    summary:
      'アプリや CI から Google Cloud の機能（バケットを読む、シークレットを取る等）をプログラム経由で呼び出すための窓口。',
    analogy: 'レストランの注文カウンター。ルール通りにリクエストを送ると、裏側で処理して結果を返してくれる。',
    examPoint:
      'Google Cloud の操作は裏側ではすべて API 呼び出し。API を呼ぶときは認証トークンと IAM 権限の両方が必要。',
    relatedIds: ['id-vs-oauth-token', 'quotas'],
  },
  {
    id: 'ci-cd',
    term: 'CI / CD（外部 CI）',
    subtitle: 'Continuous Integration / Delivery',
    category: 'basics',
    lessons: ['w01-p2'],
    aliases: ['CI', 'GitHub Actions', 'Cloud Build', '自動デプロイ'],
    summary:
      'コードを GitHub などに push したときに、自動でテスト・ビルド・デプロイを走らせる仕組み（GitHub Actions、Cloud Build など）。',
    analogy: '原稿を提出すると自動で校正・印刷・棚への配置までやってくれる全自動ライン。',
    examPoint:
      'GitHub Actions のような「外部 CI」は Google Cloud の外で動くため、キーレス認証には Workload Identity Federation を使う。',
    relatedIds: ['oidc-token', 'wif', 'sa-json-key'],
  },
  {
    id: 'sync-vs-async',
    term: '同期処理 と 非同期処理',
    subtitle: 'Synchronous vs Asynchronous',
    category: 'basics',
    lessons: ['w01-p4'],
    aliases: ['同期', '非同期', 'ラグ', '遅延'],
    summary:
      '同期＝リクエストのその場で判定・結果を待つ仕組み。非同期＝裏側で後から集計・通知・処理を進める仕組み（時間差＝ラグがある）。',
    analogy: '同期＝レジでその場で残高チェック、非同期＝月末に届くクレジットカード明細メール。',
    examPoint:
      'Part 4 の核心。クォータや `max-instances` は同期でその場で止まるが、予算アラートは非同期のためラグがあり自動停止に使えない。',
    relatedIds: ['billing-budget', 'quotas', 'max-instances', 'pubsub'],
  },

  // Part 1：Cloud Run と 3 つの権限境界
  {
    id: 'cloud-run',
    term: 'Cloud Run',
    subtitle: 'フルマネージド コンテナ実行基盤',
    category: 'w01-p1',
    lessons: ['w00-overview', 'w01-p1', 'w01-p2', 'w01-p3', 'w01-p4'],
    aliases: ['サーバーレス', 'クラウドラン'],
    summary:
      'コンテナを渡すだけで動かせるフルマネージドなサーバーレス実行基盤。アクセスに応じて自動増減し、使わないときは 0 台まで縮小できる。',
    analogy: 'お客さんが来たときだけ店員が増えて、誰もいないときは家賃ゼロになるポップアップ店舗。',
    examPoint:
      'サーバー構築や OS パッチ管理が不要。PCA では「コンテナを最小運用で動かしたい」ときの第一候補。',
    relatedIds: ['container', 'run-invoker', 'runtime-sa', 'max-instances'],
  },
  {
    id: 'cloud-storage',
    term: 'Cloud Storage（バケット / オブジェクト）',
    subtitle: 'オブジェクトストレージ',
    category: 'w01-p1',
    lessons: ['w00-overview', 'w01-p1', 'w01-p3'],
    aliases: ['GCS', 'バケット', 'オブジェクト', 'objectViewer'],
    summary:
      'PDF・画像・テキストなどのファイルを容量無制限で保管できるクラウド倉庫。入れ物が「バケット」、中のファイルが「オブジェクト」。',
    analogy: 'バケット＝倉庫の部屋、オブジェクト＝部屋に置くダンボール箱。',
    examPoint:
      '読み取り専用なら `roles/storage.objectViewer` をプロジェクト全体ではなく対象バケット単体に絞って付けるのが最小権限。',
    relatedIds: ['runtime-sa', 'least-privilege', 'allow-inheritance'],
  },
  {
    id: 'runtime-sa',
    term: '実行時サービスアカウント（サービス ID）',
    subtitle: 'Runtime Service Account / Service Identity',
    category: 'w01-p1',
    lessons: ['w01-p1', 'w01-p2', 'w01-p3'],
    aliases: ['実行時ID', 'ランタイムSA', 'サービスID'],
    summary:
      'Cloud Run 上で動いているアプリ自身が、裏側の Storage や Secret Manager へアクセスするときに名乗る ID。',
    analogy: 'お店の中で倉庫へ荷物を取りに行く「スタッフの名札」。お客さん（呼び出し元）の名札とは別物。',
    examPoint:
      '「呼び出し元に Storage 権限を付けてもアプリは読めない」という頻出ひっかけの核心。データを読むのは実行時 ID。',
    relatedIds: ['service-account', 'run-invoker', 'act-as', 'metadata-server'],
  },
  {
    id: 'run-invoker',
    term: 'Invoker（Cloud Run 起動元）',
    subtitle: 'roles/run.invoker',
    category: 'w01-p1',
    lessons: ['w01-p1', 'w01-p2'],
    aliases: ['インボーカー', '呼び出し権限', '認証が必要'],
    summary: '非公開の Cloud Run サービスの「入口」を呼び出してよい許可を与えるロール。',
    analogy: '会員制店舗の「入店許可証」。',
    examPoint:
      'デプロイ担当者や実行時 ID ではなく、呼び出し元（クライアント／社内アプリ等）に対して付与する。入口で拒否されると 403 になる。',
    relatedIds: ['cloud-run', 'runtime-sa', 'id-vs-oauth-token', 'http-status'],
  },
  {
    id: 'act-as',
    term: 'actAs（サービスアカウント利用権限）',
    subtitle: 'iam.serviceAccounts.actAs / roles/iam.serviceAccountUser',
    category: 'w01-p1',
    lessons: ['w01-p1', 'w01-p2'],
    aliases: ['serviceAccountUser', 'アクトアズ', '権限昇格'],
    summary:
      '「このサービスアカウントをアプリに割り当てて使ってよい」という許可。代表ロールは `roles/iam.serviceAccountUser`。',
    analogy: '「このロボットを動かしてよい」という委任許可。',
    examPoint:
      'デプロイ権限だけで強い SA を勝手に割り当てられる「権限昇格」を防ぐための仕組み。拒否されたら割り当て先 SA 側の IAM を見る。',
    relatedIds: ['service-account', 'runtime-sa', 'control-data-plane'],
  },
  {
    id: 'control-data-plane',
    term: 'Control Plane と Data Plane',
    subtitle: '管理側（設定時）vs 実行側（リクエスト処理）',
    category: 'w01-p1',
    lessons: ['w01-p1'],
    aliases: ['コントロールプレーン', 'データプレーン', 'Ingress', '入口'],
    summary:
      'Control Plane＝デプロイや権限設定などの「管理・設定側」、Data Plane＝実際のユーザーリクエストやデータ読み書きの「実行側」。',
    analogy: 'Control Plane＝店舗の設計・シフト管理、Data Plane＝実際の接客と商品受け渡し。',
    examPoint:
      'Cloud Run の障害は「設定時（デプロイ）」「入口（Ingress）」「実行時（Data Plane）」の 3 境界に分けると一発で原因が絞れる。',
    relatedIds: ['act-as', 'run-invoker', 'runtime-sa'],
  },
  {
    id: 'basic-vs-predefined-roles',
    term: '基本ロール と 事前定義ロール',
    subtitle: 'Basic Roles (Owner / Editor / Viewer) vs Predefined Roles',
    category: 'w01-p1',
    lessons: ['w01-p1'],
    aliases: ['Editor', 'Owner', '編集者', 'レガシーロール'],
    summary:
      '基本ロールはプロジェクト全体に広く効く昔ながらの粗いロール。事前定義ロールはサービス・操作ごとに細かく用意された推奨ロール。',
    analogy: '基本ロール＝全室のマスターキー、事前定義ロール＝「倉庫の閲覧だけできる鍵」。',
    examPoint:
      '本番や試験で `Editor` などの基本ロールを選ぶのは原則 NG。必要な事前定義ロール（例：`roles/storage.objectViewer`）を選ぶ。',
    relatedIds: ['role-permission', 'least-privilege'],
  },

  // Part 2：鍵を使わない認証（ADC / WIF / トークン）
  {
    id: 'sa-json-key',
    term: 'サービスアカウントの JSON キー',
    subtitle: 'Service Account Key (長期秘密鍵)',
    category: 'w01-p2',
    lessons: ['w01-p1', 'w01-p2'],
    aliases: ['JSON鍵', '秘密鍵', '長期キー', 'キーレス'],
    summary: 'サービスアカウントになりすますための秘密鍵が入った JSON ファイル。',
    analogy: '無期限でコピーし放題の「物理の合い鍵」。',
    examPoint:
      '手動で消すまでずっと有効なため漏えい時の被害が大きく、管理負担も重い。Google Cloud では発行しない（キーレス運用）のが鉄則。',
    relatedIds: ['short-lived-token', 'adc', 'wif', 'service-account'],
  },
  {
    id: 'short-lived-token',
    term: '短命トークン',
    subtitle: 'Short-lived Credentials (TTL 約1時間)',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['TTL', '有効期限', '一時トークン'],
    summary: '数分〜約 1 時間で自動的に期限切れになる使い捨ての認証情報。',
    analogy: '1 時間だけ有効な自動失効パス。',
    examPoint:
      '期限前にライブラリが自動で取り直す。仮に漏えいしても影響時間がごく短く、鍵のローテーション運用も不要になる。',
    relatedIds: ['sa-json-key', 'adc', 'metadata-server', 'wif'],
  },
  {
    id: 'adc',
    term: 'ADC',
    subtitle: 'Application Default Credentials',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['デフォルト認証情報', 'application-default login'],
    summary:
      'コードに鍵の読み込みを書かなくても、Google Cloud のクライアントライブラリが実行環境に合わせて認証情報を自動探索する仕組み。',
    analogy: '職場では社員証、自宅では自宅キーを自動でポケットから取り出してくれる仕組み。',
    examPoint:
      'Cloud Run 上ではメタデータサーバーから実行時 ID の短命トークンを取得し、ローカル Mac では `gcloud auth application-default login` の認証情報を拾う。',
    relatedIds: ['metadata-server', 'runtime-sa', 'short-lived-token', 'impersonation'],
  },
  {
    id: 'metadata-server',
    term: 'メタデータサーバー',
    subtitle: 'metadata.google.internal (169.254.169.254)',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['169.254.169.254', 'リンクローカル'],
    summary:
      'Cloud Run や Compute Engine の中からだけアクセスできる Google Cloud 内部の窓口。',
    analogy: '社内ネットワークからだけつながる「入館証の自動発券機」。',
    examPoint:
      'アプリが JSON キーを持たずに短命トークンを受け取れる理由。外部 CI（GitHub Actions 等）からは届かないため、外部では WIF を使う。',
    relatedIds: ['adc', 'runtime-sa', 'wif'],
  },
  {
    id: 'oidc-token',
    term: 'OIDC トークン',
    subtitle: 'OpenID Connect Token',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['OIDC', 'JWT', 'IdP', '外部身分証'],
    summary:
      'GitHub Actions などの外部サービスが、「今動いているのは間違いなくこのリポジトリのジョブだ」とデジタル署名付きで証明する短命の身分証。',
    analogy: '発行元の公印が入った、数分で失効するその場限りの入場証。',
    examPoint:
      'Workload Identity Federation にこの OIDC トークンを見せることで、JSON キーなしで Google Cloud の短命トークンと交換できる。',
    relatedIds: ['ci-cd', 'wif', 'sts', 'sa-json-key'],
  },
  {
    id: 'wif',
    term: 'Workload Identity Federation（WIF）',
    subtitle: 'Workload Identity 連携',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['WIF', 'ワークロードアイデンティティ', 'attributeCondition', 'プール'],
    summary:
      'Google Cloud の外側（GitHub Actions・AWS・Azure 等）の身分証（OIDC トークン等）を、Google Cloud の短命トークンに交換してくれる仕組み。',
    analogy: '外部のパスポートを確認して、GCP 専用の 1 時間パスに交換してくれる「両替所」。',
    examPoint:
      '試験で「外部 CI / AWS / Azure からキーレスで GCP を呼ぶ」と出たら最有力候補。必ず `attributeCondition` でリポジトリやブランチを絞る。',
    relatedIds: ['oidc-token', 'sts', 'ci-cd', 'adc'],
  },
  {
    id: 'sts',
    term: 'STS',
    subtitle: 'Security Token Service',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['トークン交換', 'セキュリティトークンサービス'],
    summary:
      'Workload Identity Federation の裏側で、外部の OIDC トークンを検証して Google Cloud の短命トークンへ交換するサービス。',
    analogy: '両替所の窓口でパスポートの真偽をチェックして交換券を渡す担当者。',
    examPoint:
      '外部 CI 認証のフローでは「外部 IdP（OIDC 発行）→ GCP STS（交換）→ GCP API 呼び出し」の順で動く。',
    relatedIds: ['wif', 'oidc-token', 'short-lived-token'],
  },
  {
    id: 'id-vs-oauth-token',
    term: 'ID トークン と OAuth アクセストークン',
    subtitle: 'ID Token (JWT / aud) vs OAuth 2.0 Access Token',
    category: 'w01-p2',
    lessons: ['w01-p1', 'w01-p2'],
    aliases: ['IDトークン', 'アクセストークン', 'aud', 'JWT', 'OAuth'],
    summary:
      'ID トークンは「誰が・誰宛て（`aud`）に呼んだか」を示す身分証、OAuth アクセストークンは「Google Cloud API を操作する通行証」。',
    analogy: 'ID トークン＝宛名付きの名刺、OAuth アクセストークン＝施設内の利用チケット。',
    examPoint:
      '非公開 Cloud Run の入口認証には ID トークン、Cloud Storage などの Google API 呼び出しには OAuth アクセストークンを使う。',
    relatedIds: ['run-invoker', 'api', 'short-lived-token'],
  },
  {
    id: 'impersonation',
    term: 'サービスアカウントの借用',
    subtitle: 'Impersonation (--impersonate-service-account)',
    category: 'w01-p2',
    lessons: ['w01-p2'],
    aliases: ['借用', 'なりすまし検証', 'impersonate'],
    summary:
      'JSON キーをダウンロードせず、許可されたユーザーが一時的に別サービスアカウントの権限を借りて操作・検証する仕組み。',
    analogy: '管理者の立ち会いのもと、その場だけ作業用の名札を借りて動作確認すること。',
    examPoint:
      'Mac ローカルで「本番の実行時 SA と同じ権限で動くか」を安全にテストしたいときに `--impersonate-service-account` を使う。',
    relatedIds: ['adc', 'service-account', 'sa-json-key'],
  },

  // Part 3：リソース階層と Secret Manager
  {
    id: 'resource-hierarchy',
    term: 'リソース階層',
    subtitle: 'Organization → Folder → Project → Resource',
    category: 'w01-p3',
    lessons: ['w00-overview', 'w01-p3'],
    aliases: ['組織', 'フォルダ', 'プロジェクト', '階層'],
    summary:
      'Google Cloud のすべてのリソースを整理する 4 段階の入れ子構造（組織 → フォルダ → プロジェクト → 個別リソース）。',
    analogy: '会社（組織）→ 事業部（フォルダ）→ チーム案件（プロジェクト）→ 個別の金庫や倉庫（リソース）。',
    examPoint:
      'IAM ポリシーはこの階層の上から下へ自動的に引き継がれる。付与する階層を 1 段上げるだけで影響範囲が一気に広がる。',
    relatedIds: ['allow-inheritance', 'iam-deny', 'iam'],
  },
  {
    id: 'allow-inheritance',
    term: 'Allow ポリシーの継承（和集合）',
    subtitle: 'Effective Allow Policy Inheritance',
    category: 'w01-p3',
    lessons: ['w01-p3'],
    aliases: ['継承', '和集合', '足し算', 'Allowポリシー'],
    summary:
      '上位階層で付けた Allow（許可）は、配下の全リソース（将来作られるものも含む）へ「足し算」で継承されるルール。',
    analogy: 'ビル全体に入れるパスを持つ人は、各部屋の許可リストに名前がなくても入れてしまう。',
    examPoint:
      '子リソース側の IAM を空にしても上位の許可は消せない。「子に載っていないのに読める」ときはプロジェクト・フォルダ・組織・グループを確認する。',
    relatedIds: ['resource-hierarchy', 'iam-deny', 'least-privilege'],
  },
  {
    id: 'iam-deny',
    term: 'IAM Deny ポリシー',
    subtitle: '許可しない（Deny Policy）',
    category: 'w01-p3',
    lessons: ['w01-p3'],
    aliases: ['Deny', '許可しない', 'ガードレール', '拒否ポリシー'],
    summary: '上位から継承された Allow より優先して特定の操作を強制ブロックするルール。',
    analogy: '全館パスを持っていても「この部屋だけは絶対立入禁止」と止める非常ロック。',
    examPoint:
      'まず「上位の広すぎる Allow を外す」のが第一選択。広い Allow を維持しつつ例外的に操作を禁止したいガードレール用途で使う。',
    relatedIds: ['allow-inheritance', 'resource-hierarchy'],
  },
  {
    id: 'secret-manager',
    term: 'Secret Manager',
    subtitle: 'roles/secretmanager.secretAccessor',
    category: 'w01-p3',
    lessons: ['w01-p3'],
    aliases: ['シークレット', 'APIキー管理', 'secretAccessor', '秘密情報'],
    summary:
      'API キーや DB パスワードなどの秘密情報を暗号化して安全に保管・バージョン管理するサービス。',
    analogy: '鍵のかかった専用の貸金庫。誰がいつ開けたかも監査ログに残る。',
    examPoint:
      'アプリに 1 件だけ読ませたいときは、プロジェクト全体ではなく対象シークレット単体に `roles/secretmanager.secretAccessor` を付ける。',
    relatedIds: ['allow-inheritance', 'least-privilege', 'runtime-sa'],
  },

  // Part 4：予算通知とクォータ（FinOps）
  {
    id: 'billing-budget',
    term: 'Cloud Billing と 予算アラート',
    subtitle: 'Cloud Billing Budgets & Alerts',
    category: 'w01-p4',
    lessons: ['w01-p4'],
    aliases: ['予算', 'お支払い', 'しきい値', 'FinOps', '自動停止'],
    summary:
      '利用料金を集計する仕組みが Cloud Billing。設定したしきい値（50% / 90% / 100% 等）に達したらメールや Pub/Sub で知らせるのが予算アラート。',
    analogy: '利用額を教えてくれる「お知らせアラーム」。ブレーカー（自動停止装置）ではない。',
    examPoint:
      '課金データの集計には数分〜数時間の非同期ラグがあり、予算の 100% に達しても利用は自動停止しない。',
    relatedIds: ['sync-vs-async', 'quotas', 'max-instances', 'pubsub'],
  },
  {
    id: 'quotas',
    term: 'クォータ（割り当て）',
    subtitle: 'Quotas & System Limits',
    category: 'w01-p4',
    lessons: ['w01-p4'],
    aliases: ['割り当て', 'システム上限', 'リミット'],
    summary:
      'API リクエスト数や vCPU 数など、サービスごとのリソース利用量を同期的に頭打ちにする上限設定。',
    analogy: '蛇口に付ける「1 分あたりの最大水量リミッター」。',
    examPoint:
      '金額（円・ドル）の上限ではなく「利用量」の上限。暴走課金を防ぐために予算アラートとセットで設計する。',
    relatedIds: ['billing-budget', 'max-instances', 'sync-vs-async'],
  },
  {
    id: 'max-instances',
    term: 'max-instances（最大インスタンス数）',
    subtitle: 'Cloud Run Scaling Limit',
    category: 'w01-p4',
    lessons: ['w01-p4'],
    aliases: ['スケール上限', '最大インスタンス', '同時実行数'],
    summary: 'Cloud Run がアクセス急増時に自動スケールで増やせるコンテナ数の上限設定。',
    analogy: '混雑時に増やせるレジ台数の上限。',
    examPoint:
      'リクエスト到達時に同期的に判定されるため、バグやスパイクによる想定外の課金暴走を物理的に頭打ちにできる。',
    relatedIds: ['cloud-run', 'quotas', 'billing-budget'],
  },
  {
    id: 'pubsub',
    term: 'Pub/Sub',
    subtitle: '非同期メッセージングサービス',
    category: 'w01-p4',
    lessons: ['w01-p4'],
    aliases: ['パブサブ', '通知連携', 'メッセージング'],
    summary:
      'イベントや通知メッセージ（予算超過通知など）を、送信側と受信側を切り離して非同期に配信するメッセージングサービス。',
    analogy: 'お知らせを投函すると、登録しているシステムへ自動で配達してくれる郵便局。',
    examPoint:
      '予算アラートの通知先に Pub/Sub を指定すれば自動処理を起動できるが、集計〜通知〜実行のラグがあるため「100% ピッタリ停止」にはならない。',
    relatedIds: ['billing-budget', 'sync-vs-async'],
  },

  // 全体像（Week 0・ロードマップ）
  {
    id: 'pca-paa',
    term: 'PCA / PAA（認定資格）',
    subtitle: 'Professional Cloud Architect / Agentic Architect',
    category: 'overview',
    lessons: ['w00-overview'],
    aliases: ['資格', '試験', 'ロードマップ'],
    summary:
      'PCA＝クラウド設計・運用全般の認定、PAA＝AI エージェント基盤の設計・運用の認定。',
    analogy: 'PCA＝建物全体のインフラ設計士、PAA＝その上で動く自律 AI チームの設計士。',
    examPoint:
      'この学習計画では前半 24 週で PCA の土台を固め、後半半年で PAA へ進む。',
    relatedIds: ['gke-gce', 'databases-overview', 'vpc'],
  },
  {
    id: 'gke-gce',
    term: 'GKE / Compute Engine（GCE）',
    subtitle: 'コンテナオーケストレーション / 仮想マシン',
    category: 'overview',
    lessons: ['w00-overview'],
    aliases: ['Kubernetes', 'VM', '仮想マシン', '実行基盤'],
    summary:
      'GKE（Google Kubernetes Engine）はコンテナ群を高度に管理する基盤、Compute Engine は仮想マシン（VM）を直接借りる基盤。',
    analogy: 'Cloud Run＝おまかせ店舗、GKE＝複数店舗を統括する商業ビル管理、Compute Engine＝土地から自分で建てる自由設計。',
    examPoint:
      '第 7 週で Cloud Run・GKE・Compute Engine の 3 択を「運用負荷・スケール・特殊要件」で比較する。',
    relatedIds: ['cloud-run', 'container'],
  },
  {
    id: 'databases-overview',
    term: 'Cloud SQL / Spanner / Firestore / BigQuery',
    subtitle: '用途別のデータ保存・分析サービス',
    category: 'overview',
    lessons: ['w00-overview'],
    aliases: ['データベース', 'DB', 'RDB', 'NoSQL', '分析', 'Bigtable'],
    summary:
      'Cloud SQL＝定番 RDB、Spanner＝世界規模 RDB、Firestore＝ドキュメント DB、BigQuery＝超大規模データ分析倉庫。',
    analogy: '日常の台帳（SQL）、世界同時更新の銀行元帳（Spanner）、柔軟なメモ帳（Firestore）、過去数年分を集計する分析室（BigQuery）。',
    examPoint:
      '第 8〜9 週で「トランザクション・一貫性・データ量・分析用途」から選び分ける。',
    relatedIds: ['cloud-storage'],
  },
  {
    id: 'vpc',
    term: 'VPC',
    subtitle: 'Virtual Private Cloud',
    category: 'overview',
    lessons: ['w00-overview'],
    aliases: ['ネットワーク', 'サブネット', 'ファイアウォール'],
    summary:
      'Google Cloud 上に作る自分専用の仮想ネットワーク空間。サブネット・ルート・ファイアウォールで通信経路と許可を制御する。',
    analogy: '自社ビル専用の構内 LAN とセキュリティゲート。',
    examPoint:
      '第 5〜6 週のメインテーマ。公開入口とプライベート通信経路を区別して設計する。',
    relatedIds: ['gke-gce'],
  },
  {
    id: 'terraform',
    term: 'Terraform（IaC）',
    subtitle: 'Infrastructure as Code',
    category: 'overview',
    lessons: ['w00-overview'],
    aliases: ['IaC', 'インフラコード化', 'plan', 'state'],
    summary:
      'GCP のバケットや IAM 設定を手作業クリックではなくコード（設定ファイル）で書いて管理・自動反映するツール。',
    analogy: '建物を毎回手作業で建てる代わりに、設計図ファイルから同じ環境を何度でも正確に再現する仕組み。',
    examPoint:
      '第 11 週で `plan`（変更差分の事前確認）と `state`（現在の構成記録）の仕組みを実践する。',
    relatedIds: ['ci-cd'],
  },
];

/**
 * Curated quick-lookup term IDs surfaced directly inside each lesson's Quiz & Deep-Dive tabs.
 */
export const LESSON_KEY_TERM_IDS: Record<LessonId, string[]> = {
  'w00-overview': ['iam', 'cloud-run', 'gke-gce', 'databases-overview', 'vpc', 'terraform', 'pca-paa'],
  'w01-p1': ['cloud-run', 'cloud-storage', 'principal', 'runtime-sa', 'run-invoker', 'act-as', 'basic-vs-predefined-roles', 'http-status'],
  'w01-p2': ['ci-cd', 'oidc-token', 'sa-json-key', 'adc', 'wif', 'metadata-server', 'id-vs-oauth-token', 'sts', 'impersonation'],
  'w01-p3': ['resource-hierarchy', 'allow-inheritance', 'secret-manager', 'iam-deny', 'least-privilege', 'runtime-sa'],
  'w01-p4': ['billing-budget', 'quotas', 'max-instances', 'sync-vs-async', 'pubsub'],
};

export function getGlossaryTermById(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.id === id);
}

export function getGlossaryTermsForLesson(lessonId: LessonId): GlossaryTerm[] {
  const keyIds = LESSON_KEY_TERM_IDS[lessonId] ?? [];
  const prioritized = keyIds
    .map((id) => getGlossaryTermById(id))
    .filter((t): t is GlossaryTerm => Boolean(t));
  const seen = new Set(prioritized.map((t) => t.id));
  const rest = GLOSSARY_TERMS.filter((t) => t.lessons.includes(lessonId) && !seen.has(t.id));
  return [...prioritized, ...rest];
}
