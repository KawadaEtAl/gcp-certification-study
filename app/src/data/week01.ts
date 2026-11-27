import type { LessonData, RoadmapPreviewWeek } from '../types';

export const WEEK00_LESSON: LessonData = {
  id: 'w00-overview',
  week: 0,
  part: 0,
  domain: '全体像',
  shortTitle: 'GCP 全体像・学習インデックス',
  title: 'Google Cloud 全体像と 24 週計画',
  tagline: 'PCA → PAA で学ぶ 6 領域のつながりと、週次カリキュラムの現在地を一枚で俯瞰する',
  visualTypeLabel: '6領域アーキテクチャマップ・全体目次',
  estimatedMinutes: 4,
  examQuiz: {
    title: 'PCA 試験で最も問われる判断軸は？',
    scenario:
      'Professional Cloud Architect（PCA）試験では、同じ要件に対して複数の Google Cloud サービスが選択肢に並びます。正解を選ぶうえで最も重視すべき観点はどれですか？',
    choices: [
      {
        id: 'A',
        label: 'A',
        text: 'すべてのサービス名と細かい CLI フラグを丸暗記して、最新サービスを選ぶ。',
        correct: false,
        rationale:
          'PCA は最新サービスの暗記試験ではありません。要件に合わない過剰な構成を選ぶと不正解になります。',
      },
      {
        id: 'B',
        label: 'B',
        text: '要件と制約（運用負荷・可用性・一貫性・セキュリティ・コスト）から候補を絞り、他の選択肢を棄却できる理由を説明できるようにする。',
        correct: true,
        rationale:
          '正解。Google Cloud 推奨の「最小運用・最小権限・要件適合」を軸に、なぜ A を選びなぜ B を捨てるかを説明できる力が合格の核心です。',
      },
      {
        id: 'C',
        label: 'C',
        text: 'どんなワークロードでも常に GKE と Cloud Spanner を選んでおけば安全。',
        correct: false,
        rationale:
          'GKE や Spanner は強力ですが、小規模・単一リージョン要件では運用負荷やコストが過大になり、Cloud Run や Cloud SQL が正解になります。',
      },
    ],
    summary:
      'このサイトは「例題で悩む → 全体図と動きで仕組みを腹落ちさせる → 判断軸と反転条件を整理する」の順で 24 週間を回す設計になっています。',
  },
  thinkingChart: [
    {
      label: '土台から積む（第1〜4週）',
      detail:
        'まずは IAM・認証・Cloud Run・Storage・監視の最小構成を自分の手で動かし、リクエスト 1 件の裏側を説明できるようにする。',
    },
    {
      label: '比較して選ぶ（第5〜10週）',
      detail:
        'ネットワーク・実行基盤（Run/GKE/GCE）・DB（SQL/Spanner/Bigtable/BigQuery）を要件別に比較し、選択が反転する条件を掴む。',
    },
    {
      label: '統制とケースで仕上げる（第11〜24週）',
      detail:
        'Terraform・DR・段階移行・AI運用を固め、公式 4 ケーススタディ（出題の 20〜30%）と通し演習で穴を閉じる。',
    },
  ],
  deepDiveParagraphs: [
    {
      heading: 'Google Cloud を 6 つのレイヤーで捉える',
      body: 'Google Cloud のサービスは膨大ですが、PCA の設計判断では「① 階層と IAM」「② ネットワーク」「③ 実行基盤」「④ データ保存・分析」「⑤ 運用・FinOps」「⑥ AI / Agent」の 6 層に整理すると一気に全体感が見えます。\n特に①のリソース階層と IAM はすべてのサービスに横断して効くため、第1週で最優先に固めます。',
    },
    {
      heading: '1 年計画：PCA（前半半年）→ PAA（後半半年）',
      body: '最初の 24 週間でインフラ・セキュリティ・信頼性・コスト設計の土台（PCA）を完成させます。\n学習中に構築する架空マニュアル RAG アプリ（Cloud Run + Cloud Storage + Firestore + 監視）は、第16週の AI 運用と後半半年の Professional Agentic Architect（PAA）演習へそのまま再利用します。',
      callout: '週 4〜6 時間を目安に「スマホ/iPad でこのサイトを読む → MacBook でラボ演習 → Anki（GCP::PCA）で判断軸を反復」の 3 層ループで回します。',
    },
  ],
  miniQuiz: {
    prompt: 'PCA 標準試験において、公開されている公式 4 ケーススタディは試験全体のどれくらいの割合を占めますか？',
    answer: '約 20〜30%（4 件のうち 2 件が出題）を占めます。第17〜20週で 4 ケースすべてを要件・制約ベースで整理します。',
  },
  flipCondition:
    'すでに実務で特定の領域（例：Cloud Run や BigQuery）を触っている週は短縮し、未経験の領域（ネットワーク・ハイブリッド接続・DR など）に時間を厚く配分して柔軟に進めます。',
  docLinks: [
    { label: 'PCA 認定公式ページ', url: 'https://cloud.google.com/learn/certification/cloud-architect' },
    { label: 'PCA 標準試験ガイド (PDF)', url: 'https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf' },
    { label: 'Well-Architected Framework', url: 'https://cloud.google.com/architecture/framework' },
    { label: 'PAA 認定公式ページ', url: 'https://cloud.google.com/learn/certification/agentic-architect' },
  ],
  ankiCardIds: ['Week 1 から開始（現在 15 枚登録済）'],
  labPredictionPrompt: '24 週間を通して、自分が一番自信をつけたい GCP 領域（IAM / ネットワーク / DB選定 / 障害復旧 / コスト）はどこか？',
};

export const WEEK01_LESSONS: LessonData[] = [
  {
    id: 'w01-p1',
    week: 1,
    part: 1,
    domain: 'IAM',
    shortTitle: 'Cloud Run の 3 つの権限境界',
    title: 'Cloud Run の 3 つの権限チェック',
    tagline: '「デプロイ」「入口の呼び出し」「実行時のデータ操作」はすべて別の主体と判定地点で評価される',
    visualTypeLabel: '2プレーン空間図・シーケンス切替',
    estimatedMinutes: 5,
    examQuiz: {
      title: 'マニュアルを読めるのは誰？',
      scenario:
        '社内アプリが非公開の Cloud Run サービスを呼び出します。開発者がデプロイし、実行中のサービスは指定バケットのマニュアルを読み取ります。鍵ファイルは置かず、書き込みは禁止です。最適な設定はどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '呼び出し元に Storage Object Viewer を付け、実行時の権限は変更しない。',
          correct: false,
          rationale:
            'Cloud Storage へ実際にアクセスするのは「呼び出し元」ではなく Cloud Run の「実行時ID」です。呼び出し元にバケット権限を付けてもアプリは読めません。',
        },
        {
          id: 'B',
          label: 'B',
          text: '呼び出し元に対象サービスの Invoker、開発者にデプロイ権限と実行時IDの利用権限（`actAs`）、専用の実行時IDに対象バケットの Object Viewer を付ける。',
          correct: true,
          rationale:
            '正解。呼び出す・デプロイする・データを読む、の 3 操作にはそれぞれ別の主体と対象があります。書き込み権限を付けないことで最小権限も満たします。',
        },
        {
          id: 'C',
          label: 'C',
          text: '開発者と実行時IDの両方に、プロジェクトの Editor を付ける。',
          correct: false,
          rationale:
            'Editor（基本ロール）は広すぎます。実行時IDがバケットへの書き込み・削除まで行えてしまい、書き込み禁止の要件に反します。',
        },
        {
          id: 'D',
          label: 'D',
          text: '実行時IDに対象サービスの Invoker だけを付ける。',
          correct: false,
          rationale:
            'Invoker は「呼び出し元」に付ける権限であり、さらに実行時IDに Storage の読み取り権限が不足しています。',
        },
      ],
      summary:
        'Cloud Run の IAM は必ず「設定時（Control Plane）」「入口認証（Ingress）」「実行時アクセス（Data Plane）」の 3 境界に分解して判断します。',
    },
    thinkingChart: [
      {
        label: '設定時（Control Plane）',
        detail:
          '開発者に Cloud Run のデプロイ権限。さらに割り当てるサービスアカウント上で `iam.serviceAccounts.actAs`（例：`roles/iam.serviceAccountUser`）。',
      },
      {
        label: '入口（Ingress）',
        detail:
          '呼び出し元に、対象 Cloud Run サービスの `roles/run.invoker`。リクエストには対象サービス宛て（`aud`）の ID トークンを添付。',
      },
      {
        label: '実行中（Data Plane）',
        detail:
          '専用の実行時サービスアカウントに、対象バケットの `roles/storage.objectViewer`。新規作成・削除は許可されない。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'なぜデプロイに `actAs` が別途必要なのか？',
        body: 'デプロイでは「どの権限を持つ ID としてコードを動かすか」が決まります。もしデプロイ権限だけで任意のサービスアカウントを割り当てられたら、強い権限を持つ SA を付けて任意のコードを実行できてしまいます（権限昇格）。\nGoogle Cloud はこれを防ぐため、割り当て先 SA に対する `iam.serviceAccounts.actAs` を別に検証します。',
        callout: '「デプロイが 403 で失敗」したときは、Cloud Run 側だけでなく「割り当てようとしたサービスアカウントの IAM」を見るのが鉄則です。',
      },
      {
        heading: '入口の 200 と裏側の 403 を切り分ける',
        body: '呼び出し元の ID トークンが対象サービス向けで `roles/run.invoker` を持っていれば、Cloud Run の入口はリクエストをコンテナへ渡します。\nその後コンテナ内から Cloud Storage へ送るリクエストは「実行時ID」の権限で評価されます。入口で止まったのか、アプリ到達後に Storage が 403 を返したのかを見分けると原因が一発で絞れます。',
      },
    ],
    miniQuiz: {
      prompt: 'デプロイ時に `iam.serviceAccounts.actAs` が拒否されました。どのリソースの IAM ポリシーを確認しますか？',
      answer: '割り当てようとしたサービスアカウント自体です。デプロイ担当に、そのサービスアカウントに対する `roles/iam.serviceAccountUser`（`actAs` を含む）が付いているか確認します。',
    },
    flipCondition:
      'もし「新規オブジェクトの作成」も要件に加わったら、`roles/storage.objectViewer` に加えて `roles/storage.objectCreator` を検討します。上書き・削除も許してよいかは別要件として切り分けます。',
    docLinks: [
      { label: '呼び出し認証（Cloud Run）', url: 'https://docs.cloud.google.com/run/docs/authenticating/overview' },
      { label: 'サービスIDの設定', url: 'https://docs.cloud.google.com/run/docs/configuring/services/service-identity' },
      { label: 'Storage の IAM ロール', url: 'https://docs.cloud.google.com/storage/docs/access-control/iam-roles' },
    ],
    consoleScreens: [
      {
        id: 'w01-p1-iam-permissions',
        title: 'IAM「許可」ページ（プロジェクト権限一覧）',
        menuPath: 'IAM と管理 › IAM › 許可',
        consoleUrl: 'https://console.cloud.google.com/iam-admin/iam?hl=ja',
        imagePath: './screenshots/week01/w01-p1-iam-permissions.png',
        expectedFile: 'app/public/screenshots/week01/w01-p1-iam-permissions.png',
        width: 1440,
        height: 960,
        caption: 'プロジェクト単位で「どのプリンシパルに何のロールが付いているか」を確認・付与する基本画面です。デフォルト SA に編集者（レガシー）が付いていないかもここで見えます。',
        lookFor: [
          {
            label: 'プリンシパルとロールの対応',
            detail: 'ユーザーやサービスアカウントごとに、広すぎる基本ロール（オーナー／編集者）が付いていないかを確認します。',
          },
          {
            label: 'セキュリティ分析情報（過剰な権限）',
            detail: '未使用の権限が多いアカウントには IAM Recommender の警告バッジが表示されます。',
          },
        ],
      },
      {
        id: 'w01-p1-cloud-run-services',
        title: 'Cloud Run「サービス」一覧・セキュリティ設定',
        menuPath: 'Cloud Run › サービス',
        consoleUrl: 'https://console.cloud.google.com/run?hl=ja',
        imagePath: './screenshots/week01/w01-p1-cloud-run-services.png',
        expectedFile: 'app/public/screenshots/week01/w01-p1-cloud-run-services.png',
        width: 1440,
        height: 960,
        caption: '非公開サービスの「認証が必要（`roles/run.invoker`）」状態と、各サービスに割り当てられた実行時サービスアカウントを確認する画面です。',
        lookFor: [
          {
            label: '認証列（入口の境界）',
            detail: '「認証が必要」なら `roles/run.invoker` と有効な ID トークンがない呼び出しを入口で 403 拒否します。',
          },
          {
            label: 'セキュリティタブ（実行時 ID）',
            detail: 'デフォルトの Compute Engine SA ではなく、最小権限の専用サービスアカウントが割り当てられているかを見ます。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w01-001', 'pca-w01-002', 'pca-w01-003', 'pca-w01-004', 'pca-w01-005'],
    labPredictionPrompt: '呼び出し元の Invoker を外したときと、実行時IDの Object Viewer を外したとき、それぞれリクエストはどこで止まるか？',
  },
  {
    id: 'w01-p2',
    week: 1,
    part: 2,
    domain: 'Auth',
    shortTitle: '鍵を使わない認証（ADC / WIF）',
    title: '鍵を使わない認証とトークン寿命',
    tagline: '実行環境ごとの短命トークン取得経路と、IDトークン／OAuthアクセストークンの役割の違いを時間軸で掴む',
    visualTypeLabel: '3環境比較・TTLタイムライン',
    estimatedMinutes: 6,
    examQuiz: {
      title: 'Cloud Run と外部 CI を鍵なしで認証する',
      scenario:
        'Cloud Run 上のアプリと、外部の CI（GitHub Actions 等）が Google Cloud API を呼びます。外部 CI は OIDC トークンを発行できます。どちらにも長期のサービスアカウント JSON キーを配りたくありません。何を使いますか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '両方で同じサービスアカウントの JSON キーファイルを環境変数に入れて使う。',
          correct: false,
          rationale:
            'JSON キーは手動で失効・削除するまで無期限に有効です。漏えいリスクとローテーション運用の負担が大きく、要件に反します。',
        },
        {
          id: 'B',
          label: 'B',
          text: 'Cloud Run では割り当てたサービスIDと ADC、外部 CI では Workload Identity Federation を使う。',
          correct: true,
          rationale:
            '正解。Cloud Run はメタデータサーバー経由で短命トークンを自動取得し、外部 CI は OIDC トークンを STS で短命認証情報へ交換します。',
        },
        {
          id: 'C',
          label: 'C',
          text: '両方で開発者個人のブラウザログイン認証情報を使い回す。',
          correct: false,
          rationale:
            '個人アカウントの使い回しは監査・退職対応・自動実行のいずれにも不適切です。',
        },
      ],
      summary:
        '「どこで動くか」によって短命トークンの入手経路が変わります。GCP 内部ならメタデータサーバー（ADC）、外部 CI なら Workload Identity Federation（OIDC → STS）です。',
    },
    thinkingChart: [
      {
        label: 'どこで実行する？',
        detail: 'Cloud Run にはメタデータサーバーがあるが、外部 CI や手元の Mac には存在しない。実行環境で取得経路が変わる。',
      },
      {
        label: '何のトークンを使う？',
        detail: 'Cloud Run 入口の認証には「IDトークン（`aud` = サービスURL）」、Storage など GCP API 呼び出しには「OAuth アクセストークン」。',
      },
      {
        label: '寿命と絞り込み',
        detail: '短命トークン（約 1 時間）は自動更新され漏えい時の影響窓が極小。WIF はリポジトリ・ブランチ属性で許可対象を絞る。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'メタデータサーバーと ADC が秘密鍵を不要にする理由',
        body: 'Cloud Run のコンテナ内からはリンクローカルのメタデータサーバー（`metadata.google.internal` / `169.254.169.254`）へ直接到達できます。\nクライアントライブラリは ADC の探索順に従い、鍵指定がなければ自動的に実行時IDの短命トークンを取得し、期限前に裏で取り直します。',
      },
      {
        heading: 'ID トークンと OAuth アクセストークンの決定的な違い',
        body: '非公開 Cloud Run の入口に送るのは「ID トークン（JWT）」で、受信側が「誰が呼んだか（`email`）」と「自分宛てか（`aud`）」を検証します。\n一方、アプリから Cloud Storage 等の Google API を呼ぶときに使うのは「OAuth 2.0 アクセストークン」です。トークンが取れてもバケット側の IAM 許可がなければ 403 になります。',
        callout: '外部 CI の WIF では「GitHub という発行元を信じる」だけでなく、`attributeCondition` で「特定リポジトリの main ブランチのみ」と絞るのが必須です。',
      },
    ],
    miniQuiz: {
      prompt: 'Mac での手動テストは成功するのに、Cloud Run にデプロイすると Storage アクセスが 403 で拒否されます。最初に何を比べますか？',
      answer: 'ローカルと Cloud Run がそれぞれ使っている「実行主体（ID）」です。手元では開発者個人の ADC で動いており、Cloud Run の実行時 SA に同じバケット権限が付いていないのが典型原因です。',
    },
    flipCondition:
      'Mac で本番と同じサービスアカウント権限を安全に検証したい場合は、JSON キーをダウンロードせず、借用権限を持つユーザーで `gcloud` の `--impersonate-service-account` を使います。',
    docLinks: [
      { label: 'Cloud Run のサービスID', url: 'https://docs.cloud.google.com/run/docs/securing/service-identity' },
      { label: '外部 CI の Workload Identity Federation', url: 'https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines' },
      { label: 'ローカル開発環境の ADC', url: 'https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment' },
    ],
    consoleScreens: [
      {
        id: 'w01-p2-service-accounts',
        title: 'IAM「サービス アカウント」一覧',
        menuPath: 'IAM と管理 › サービス アカウント',
        consoleUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts?hl=ja',
        imagePath: './screenshots/week01/w01-p2-service-accounts.png',
        expectedFile: 'app/public/screenshots/week01/w01-p2-service-accounts.png',
        width: 1440,
        height: 960,
        caption: '実行時 ID を作成・管理する画面です。長期 JSON 鍵を発行していない（「キーなし」）ことと、サービスアカウント自体の権限タブ（`actAs`）を確認できます。',
        lookFor: [
          {
            label: 'キー ID 列が空（キーなし）',
            detail: 'Cloud Run の ADC 構成では JSON 鍵を作らず、メタデータサーバーから短命トークンを取得します。',
          },
          {
            label: '各 SA の「権限」タブ',
            detail: '誰がこの SA を割り当て・借用できるか（`roles/iam.serviceAccountUser` 等）を管理する場所です。',
          },
        ],
      },
      {
        id: 'w01-p2-wif-pools',
        title: 'Workload Identity 連携（プール管理）',
        menuPath: 'IAM と管理 › Workload Identity 連携',
        consoleUrl: 'https://console.cloud.google.com/iam-admin/workload-identity-pools?hl=ja',
        imagePath: './screenshots/week01/w01-p2-wif-pools.png',
        expectedFile: 'app/public/screenshots/week01/w01-p2-wif-pools.png',
        width: 1440,
        height: 926,
        caption: 'GitHub Actions などの外部 CI が発行した OIDC トークンを信頼し、短命な Google Cloud 認証情報へ交換する設定画面です。',
        lookFor: [
          {
            label: 'プールと OIDC プロバイダ',
            detail: '外部 IdP の発行元（例：`https://token.actions.githubusercontent.com`）を登録します。',
          },
          {
            label: '属性条件（attributeCondition）',
            detail: '特定リポジトリや `main` ブランチのみ許可するよう絞り込むのが必須です。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w01-006', 'pca-w01-007', 'pca-w01-008', 'pca-w01-009'],
    labPredictionPrompt: 'JSON キーファイルを1つも作らずに Cloud Run がバケットを読める仕組みを、メタデータサーバーと実行時IDの関係で説明できるか？',
  },
  {
    id: 'w01-p3',
    week: 1,
    part: 3,
    domain: 'Hierarchy',
    shortTitle: 'リソース階層と Secret Manager',
    title: 'IAM の継承と最小スコープ設計',
    tagline: '上位の Allow ポリシーは下位すべてへ「足し算」で継承される。付与場所による影響範囲を体感する',
    visualTypeLabel: '階層ツリー・許可伝播ヒートマップ',
    estimatedMinutes: 5,
    examQuiz: {
      title: 'アプリに 1 つのシークレットだけ読ませる',
      scenario:
        'Cloud Run の実行時IDに、プロジェクト内にある 1 つの API キーの値だけ読ませたいとします。現在、この ID に Secret Manager の権限はありません。どこで何を付けますか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: 'プロジェクトに対して Secret Manager Secret Accessor を付ける。',
          correct: false,
          rationale:
            'プロジェクトに付けると、同じプロジェクト内の他のシークレット（DBパスワード等）にも許可が継承されてしまいます。',
        },
        {
          id: 'B',
          label: 'B',
          text: '対象のシークレット単体に対して Secret Manager Secret Accessor を付ける。',
          correct: true,
          rationale:
            '正解。対象シークレットに直接 `roles/secretmanager.secretAccessor` を付与すれば、その 1 件の値だけにアクセス範囲を絞れます。',
        },
        {
          id: 'C',
          label: 'C',
          text: '組織に対して Secret Manager Admin を付ける。',
          correct: false,
          rationale:
            '組織レベルへの管理者ロール付与は全プロジェクトのシークレットの閲覧・作成・削除まで許すため、最小権限に大きく反します。',
        },
      ],
      summary:
        'IAM の有効な Allow ポリシーは「上位から継承した許可」と「リソース自身の許可」の和集合です。子側を空にしても上位の許可は打ち消せません。',
    },
    thinkingChart: [
      {
        label: '階層をたどる',
        detail: '組織（Organization）→ フォルダ（Folder）→ プロジェクト（Project）→ 個別リソース（Bucket / Secret）。',
      },
      {
        label: '許可は足し算（和集合）',
        detail: '上位で付けた Allow は配下の全リソース（将来追加されるものも含む）に自動で効く。子で「付けない」だけでは防げない。',
      },
      {
        label: '絞るか、Deny で止める',
        detail: '基本は「上位の広い Allow を外し、必要リソースへ直接付与」。上位 Allow を維持しつつ特定操作を止めたいときだけ IAM Deny を検討。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: '「子リソースの IAM が空なのに読めてしまう」罠',
        body: '機密バケットや別シークレットの IAM 画面に実行時IDが載っていないのにアクセスが通ってしまうことがあります。\n有効 Allow ポリシーは「組織 ∪ フォルダ ∪ プロジェクト ∪ リソース」の和集合で評価されるため、上位に 1 つでも広いロールが付いていれば下位すべてで有効になります。',
      },
      {
        heading: 'IAM Deny ポリシーの位置づけ',
        body: 'IAM Allow は「許可の足し算」しかできないため、子リソースで Allow を減らすことはできません。\n上位の広い Allow を保ったまま特定操作だけを強制的に遮断したい要件では、対象権限が対応していれば IAM Deny ポリシーを使います。Deny は Allow の和集合より優先して評価されます。',
        callout: 'まずは「そもそも上位に広すぎる Allow を付けない」が第一選択。IAM Deny は例外的なガードレールとして使います。',
      },
    ],
    miniQuiz: {
      prompt: 'シークレットの IAM 一覧に実行時IDが載っていないのに、アプリがシークレットの値を読み取れてしまいます。どこを調べますか？',
      answer: 'プロジェクト・フォルダ・組織といった上位階層の IAM ポリシー、および実行時IDが所属している Google グループ経由の付与を確認します。',
    },
    flipCondition:
      'そのプロジェクト自体が「このアプリ専用」で、将来追加されるシークレットも含めてすべて読む設計なら、プロジェクト単位の付与も合理的な候補になります。',
    docLinks: [
      { label: 'リソース階層とアクセス制御', url: 'https://docs.cloud.google.com/iam/docs/resource-hierarchy-access-control' },
      { label: 'IAM Deny の概要', url: 'https://docs.cloud.google.com/iam/docs/deny-overview' },
      { label: 'Secret Manager のアクセス制御', url: 'https://docs.cloud.google.com/secret-manager/docs/access-control' },
    ],
    consoleScreens: [
      {
        id: 'w01-p3-secret-manager',
        title: 'Secret Manager 一覧・シークレット単位の権限',
        menuPath: 'セキュリティ › Secret Manager',
        consoleUrl: 'https://console.cloud.google.com/security/secret-manager?hl=ja',
        imagePath: './screenshots/week01/w01-p3-secret-manager.png',
        expectedFile: 'app/public/screenshots/week01/w01-p3-secret-manager.png',
        width: 1440,
        height: 926,
        caption: 'プロジェクト全体ではなく「個別のシークレット単体」に対して `roles/secretmanager.secretAccessor` を付与する画面です。',
        lookFor: [
          {
            label: 'シークレット詳細 › 権限タブ',
            detail: '最小スコープで 1 件の API キーだけ読ませたいときは、IAM 画面ではなくここに追加します。',
          },
          {
            label: '上位継承の確認',
            detail: '一覧が空でもプロジェクト階層に権限があれば読み取れてしまう点に注意します。',
          },
        ],
      },
      {
        id: 'w01-p3-iam-deny',
        title: 'IAM「許可しない（Deny）」タブ',
        menuPath: 'IAM と管理 › IAM › 許可しない',
        consoleUrl: 'https://console.cloud.google.com/iam-admin/iam?hl=ja',
        imagePath: './screenshots/week01/w01-p3-iam-deny.png',
        expectedFile: 'app/public/screenshots/week01/w01-p3-iam-deny.png',
        width: 1280,
        height: 821,
        caption: '上位から継承された Allow ポリシーより優先して特定操作を強制遮断する IAM Deny ポリシーの確認・作成画面です。',
        lookFor: [
          {
            label: '「許可」タブの隣にある「許可しない」',
            detail: 'Allow は足し算でしか継承されませんが、Deny ポリシーは Allow に優先してブロックします。',
          },
          {
            label: 'ガードレールとしての位置づけ',
            detail: '基本は上位の広い Allow を外すのが第一選択で、例外的な遮断に Deny を使います。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w01-010', 'pca-w01-011', 'pca-w01-012'],
    labPredictionPrompt: 'もしバケットではなくプロジェクトに Storage Object Viewer を付けてしまった場合、後から追加した別バケットへの読み取りはどうなるか？',
  },
  {
    id: 'w01-p4',
    week: 1,
    part: 4,
    domain: 'FinOps',
    shortTitle: '予算通知とクォータの境界',
    title: '非同期の予算通知 vs 同期のクォータ',
    tagline: 'リクエスト実行と課金集計には時間差がある。「気づく仕組み」と「その場で止める仕組み」を対比する',
    visualTypeLabel: 'リアルタイム課金曲線・非同期ラグ比較',
    estimatedMinutes: 5,
    examQuiz: {
      title: '学習用プロジェクトの費用が心配',
      scenario:
        '月額予算を設定し、到達時に通知を受け取りたいです。チームメンバーは「予算の 100% に達すれば利用も自動で止まる」と考えています。何を説明しますか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '予算の 100% に達すると Cloud Billing が自動的にプロジェクトを停止する。',
          correct: false,
          rationale:
            '誤解の典型です。Cloud Billing の予算は通知（メール／Pub/Sub）を出すだけで、利用や課金を自動停止しません。',
        },
        {
          id: 'B',
          label: 'B',
          text: '予算は通知用。利用量を抑えたい場合は、対象サービスのクォータや最大インスタンス数などの設定を別に調整する。',
          correct: true,
          rationale:
            '正解。予算アラートは「気づく仕組み」、クォータやサービス上限設定は「利用量そのものを同期的に制御する仕組み」です。',
        },
        {
          id: 'C',
          label: 'C',
          text: 'クォータを 1 つ設定すれば、プロジェクト全体の月額請求額にそのまま上限を付けられる。',
          correct: false,
          rationale:
            'クォータは API 呼び出し数や CPU 数など「特定サービスのリソース利用量」の上限であり、円・ドル建ての請求総額キャップではありません。',
        },
      ],
      summary:
        '「予算＝非同期の通知」「クォータ／最大インスタンス＝同期の利用量制御」。時間差（ラグ）があるからこそ、予算通知はハードキャップにはなりません。',
    },
    thinkingChart: [
      {
        label: '費用に気づく（非同期）',
        detail: 'Cloud Billing の予算としきい値通知（50% / 90% / 100% 等）。課金データの集計には遅延があり、自動停止はしない。',
      },
      {
        label: '利用量をその場で抑える（同期）',
        detail: '変更可能なクォータや Cloud Run の `max-instances`・同時実行数。リクエスト到達時に 0ms で上限判定される。',
      },
      {
        label: '通知で自動アクション（例外用）',
        detail: '使い捨て実習環境で停止を許容するなら Pub/Sub 経由で課金無効化等を組めるが、集計・通知の遅延分は超過し得る。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'なぜ予算通知は「100% ピッタリ」で止められないのか？',
        body: 'リクエストを受け付ける瞬間（リアルタイム）と、その利用量が Cloud Billing に集計・反映される時刻（非同期・数分〜数時間のラグ）は別です。\n予算アラートは反映済みの費用や予測額を見て発火するため、各リクエスト直前の残額チェックには使えません。Pub/Sub 連携で自動停止を組んでも、集計〜停止処理の間に走った分はそのまま課金されます。',
        callout: '本番環境で「予算超過 → 課金アカウント自動無効化」を組むのは極めて危険です。稼働中の全サービスが突然停止します。',
      },
      {
        heading: 'コストを本当に守る 2 段構え',
        body: '実務でも試験でも「予算アラート（早期検知）」と「サービス固有の上限・クォータ（暴走防止）」を組み合わせます。\nたとえば Cloud Run なら `max-instances` を抑えることで、想定外のスパイクや無限ループが起きても消費 vCPU の上限を物理的に頭打ちにできます。',
      },
    ],
    miniQuiz: {
      prompt: '本番環境で予算超過通知を受け取ったとき、自動で課金を無効化する仕組みを入れてよいですか？',
      answer: '原則 NG です。課金無効化は稼働中の全サービス停止やデータ処理中断を招きます。本番では担当者アラート＋利用急増箇所を絞った制御（クォータ・レート制限・スケール上限）を設計します。',
    },
    flipCondition:
      '停止しても業務影響がない個人サンドボックスや使い捨ての実習プロジェクトなら、Pub/Sub 通知をトリガーに停止処理を行う自動化も候補になります（ただし遅延による超過は前提とする）。',
    docLinks: [
      { label: '予算とアラート（Cloud Billing）', url: 'https://docs.cloud.google.com/billing/docs/how-to/budgets' },
      { label: '予算通知に応じたプログラム処理', url: 'https://docs.cloud.google.com/billing/docs/how-to/notify' },
    ],
    consoleScreens: [
      {
        id: 'w01-p4-billing-budgets',
        title: 'お支払い「予算とアラート」',
        menuPath: 'お支払い › 予算とアラート',
        consoleUrl: 'https://console.cloud.google.com/billing/budgets?hl=ja',
        imagePath: './screenshots/week01/w01-p4-billing-budgets.png',
        expectedFile: 'app/public/screenshots/week01/w01-p4-billing-budgets.png',
        width: 1440,
        height: 926,
        caption: '月額予算としきい値（50% / 90% / 100%）に応じたメール／Pub/Sub 通知を設定する画面です。自動停止スイッチは存在しません。',
        lookFor: [
          {
            label: 'しきい値ルールと通知先',
            detail: '実績額・予測額がしきい値を超えたときにアラートを出す「気づく仕組み」です。',
          },
          {
            label: '集計ラグの前提',
            detail: 'リアルタイム停止ではなく非同期集計後の通知になるため、利用上限の代わりにはなりません。',
          },
        ],
      },
      {
        id: 'w01-p4-quotas',
        title: '割り当てとシステム上限（Quotas）',
        menuPath: 'IAM と管理 › 割り当てとシステム上限',
        consoleUrl: 'https://console.cloud.google.com/iam-admin/quotas?hl=ja',
        imagePath: './screenshots/week01/w01-p4-quotas.png',
        expectedFile: 'app/public/screenshots/week01/w01-p4-quotas.png',
        width: 1440,
        height: 926,
        caption: 'API リクエスト数や vCPU 数など、サービスごとの利用量を同期的に頭打ちにするクォータ確認・調整画面です。',
        lookFor: [
          {
            label: 'サービス別・リージョン別の上限',
            detail: '請求総額（円・ドル）ではなく、対象サービスのリソース利用量に対して上限を掛けます。',
          },
          {
            label: 'Cloud Run の max-instances と併用',
            detail: 'サービス固有の上限設定と組み合わせることで暴走課金を同期的に防ぎます。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w01-013', 'pca-w01-014', 'pca-w01-015'],
    labPredictionPrompt: '自分の学習用プロジェクトで暴走課金を防ぐなら、予算アラート以外に Cloud Run や API で何の上限を設定しておくべきか？',
  },
];

export const ROADMAP_PREVIEW: RoadmapPreviewWeek[] = [
  { week: 1, stage: '第1段階', title: 'IAM・Cloud Run・認証・予算', topics: '3主体IAM / ADC / WIF / Secret Manager / Budget', status: 'active' },
  { week: 2, stage: '第1段階', title: 'Cloud Run リビジョンとリリース', topics: 'サービス/ジョブ / トラフィック分割 / Artifact Registry', status: 'upcoming' },
  { week: 3, stage: '第1段階', title: 'Storage・Firestore・非同期処理', topics: '版管理 / Cloud Tasks 再試行 / 冪等性', status: 'upcoming' },
  { week: 4, stage: '第1段階', title: 'Cloud Build・Logging・Monitoring', topics: 'ビルド〜観測 / エラー切り分け / 切り戻し', status: 'upcoming' },
  { week: 5, stage: '第2段階', title: 'VPC・ルート・ファイアウォール', topics: 'サブネット / Cloud NAT / 公開入口 vs 送信経路', status: 'upcoming' },
  { week: 6, stage: '第2段階', title: 'LB・DNS・ハイブリッド接続', topics: 'Cloud LB / CDN / VPN vs Interconnect / PSC', status: 'upcoming' },
];
