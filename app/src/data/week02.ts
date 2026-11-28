import type { LabGuideData, LessonData } from '../types';

const WEEK02_CORE_LAB_GUIDE: LabGuideData = {
  title: '第2週ラボ：week01-manual-api を継続して 2 リビジョン分割＆即時ロールバックを実測',
  sandboxSummary:
    '第1週に個人サンドボックスへ構築した非公開 Cloud Run（`week01-manual-api`・東京リージョン `asia-northeast1`・専用実行時 SA・`manual-docs` バケット）をそのまま継続発展させます。新しく作り直さず「既存サービスを壊さずに更新して戻す」体験を最小コマンドで観測します。',
  predictions: [
    {
      id: 'pred-1',
      question:
        '予測 1：`--no-traffic --tag v2` で新リビジョンをデプロイした直後、通常の本番 URL へアクセスすると v1 と v2 のどちらが応答するか？またタグ付き URL（`https://v2---...`）へ認証なしで呼ぶとどうなるか？',
      placeholder:
        '例：本番 URL は v1 が 100% 応答するはず。タグ URL も非公開サービスの入口 IAM が効くので、ID トークンなしなら 403 で止まるはず…',
    },
    {
      id: 'pred-2',
      question:
        '予測 2：`v2` に意図的な 500 エラー（または環境変数ミス）を混ぜて 10% 配信したあと、`update-traffic` で `v1=100` へ戻すとき、コンテナの再ビルドは走るか？切替完了まで何秒くらい掛かるか？',
      placeholder:
        '例：v1 のリビジョンは不変スナップショットとして残っているので再ビルドなし。数秒でルーティングだけ切り替わりエラーが消えるはず…',
    },
    {
      id: 'pred-3',
      question:
        '予測 3：デプロイ時に Artifact Registry へ保存されたイメージを `gcloud artifacts docker images list` で見ると、`:latest` などのタグ以外にどんな識別子（不変 ID）が付いているか？',
      placeholder:
        '例：中身から計算された `sha256:...` のダイジェストが付いていて、Cloud Run の各リビジョンはそのダイジェストに固定されているはず…',
    },
  ],
  handDrawTheme:
    '紙や iPad に「Artifact Registry（イメージ＆ダイジェスト） → Cloud Run サービス（入口認証 / トラフィック振分） → v1・v2 リビジョン（Ready・不変） → 自動スケール（0〜max-instances）」と、別枠で「Cloud Run ジョブ（実行 → タスク並列 → 終了）」を 1 枚に描いて AI に添削してもらう。',
  handDrawChecklist: [
    '「ビルド主体（Cloud Build SA）」「イメージ取得（Cloud Run サービスエージェント）」「アプリ実行（実行時 SA）」が別だと描けているか',
    '「アプリ起動・Ready」「入口認証（Invoker）」「トラフィック割当（%）」が別の関門として区別されているか',
    'リビジョンが不変で、旧版 v1 を残したままトラフィックだけ 10% → 0% へ戻せる構造が描けているか',
    'サービス（HTTP 待機）とジョブ（処理完了で終了）のライフサイクルの違いが矢印で区別されているか',
  ],
  minimalCommands: [
    {
      title: '1. 現在の安定版リビジョン名と設定を確認する（v1 の固定）',
      purpose: '既存 `week01-manual-api` の現行リビジョン名とイメージダイジェストを控える。',
      command: `gcloud run revisions list \\
  --service=week01-manual-api \\
  --region=asia-northeast1 \\
  --format="table(name,active,status.conditions[0].status,spec.containers[0].image)"`,
      observe: '現行リビジョン（v1）が `True`（Ready）で、イメージが `@sha256:...` で固定されていることを確認する。',
    },
    {
      title: '2. 本番 0% のまま v2 をデプロイし、タグ URL で事前検証する',
      purpose: '本番トラフィックを 1% も流さず、v2 リビジョンだけ起動（Ready）＆単体テストする。',
      command: `gcloud run deploy week01-manual-api \\
  --source=. \\
  --region=asia-northeast1 \\
  --no-allow-unauthenticated \\
  --set-env-vars="APP_VERSION=v2" \\
  --no-traffic \\
  --tag=v2`,
      observe: '出力されたタグ URL（`https://v2---...`）へ ID トークン付きで呼ぶと `v2` が返り、通常 URL では依然 `v1` が返ることを確認。',
    },
    {
      title: '3. カナリア配信（v2=10%, v1=90%）→ 想定障害で即時ロールバック',
      purpose: '再ビルドなしでトラフィック比率を段階切替し、即座に v1 へ 100% 戻せることを実測する。',
      command: `# カナリア 10% へ切替
gcloud run services update-traffic week01-manual-api \\
  --region=asia-northeast1 \\
  --to-tags=v2=10

# 即時ロールバック（直前の安定リビジョンへ 100% 戻す）
gcloud run services update-traffic week01-manual-api \\
  --region=asia-northeast1 \\
  --to-revisions=<v1のリビジョン名>=100`,
      observe: '切り戻しが数秒で完了し、ビルドが一切走らないこと・通常 URL が即座に 100% v1 へ戻ることを観測する。',
    },
    {
      title: '4. Artifact Registry のタグ vs ダイジェストを確認する',
      purpose: 'Cloud Build が保存したコンテナイメージの `@sha256:` 指紋とリビジョンの対応を突き合わせる。',
      command: `gcloud artifacts docker images list \\
  asia-northeast1-docker.pkg.dev/<PROJECT_ID>/cloud-run-source-deploy/week01-manual-api \\
  --include-tags`,
      observe: '複数ビルドで同じタグが動いても、`DIGEST (sha256:...)` は版ごとに固有で不変であることを確認する。',
    },
  ],
  voiceExplainPrompts: [
    '「なぜ Cloud Run で重い夜間バッチを HTTP サービスではなくジョブで動かすべきか？」をメモなしで 30 秒説明する。',
    '「アプリ起動（Ready）・入口認証（Invoker）・トラフィック割当（%）の違い」と「なぜ再ビルドなしで 3 秒ロールバックできるか」を説明する。',
    '「コールドスタートが起きる理由と `min-instances=1` のトレードオフ」「`:latest` ではなく `@sha256:` ダイジェストで固定すべき理由」を説明し、観測結果・差分・片付け状況を `PROGRESS.md` と `CHECKLIST.md` に記録する。',
  ],
  hiddenActorsTitle: '実機で踏みがちな「裏の登場人物」（4 つの別主体）',
  hiddenActors: [
    {
      label: '① 開発者 / CI（デプロイ主体）',
      detail: 'Cloud Run の設定変更権限（`roles/run.developer` 等）と、実行時 SA を割り当てる `actAs` を持つ。',
    },
    {
      label: '② Cloud Build ビルド用 SA（第1週で実測した裏役）',
      detail: '`gcloud run deploy --source .` の裏でソースをビルドし、Artifact Registry へ push する主体（`roles/run.builder` や AR 書き込み権限が必要）。',
    },
    {
      label: '③ Cloud Run サービスエージェント（超頻出ひっかけ）',
      detail: '`service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`。Artifact Registry からコンテナイメージを pull する裏役。別プロジェクトの AR を使うときは**実行時 SA ではなくここ**に `roles/artifactregistry.reader` を付ける。',
    },
    {
      label: '④ 実行時 SA（ランタイム ID）',
      detail: 'コンテナ起動後にアプリコードが GCS や Firestore を読むときに名乗る ID。イメージの pull やビルドには使われない。',
    },
  ],
  hierarchyLevelsTitle: '実機で迷いやすい「設定の 3 階層」（どこで効くか）',
  hierarchyLevels: [
    {
      label: '第1層：プロジェクトのクォータ（リージョン単位の上限）',
      detail: 'プロジェクト全体で同時に確保できる総 vCPU・総メモリ・インスタンス数の上限。ここを超えると全サービスで新規起動が弾かれる。',
    },
    {
      label: '第2層：サービス設定（トラフィック・入口・公開範囲）',
      detail: 'どのリビジョンへ何 % 流すか（トラフィック配分）、`--no-allow-unauthenticated`（入口 IAM）、Ingress（内部のみ／すべて）など。変更しても新リビジョンは作られない。',
    },
    {
      label: '第3層：リビジョン設定（不変スナップショットの中身）',
      detail: 'イメージダイジェスト、環境変数、CPU/メモリ、`concurrency`、`min-instances` / `max-instances`、実行時 SA。ここを変えると必ず新しいリビジョンが 1 つ生成される。',
    },
  ],
};

export const WEEK02_LESSONS: LessonData[] = [
  {
    id: 'w02-p0',
    week: 2,
    part: 0,
    domain: '全体マップ',
    shortTitle: '今週の全体マップ＆前提ワード',
    title: '第2週 全体マップ：更新・バッチ・スケール・倉庫',
    tagline: '「コード → 倉庫（Artifact Registry）→ 実行（サービス／ジョブ・リビジョン・スケール）」を一枚の骨格図と 8 つの前提ワードで掴む',
    story: {
      episodeLabel: '第2週プロローグ',
      hookTitle: '「安全に動いた」の先へ――運用とリリース 4 つの相談',
      request:
        '第1週で立ち上げた社内マニュアル API（`week01-manual-api`）が、最小権限・キーレス認証・予算ガード付きで試験運用に入った。月曜朝の定例会議で、サポート部長・ドキュメント運用チーム・SRE 担当の 3 者から「次の 4 つを今月中に本番水準へ引き上げたい」と一気に相談が舞い込む。① 毎晩 20 分かかる PDF 1,000 件の検索索引バッチ追加、② 業務を止めず数秒で戻せる新機能 v2 の段階リリース、③ 朝 9 時の一発目だけ 4 秒待たされる初回遅延の解消、④ チーム共有コンテナイメージの再現性とセキュリティ管理だ。',
      goal:
        '個別設定に飛びつく前に、Artifact Registry（完成品の倉庫）→ Cloud Run サービス／ジョブ（実行形態）→ リビジョン＆トラフィック（版の切替）→ インスタンス＆同時実行数（台数の伸縮）という全体の地図と 8 つの前提ワードを 1 枚で掴む。',
      challenge:
        '第2週から「リビジョン」「インスタンス」「ダイジェスト」「同時実行数」「コールドスタート」「サービスエージェント」と似た横文字が一気に押し寄せる。全体図がないまま CLI フラグだけ暗記すると、障害発生時や試験問題で「サービス設定なのか、リビジョン設定なのか、クォータなのか」の層を取り違えてしまう。',
      nextBridge: {
        nextLessonId: 'w02-p1',
        nextLabel: '第5話：Cloud Run サービス vs ジョブへ',
        teaser:
          '全体の地図と前提ワードが揃いました。定例会議で最初にテーブルに載ったのは、ドキュメント運用チームからの「毎晩 20 分かかる PDF 索引バッチも、今の Cloud Run にそのまま載せられますよね？」という相談でした。',
      },
    },
    visualTypeLabel: '第2週 静的骨格図 ＋ 前提ワード 8 語',
    estimatedMinutes: 4,
    examQuiz: {
      title: '第2週ウォーミングアップ：4 つの要素の役割分担',
      scenario:
        'Cloud Run で安全にアプリを更新し続ける設計を考えます。「ビルド済みコンテナ箱の保管」「版の固定と切り戻し」「夜間バッチの実行」を担う組み合わせとして最も適切なものはどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '保管＝Cloud Storage、切り戻し＝毎回ソースから再ビルド、夜間バッチ＝HTTP サービスで長タイムアウト実行。',
          correct: false,
          rationale:
            'コンテナイメージの保管は Artifact Registry を使います。また障害時に毎回再ビルドすると復旧が遅れ、HTTP サービスで長バッチを回すのも不適切です。',
        },
        {
          id: 'B',
          label: 'B',
          text: '保管＝Artifact Registry（ダイジェスト固定）、切り戻し＝不変リビジョンのトラフィック切替、夜間バッチ＝Cloud Run ジョブ。',
          correct: true,
          rationale:
            '正解。Artifact Registry に不変の完成品（ダイジェスト）を置き、HTTP 公開はサービス＋リビジョン切替、完結型バッチはジョブに役割分担するのが Google Cloud の標準設計です。',
        },
        {
          id: 'C',
          label: 'C',
          text: 'すべてを 1 つの Compute Engine VM に載せ、SSH でログインして手動でコンテナを差し替える。',
          correct: false,
          rationale:
            'OS 管理や手動差し替えは運用負荷と事故リスクが大きく、サーバーレス実行基盤である Cloud Run の強みを活かせていません。',
        },
      ],
      summary:
        '第2週は「倉庫（Artifact Registry）→ 実行形態（サービス vs ジョブ）→ 安全な切替（リビジョン＆トラフィック）→ 伸縮（スケール＆コールドスタート）」の 4 ピースを 1 本の線でつなぎます。',
    },
    thinkingChart: [
      {
        label: '1. まず「倉庫」と「実行」を分ける',
        detail:
          'コンテナイメージ（完成品の箱）は Artifact Registry に保管し、Cloud Run はそこからダイジェスト（`@sha256:...`）で中身を取り出して動かす。',
      },
      {
        label: '2. 次に「待ち受け」か「やり切り」かを選ぶ',
        detail:
          'HTTP リクエストに応答し続けるなら「Cloud Run サービス」、起動して処理を終えたら終了するバッチなら「Cloud Run ジョブ」。',
      },
      {
        label: '3. 最後に「版（リビジョン）」と「台数（インスタンス）」を分ける',
        detail:
          'リビジョンは「どの版か（不変スナップショット）」、インスタンスは「その版を今何台動かしているか（0〜max-instances）」という別の概念。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'この週で絶対に混同しない 2 つの軸：「版」と「台数」',
        body: '初めて Cloud Run を触ると、「リビジョン」と「インスタンス」が頭の中で混ざりがちです。リビジョン（Revision）は「第1版・第2版」という**設計と中身の固定スナップショット**であり、デプロイするたびに増えます。\n一方、インスタンス（Instance）は「そのリビジョンを今この瞬間に動かしているコンテナの稼働台数」です。アクセスがゼロなら 0 台に縮み、アクセスが集中すれば 1 台 → 5 台へと自動で増えます。',
        callout: '「どの版を使うか（リビジョン＆トラフィック）」はリリース管理、「今何台動かすか（インスタンス＆同時実行数）」はスケーリング管理、と切り分けると迷いません。',
      },
      {
        heading: 'なぜ Cloud Run のデプロイには「倉庫（Artifact Registry）」が挟まるのか？',
        body: 'ソースコードを毎回本番サーバー上で直接ビルドすると、実行のたびに依存ライブラリが変わって再現性が崩れ、起動も遅くなります。\n先にビルド済みの完成品（コンテナイメージ）を Artifact Registry へ保存して指紋（`@sha256:...` ダイジェスト）で固定しておくからこそ、Cloud Run は 0 台から数秒でまったく同じ箱を何台でも複製・ロールバックできます。',
      },
    ],
    miniQuiz: {
      prompt: 'アクセスが急増したとき、自動で増えるのは「リビジョン」と「インスタンス」のどちらですか？',
      answer: '自動で増えるのは「インスタンス（稼働コンテナ台数）」です。リビジョンは新しいイメージや環境変数をデプロイしたときにだけ作られる不変の版です。',
    },
    flipCondition:
      'もし Kubernetes の細かいネットワーク制御や常駐デーモン・ステートフルな Pod 群が必要になったら、第7週で学ぶ GKE へ選択肢が移ります。第2週ではまず最小運用の Cloud Run でできる範囲と限界を正確に掴みます。',
    docLinks: [
      { label: 'Cloud Run の概要（サービスとジョブ）', url: 'https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run' },
      { label: 'Artifact Registry の概要', url: 'https://docs.cloud.google.com/artifact-registry/docs/overview' },
    ],
    ankiCardIds: ['pca-w02-001 〜 pca-w02-016（Part 1〜4 で全 16 枚）'],
    labPredictionPrompt:
      '第2週の 4 単元を通して、`week01-manual-api` に追加・観測してみたい操作はどれか？',
    labGuide: WEEK02_CORE_LAB_GUIDE,
  },
  {
    id: 'w02-p1',
    week: 2,
    part: 1,
    domain: '実行モデル',
    shortTitle: 'Cloud Run サービス vs ジョブ',
    title: 'Cloud Run サービス vs ジョブの設計境界',
    tagline: '「HTTP を待ち受ける受付（サービス）」と「処理を終えたら終了する作業班（ジョブ）」をライフサイクルと失敗時の動きで切り分ける',
    story: {
      episodeLabel: '第5話',
      hookTitle: '夜間 20 分の索引バッチも今の Cloud Run に載せていい？',
      request:
        'ドキュメント運用チームから「製品マニュアル PDF がすでに 1,000 件を超えた。毎晩午前 2 時に Cloud Storage の `manual-docs` バケットを巡回し、本文を抽出して検索用インデックスを作り直す夜間バッチを動かしたい。全件処理すると約 20 分かかるし、せっかくなら第1週と同じ Cloud Run でサーバーレス運用に統一したい」と相談を受けた。',
      goal:
        '昼間の問い合わせに応答する HTTP API（`week01-manual-api`）の安定性を一切脅かさず、同じコンテナ技術・最小権限の専用実行時 SA・従量課金のまま、毎晩の重い索引更新を並列・自動リトライ付きで確実に完了させる。',
      challenge:
        '最初、チーム内では「既存の HTTP サービスに `/run-batch` を 1 本足して Cloud Scheduler から叩けば早い」という案が出た。ところが試算すると ① HTTP 接続を 20 分維持すると呼び出し側タイムアウトに引っかかる、② 先に `202 Accepted` を返して裏スレッドへ逃がすと Cloud Run の CPU 割り当て制限やスケールダウンで途中終了する、③ 800 件目で失敗したときに失敗チャンクだけやり直せない、という 3 重の壁にぶつかった。',
      nextBridge: {
        nextLessonId: 'w02-p2',
        nextLabel: '第6話：リビジョン・トラフィック段階切替＆ロールバックへ',
        teaser:
          '夜間バッチは無事「Cloud Run ジョブ＋Cloud Scheduler」へ切り離せた！ホッとしたのも束の間、翌週には昼間のマニュアル検索 API に新ロジック `v2` を載せる本番リリースが迫ってくる。条件は「昼休みに無停止、バグが出たら数秒で戻す」だ。',
      },
    },
    visualTypeLabel: '静的骨格図（2モデル対比）＋比較表',
    estimatedMinutes: 6,
    examQuiz: {
      title: '毎晩 20 分かかる PDF 索引バッチの実行基盤は？',
      scenario:
        'Cloud Storage に置かれた製品マニュアル PDF 1,000 件を毎晩 2 時に読み込み、テキスト抽出と索引生成を行うコンテナ処理があります。完了まで約 20 分かかり、複数タスクに分割して並列実行したいです。HTTP 応答は不要です。最適な構成はどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '既存の Cloud Run サービスに `/batch` エンドポイントを追加し、Cloud Scheduler から HTTP POST で 20 分間レスポンスを待ち続ける。',
          correct: false,
          rationale:
            'サービスは HTTP リクエスト応答向けです。長時間の HTTP 接続維持はタイムアウト・クライアント切断・タスク並列分割の面で不向きです。',
        },
        {
          id: 'B',
          label: 'B',
          text: 'Cloud Run ジョブとしてデプロイし、`--tasks` で複数タスクへ分割並列実行。毎晩の起動トリガーに Cloud Scheduler を使う。',
          correct: true,
          rationale:
            '正解。Cloud Run ジョブはポート待ち受け不要で、処理を完了すると正常終了（exit code 0）します。複数タスク並列（`CLOUD_RUN_TASK_INDEX`）や失敗タスク単位の再試行にも標準対応します。',
        },
        {
          id: 'C',
          label: 'C',
          text: 'Compute Engine VM を 24 時間起動し続け、VM 内の cron で毎晩コンテナを実行する。',
          correct: false,
          rationale:
            '1 日 20 分しか使わないのに 24 時間分の VM 料金と OS パッチ管理が発生し、サーバーレスの利点を失います。',
        },
        {
          id: 'D',
          label: 'D',
          text: 'Cloud Run サービスの `min-instances` を 10 に増やしてバッチをバックグラウンドスレッドで回す。',
          correct: false,
          rationale:
            'Cloud Run サービスでは HTTP リクエスト処理外のバックグラウンド処理は CPU が絞られる（デフォルトの CPU 割り当て）か、スケールダウンで強制終了されるリスクがあります。',
        },
      ],
      summary:
        'HTTP で応答を返すなら「Cloud Run サービス」、HTTP ポートを持たず処理をやり切って終了するなら「Cloud Run ジョブ」。同じ Cloud Run でもライフサイクルと契約がまったく異なります。',
    },
    thinkingChart: [
      {
        label: '1. 入口は HTTP リクエストか？（契約の確認）',
        detail:
          'クライアントへレスポンスを返す Web API・Webhook なら「サービス」。DB マイグレーション・集計・PDF 変換など「走って終わる処理」なら「ジョブ」。',
      },
      {
        label: '2. 終了とタイムアウトの要件を見る',
        detail:
          'サービスはポートをリッスンし続けリクエスト単位で最大 60 分。ジョブは終了コード（0＝成功 / 非0＝失敗）で完結し、タスク単位で最大 24 時間（デフォルト 10 分）まで設定可能。',
      },
      {
        label: '3. 並列化と再試行の単位を確認する',
        detail:
          'ジョブは 1 回の実行（Execution）で複数タスク（Task 0〜N-1）を並列起動でき、環境変数 `CLOUD_RUN_TASK_INDEX` で担当チャンクを分け、失敗タスクだけ自動リトライできる。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'なぜ HTTP サービスの中で重いバッチを回してはいけないのか？（Why）',
        body: 'Cloud Run サービス（通常の HTTP 受付型）は、「リクエストが届いてレスポンスを返す間」を前提に設計されています。デフォルト設定（リクエストベース課金）では、レスポンスを返した瞬間にコンテナの CPU が極端に絞られ、しばらくするとインスタンス自体が終了します。\nそのため「すぐ 202 Accepted を返して裏スレッドで 20 分処理する」実装は途中で止まります。一方「20 分間 HTTP 接続を繋ぎっぱなし」にすると、途中のプロキシや Cloud Scheduler のタイムアウト制限に引っかかり、さらに 1,000 件を 10 並列で捌く制御も自前実装になってしまいます。',
        callout: '「HTTP ポートをリッスンして応答を返すか？」「`exit 0` でやり切って終わるか？」の 1 問だけでサービスとジョブは 99% 見分けられます。',
      },
      {
        heading: 'ジョブの登場人物：Job 定義・Execution（実行）・Task（並列作業）',
        body: '抽象的な「ジョブ実行」を 3 層に分解すると挙動が鮮明になります。① **Job（定義）**＝使うコンテナイメージ、実行時 SA、タイムアウト、リトライ回数などの設計図。② **Execution（実行）**＝「今夜 2 時の 1 回分の実行」という履歴単位。③ **Task（タスク）**＝1 回の実行の中で並列に動く個別のコンテナ群です。\nたとえば `--tasks=10 --parallelism=5` と指定すれば、1,000 件の PDF を 100 件ずつ 10 タスクに分担し、最大 5 コンテナ同時で処理して、全タスクが `exit 0` で終わったら課金も即終了します。',
      },
      {
        heading: '起動トリガーの具体例と認証の違い',
        body: '「呼び出し元」の具体例もサービスとジョブで異なります。サービスの呼び出し元は「社内ポータルのブラウザ・他マイクロサービス・Pub/Sub Push・Cloud Tasks」などで、`roles/run.invoker` を使って HTTP 経由で呼びます。\nジョブの起動トリガーは「Cloud Scheduler（定期実行）・Cloud Workflows（複数処理の連結）・`gcloud run jobs execute`（手動運用）」などで、ジョブ実行 API を呼ぶ主体に `roles/run.invoker`（または `roles/run.developer`）を付与して起動します。',
      },
    ],
    miniQuiz: {
      prompt: 'Cloud Run ジョブのコンテナは、Cloud Run サービスと同じように `$PORT`（例：8080 番ポート）で HTTP サーバーを待ち受ける必要がありますか？',
      answer: '不要です。ジョブはポートをリッスンせず、スクリプトやコマンドを実行して処理が終わったら終了コード `0` でプロセスを終了させます。逆にサービスは起動時に指定ポートでリッスンしないと Ready にならず失敗します。',
    },
    flipCondition:
      'もし「1 件 2 秒で終わる短い非同期処理」をイベント発生のたびに何万件も受け取りたい場合（例：ファイル 1 件アップロードごとの即時処理）は、ジョブを毎回起動するより Cloud Tasks や Pub/Sub から Cloud Run サービス（HTTP）へ Push する構成の方が低遅延・高スループットです。',
    docLinks: [
      { label: 'Cloud Run ジョブの作成と実行', url: 'https://docs.cloud.google.com/run/docs/create-jobs' },
      { label: 'サービスとジョブの使い分け', url: 'https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run' },
      { label: 'Cloud Scheduler によるジョブ定期実行', url: 'https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule' },
    ],
    ankiCardIds: ['pca-w02-001', 'pca-w02-002', 'pca-w02-003', 'pca-w02-004'],
    labPredictionPrompt:
      'もし HTTP ポートをリッスンしないバッチ用コンテナを誤って Cloud Run サービスとしてデプロイしたら、どの段階で失敗するか？',
    labGuide: {
      ...WEEK02_CORE_LAB_GUIDE,
      predictions: [
        {
          id: 'pred-1',
          question:
            '予測 1：HTTP ポート（`$PORT`）を開かないバッチ用スクリプトを、誤って Cloud Run「サービス」としてデプロイすると、何が失敗理由として表示されるか？',
          placeholder: '例：コンテナがポート 8080 をリッスンせず Startup Probe に失敗し、リビジョンが Ready にならずデプロイ失敗になるはず…',
        },
        {
          id: 'pred-2',
          question:
            '予測 2：Cloud Run ジョブで `--tasks=5` のうち Task 2 だけが途中エラー（exit 1）になった場合、ジョブ全体の再試行はどう動くか？',
          placeholder: '例：成功した他タスクではなく、失敗した Task 2 だけが `max-retries` の回数まで自動再試行されるはず…',
        },
        {
          id: 'pred-3',
          question:
            '予測 3：既存の `week01-manual-api`（サービス）と新しい夜間バッチ（ジョブ）は、同じ専用実行時 SA を使い回すべきか、分けるべきか？',
          placeholder: '例：API は読み取り専用（Object Viewer）、索引バッチは書き込みが必要なら、最小権限のため実行時 SA を分けるべき…',
        },
      ],
    },
  },
  {
    id: 'w02-p2',
    week: 2,
    part: 2,
    domain: 'リリース',
    shortTitle: 'リビジョン・段階切替＆ロールバック',
    title: 'リビジョン・トラフィック段階切替＆即時ロールバック',
    tagline: '「起動・Ready」「入口認証」「トラフィック配分」を分離し、0% 検証 → 10% カナリア → 3 秒ロールバックの状態変化を体感する',
    story: {
      episodeLabel: '第6話',
      hookTitle: '新バージョンで 500 急増！再ビルドなしで即戻せる？',
      request:
        '検索アルゴリズムを刷新したマニュアル API の `v2` がついに完成した。サポート部長からは「コールセンターは昼も稼働中なので、メンテナンス画面は出さずに無停止で切り替えてほしい。万が一エラーや回答崩れが出たら、10 秒以内に前の `v1` へ戻せる安全網を確認してから出してくれ」と念を押された。',
      goal:
        '本番ユーザーへ 1 リクエストも流さない状態でクラウド上の `v2` を実機検証し、問題なければ `10% → 50% → 100%` と段階的に移行。異常検知時はコンテナの再ビルドを一切待たず、`v1=100%` へ即座に切り戻せるリリース手順を標準化する。',
      challenge:
        '普段通りに `gcloud run deploy` を実行すると、コンテナが起動（Ready）した瞬間に本番トラフィックの 100% が一気に `v2` へ流れ込んでしまう。さらに厄介なのは「起動チェック（Startup Probe）に通った＝業務ロジックが正常」ではないことだ。実際に特定の製品型番だけで 500 エラーが出る不具合が潜んでいた場合、旧コードを取り出して再ビルド・再デプロイしていたら復旧まで数分も止まってしまう。',
      nextBridge: {
        nextLessonId: 'w02-p3',
        nextLabel: '第7話：スケーリング・同時実行数・コールドスタートへ',
        teaser:
          'タグ URL 検証 → 10% カナリア → 即時ロールバックの手順が定着し、`v2` も無事 100% 本番展開できた！ところが全社公開した翌朝、サポート窓口から「朝 9 時の最初の人だけ 4 秒も待たされる」という新たな問い合わせが飛び込んでくる。',
      },
    },
    visualTypeLabel: 'インタラクティブ状態遷移図（ステップ再生＋スライダー）',
    estimatedMinutes: 7,
    examQuiz: {
      title: '本番へ流さず新リビジョンを検証し、段階切替する手順は？',
      scenario:
        '稼働中の非公開 Cloud Run サービス（現在 `v1` が 100%）に新機能 `v2` をデプロイします。いきなり本番ユーザーへ当てず、まず担当者だけが `v2` を動作確認し、その後 10% のトラフィックを流して異常がなければ 100% へ切り替えたいです。最適な手順はどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '通常通りデプロイして `v2` に 100% 切り替え、エラーログが出たら急いで旧ソースコードをチェックアウトして再ビルド・再デプロイする。',
          correct: false,
          rationale:
            '事前検証なしに全ユーザーへ影響が及び、さらに障害時の再ビルドには数分かかるため復旧目標を満たせません。',
        },
        {
          id: 'B',
          label: 'B',
          text: '`--no-traffic --tag v2` で本番 0% のままデプロイし、専用タグ URL で動作確認後、`update-traffic` で 10% → 100% へ段階切替する。異常時はトラフィックだけ `v1=100%` へ即戻す。',
          correct: true,
          rationale:
            '正解。リビジョンは不変（Immutable）なため、`--no-traffic` で起動・Ready とタグ URL 検証を終えてから段階配信でき、異常時も再ビルド不要で数秒で `v1` へ戻せます。',
        },
        {
          id: 'C',
          label: 'C',
          text: '別名の新しい Cloud Run サービス `week01-manual-api-v2` を毎回作り、全社内クライアントの接続先 URL を手動で書き換えてもらう。',
          correct: false,
          rationale:
            'サービス URL が変わると全呼び出し元の修正が必要になり、同一 URL 上での割合分割（カナリア配信）や即時ロールバックができません。',
        },
        {
          id: 'D',
          label: 'D',
          text: '`v1` リビジョンを削除してから `v2` をデプロイし、旧コンテナと混ざらないようにする。',
          correct: false,
          rationale:
            '安定稼働している `v1` リビジョンを消すと、問題発生時に即時ロールバックできる戻し先を失います。',
        },
      ],
      summary:
        'Cloud Run のリビジョンは不変スナップショット。`0% タグ検証 → 10% カナリア → 50% → 100%` の段階切替と、ルーティング変更だけの即時ロールバックが標準パターンです。',
    },
    thinkingChart: [
      {
        label: '1. 4 つの段階を別物として区別する',
        detail:
          '① アプリ起動・Ready（Startup Probe 通過）→ ② 入口認証（`roles/run.invoker`＋ID トークン）→ ③ トラフィック割当（%）→ ④ 業務ロジック成功（200 OK）。',
      },
      {
        label: '2. 0% デプロイ＋タグ URL で先に確かめる',
        detail:
          '`--no-traffic --tag v2` を使うと、本番 URL は `v1=100%` のまま `https://v2---<service-url>` で `v2` 単体を検証できる（非公開サービスの入口認証も同様に効く）。',
      },
      {
        label: '3. 異常時は「再ビルドせず」ルーティングだけ戻す',
        detail:
          '安定版 `v1` は不変リビジョンとして残っているため、`update-traffic --to-revisions=v1=100` を打つだけで数秒以内に 100% 復旧する。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'なぜ「再ビルドなし・数秒」でロールバックが成立するのか？（Why）',
        body: '従来のサーバー運用では、1 台のサーバー上でアプリファイルを上書きしていたため、戻すには古いコードを取り出してビルド・配置し直す必要がありました。\nCloud Run では、デプロイのたびに「コンテナイメージのダイジェスト・環境変数・実行時 SA・メモリ設定」を丸ごと凍結した**不変（Immutable）リビジョン**を作ります。前の `v1` がそのまま無傷で残っているため、ロールバックとは「入口の振り分け表（トラフィック比率）を `v1: 100%` に書き換えるだけ」の軽量操作になり、数秒で完了します。',
        callout: '「Ready になった（起動できた）」ことと「業務機能が正しい（500 を返さない）」ことは別です。だからこそ Ready 後もすぐ 100% にせず、タグ URL と 10% カナリアで業務応答を観測します。',
      },
      {
        heading: '起動・認証・Ready・トラフィックの 4 関門で原因を切り分ける',
        body: '実務や試験で「デプロイしたのに動かない」と報告されたら、4 関門のどこで止まったかを見ます。\n① コンテナが `$PORT` を開けない・起動時エラー → **Startup Probe 失敗で Ready にならず、旧版のまま保護される**。② Ready になったが入口で 403 → **入口認証（Invoker／ID トークン）**の問題。③ Ready なのに新機能が返らない → **トラフィック割当が 0%（旧版に流れている）**。④ v2 に届いて 500 → **業務ロジックや実行時 SA の権限不良**（即ロールバック対象）。',
      },
    ],
    miniQuiz: {
      prompt: '新リビジョン `v2` が起動時の環境変数不足でクラッシュし、Startup Probe を通過できませんでした。稼働中の `v1`（現在 100%）への本番トラフィックはどうなりますか？',
      answer: '影響を受けず `v1` に 100% 流れ続けます。Cloud Run は新リビジョンが Ready（Startup Probe 通過）になるまでトラフィックを切り替えません。',
    },
    flipCondition:
      'もし `v2` のリリースと同時に「後方互換性のない DB スキーマ変更（旧列の削除など）」を行ってしまうと、トラフィックを `v1` へ戻しても `v1` が新 DB を読めず復旧できません。段階リリースと即時ロールバックを成立させるには、DB 変更を「先に追加 → アプリ切替 → 後から旧列削除（Expand and Contract）」に分ける必要があります。',
    docLinks: [
      { label: '段階的ロールアウトとロールバック', url: 'https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration' },
      { label: 'リビジョンの管理（不変スナップショット）', url: 'https://docs.cloud.google.com/run/docs/managing/revisions' },
      { label: 'コンテナのヘルスチェック（Probe）', url: 'https://docs.cloud.google.com/run/docs/configuring/healthchecks' },
    ],
    consoleScreens: [
      {
        id: 'w02-p2-cloud-run-revisions',
        title: 'Cloud Run「リビジョン」タブ＆トラフィック管理',
        menuPath: 'Cloud Run › サービス詳細 › リビジョン',
        consoleUrl: 'https://console.cloud.google.com/run?hl=ja',
        expectedFile: 'app/public/screenshots/week02/w02-p2-cloud-run-revisions.png',
        caption: '不変リビジョン一覧、各版の Ready 状態、トラフィック配分（%）、およびリビジョンタグ URL を一覧確認・即時切替する重要画面です。',
        lookFor: [
          {
            label: '「トラフィックを管理」ボタン',
            detail: '再ビルドなしで `v1: 90% / v2: 10%` への分割や、`v1: 100%` への即時ロールバックを実行する場所です。',
          },
          {
            label: 'リビジョンごとのタグ URL とダイジェスト',
            detail: '本番 0% のまま検証できる `https://<tag>---...` URL と、固定された `@sha256:...` イメージを確認できます。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w02-005', 'pca-w02-006', 'pca-w02-007', 'pca-w02-008'],
    labPredictionPrompt:
      '`--no-traffic --tag v2` でデプロイした直後の本番 URL とタグ URL の挙動差、および `v1=100%` 切り戻し時の所要時間はどうなるか？',
    labGuide: WEEK02_CORE_LAB_GUIDE,
  },
  {
    id: 'w02-p3',
    week: 2,
    part: 3,
    domain: 'スケール',
    shortTitle: 'スケール・同時実行・コールドスタート',
    title: '自動スケーリング・コールドスタートと設定の 3 階層',
    tagline: '「同時リクエスト ÷ 同時実行数」で台数が決まる仕組みと、min=0 のコールドスタート vs min=1 のアイドル課金を体感する',
    story: {
      episodeLabel: '第7話',
      hookTitle: '朝 9 時の 1 人目だけ 4 秒遅い…でも夜間課金は抑えたい！',
      request:
        'マニュアル API を全社ポータルへ正式展開した翌朝、コールセンターから「毎朝 9 時に最初に検索ボタンを押したオペレーターだけ 4 秒近く固まる。2 人目以降は 0.2 秒で返るのに、なぜ朝イチだけ遅いのか？」と相談が届いた。同時に財務担当からも「来月の新製品発表日にアクセスが 10 倍へ跳ねたとき、コンテナが無制限に増えて請求や裏側 DB がパンクしないようにしてほしい」と要望が入った。',
      goal:
        '0 台からの起動遅延（コールドスタート）が起きるメカニズムと 3 段階の対策（軽量化・起動時 CPU ブースト・`min-instances`）を整理し、同時実行数（Concurrency）と `max-instances` を組み合わせて「初回遅延・コスト・急増保護」の最適バランスを設計する。',
      challenge:
        '焦ったメンバーから「じゃあ `min-instances=10` にして常時 10 台立てておこう」「暴走防止で `max-instances=1` に縛れば安心」と極端な案が出た。しかし前者では誰も使わない夜間や休日も 10 台分のアイドル課金が膨らみ、後者では朝ピークの同時アクセス集中時に処理枠を超過して `429 Too Many Requests` で現場業務を止めてしまう。さらに「上限設定を変えたら既存リビジョンが上書きされるのか？」という設定階層の混乱も起きた。',
      nextBridge: {
        nextLessonId: 'w02-p4',
        nextLabel: '第8話：Artifact Registry とコンテナイメージ管理へ',
        teaser:
          'コールドスタート対策とスケール上限、設定の 3 階層まで見通せるようになった！残る最後の宿題は「コンテナイメージの倉庫管理」。ある日、メンバーが `:latest` タグで再デプロイしたところ「昨日と同じ版に戻したはずなのに別物が動く」というヒヤリハットが発生する。',
      },
    },
    visualTypeLabel: 'スケール調整シミュレータ ＋ 設定 3 階層骨格図',
    estimatedMinutes: 7,
    examQuiz: {
      title: '朝イチのコールドスタートを無くしつつ暴走課金も防ぐ設定は？',
      scenario:
        '社内マニュアル API は夜間アクセスがゼロになりますが、平日の初回アクセス時の 4 秒の起動遅延（コールドスタート）は許容できません。一方で、万が一のループやアクセス急増でも同時稼働コンテナは 5 台までに抑えたいです。最も適切な Cloud Run の設定はどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: '`min-instances=0` のままにし、Cloud Billing の予算アラートを低く設定してコールドスタートを防ぐ。',
          correct: false,
          rationale:
            '予算アラートは費用通知であり、コールドスタート解消とは無関係です。`min-instances=0` ではアイドル後に 0 台へ縮むため初回起動遅延が残ります。',
        },
        {
          id: 'B',
          label: 'B',
          text: '`min-instances=1` で常時 1 台をウォーム待機させつつ、`max-instances=5` を設定し、さらにコンテナイメージ軽量化や起動時 CPU ブーストを併用する。',
          correct: true,
          rationale:
            '正解。`min-instances=1` で 0 台からの起動待ちを回避でき、`max-instances=5` でスパイク時の台数暴走を同期的に頭打ちにできます（アイドル待機分の小さなコストとのトレードオフ）。',
        },
        {
          id: 'C',
          label: 'C',
          text: '`concurrency=1` に下げて 1 台あたりの処理を軽くし、`max-instances=1` に固定する。',
          correct: false,
          rationale:
            '`concurrency=1` かつ `max-instances=1` では同時に 1 リクエストしか処理できず、2 人目が同時にアクセスした時点で待機や 429 拒否が頻発します。',
        },
        {
          id: 'D',
          label: 'D',
          text: 'Cloud Run ジョブへ移行して 24 時間起動し続ける。',
          correct: false,
          rationale:
            'Cloud Run ジョブはバッチ完結型であり、HTTP リクエストを受け付ける Web API には使えません。',
        },
      ],
      summary:
        'スケール設計は「`concurrency`（1 台で何件同時処理するか）」「`min-instances`（0 からの起動待ちを防ぐ下限）」「`max-instances`（暴走・下流 DB 保護の上限）」の 3 パラメータで決まります。',
    },
    thinkingChart: [
      {
        label: '1. 必要台数は「同時リクエスト ÷ Concurrency」で見積もる',
        detail:
          '同時実行数（デフォルト 80）が高いほど少ない台数で捌ける。CPU 集約・スレッド非安全な処理だけ値を下げる。',
      },
      {
        label: '2. コールドスタート対策は「軽量化＋min-instances」',
        detail:
          '0 台からの起動遅延はイメージサイズ・初期化処理の削減と起動時 CPU ブーストで縮め、遅延許容ゼロなら `min-instances >= 1` でウォーム待機させる。',
      },
      {
        label: '3. 設定の 3 階層（クォータ / サービス / リビジョン）を意識する',
        detail:
          'プロジェクトのクォータが全体天井、サービス設定がトラフィック・入口、リビジョン設定が `min/max-instances` と `concurrency`。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'コールドスタートはなぜ起きるか？どう縮めるか？（Why）',
        body: 'Cloud Run の大きな魅力は「アクセスがない時間は 0 台に縮んで課金ゼロ（スケール・トゥ・ゼロ）」になることです。しかし 0 台のときに最初のリクエストが届くと、Google Cloud が裏側で ① インスタンス確保 → ② コンテナイメージ読み込み → ③ アプリ起動・Startup Probe 通過、を完了するまで最初の 1 件目が待たされます。これが**コールドスタート**です。\n対策はコストの低い順に 3 段階あります。① 不要なパッケージを削ってコンテナイメージを軽くし、起動時の重い初期化を省く。② **起動時 CPU ブースト（Startup CPU Boost）**を有効にして起動瞬間だけ CPU を一時増強する。③ それでも初回遅延をゼロにしたい本番 API では `min-instances=1` 以上を設定して常にウォーム待機させる（代わりにアイドル課金が発生する）。',
        callout: '「常に `min-instances` を増やす」のが正解ではありません。開発環境や遅延許容できる内部ツールは `min=0` でコスト最小、ユーザー向け本番 API だけ `min>=1` とメリハリを付けます。',
      },
      {
        heading: '同時実行数（Concurrency）と `max-instances` の意外な使い道',
        body: '同時実行数（Concurrency＝1 台のコンテナが同時に処理できるリクエスト数、デフォルト 80）は、Cloud Run が「1 リクエストごとに 1 コンテナ」ではなく効率よくスケールできる理由です。Web API のような I/O 待ち中心（GCS や外部 API の応答待ち）の処理なら、1 台で同時に 40〜80 件捌いても余裕があり、コールドスタート発生回数も激減します。\nまた `max-instances` は第1週で学んだ「暴走課金ガード」だけでなく、**裏側のデータベース（Cloud SQL 等）の接続数上限を守る安全弁**としても超重要です。上限に達した超過リクエストはキュー待ち後に `429 Too Many Requests` で保護されます。',
      },
      {
        heading: '実機で迷う「設定の 3 階層」：クォータ・サービス・リビジョン',
        body: '「上限を変えたのに反映されない」「別のリビジョンにしたら元に戻った」という混乱は、3 つの階層を混ぜると起きます。\n① **プロジェクトのクォータ**（最上位の天井：リージョン全体の vCPU・総インスタンス枠）、② **サービス設定**（トラフィック比率・入口認証・Ingress）、③ **リビジョン設定**（`min-instances`・`max-instances`・`concurrency`・CPU/メモリ・環境変数）。リビジョン設定を変えると必ず新しいリビジョンが生成され、旧リビジョンには影響しません。',
      },
    ],
    miniQuiz: {
      prompt: '同時リクエスト数が 120 件あり、Cloud Run の `concurrency` が 80、`max-instances` が 5 に設定されています。理想状態で必要なコンテナインスタンス数は何台ですか？',
      answer: '2 台です（120 ÷ 80 = 1.5 を切り上げて 2 台）。`max-instances=5` の範囲内なので 429 にならず処理できます。もし `concurrency=10` かつ `max-instances=5` なら最大 50 件しか同時処理できず、残りは待機または 429 になります。',
    },
    flipCondition:
      'もしアプリが「動画エンコードや大規模ローカル推論など 1 リクエストで CPU を 100% 使い切る処理」や「スレッド非安全なレガシーライブラリ」の場合は、デフォルトの `concurrency=80` のままだと互いに足を引っ張って応答が劣化します。その条件では `concurrency=1`（または少数）へ意図的に下げるのが正解に反転します。',
    docLinks: [
      { label: '最小インスタンス数の設定', url: 'https://docs.cloud.google.com/run/docs/configuring/min-instances' },
      { label: '最大インスタンス数の設定', url: 'https://docs.cloud.google.com/run/docs/configuring/max-instances' },
      { label: '同時実行数（Concurrency）の設定', url: 'https://docs.cloud.google.com/run/docs/configuring/concurrency' },
      { label: 'コールドスタート最適化のヒント', url: 'https://docs.cloud.google.com/run/docs/tips/general' },
    ],
    ankiCardIds: ['pca-w02-009', 'pca-w02-010', 'pca-w02-011', 'pca-w02-012'],
    labPredictionPrompt:
      '`week01-manual-api` の `max-instances` や `concurrency` を変更したとき、新しいリビジョンは生成されるか？',
    labGuide: {
      ...WEEK02_CORE_LAB_GUIDE,
      predictions: [
        {
          id: 'pred-1',
          question:
            '予測 1：`week01-manual-api` で `--max-instances=2 --concurrency=40` だけを更新してデプロイすると、既存リビジョンが書き換わるか、それとも新しいリビジョンが生成されるか？',
          placeholder: '例：`max-instances` と `concurrency` はリビジョン層の設定なので、既存版は書き換わらず新しいリビジョンが 1 つ作られるはず…',
        },
        {
          id: 'pred-2',
          question:
            '予測 2：`min-instances=0` のサービスへ 15 分以上ぶりに最初のリクエストを送ったときと、直後に 2 回目を送ったときで、応答時間（ミリ秒）とログのコンテナ起動記録はどう違うか？',
          placeholder: '例：1 回目はコールドスタートでコンテナ起動ログが出て数秒かかり、2 回目はウォーム状態の同インスタンスに当たり数十〜数百 ms で返るはず…',
        },
        {
          id: 'pred-3',
          question:
            '予測 3：開発用の個人サンドボックスで学習が終わったあと、`min-instances=1` を設定したまま放置するとどうなるか？',
          placeholder: '例：リクエストがなくてもアイドルインスタンス料金が発生し続けるので、学習後は必ず `min-instances=0` に戻す必要がある…',
        },
      ],
    },
  },
  {
    id: 'w02-p4',
    week: 2,
    part: 4,
    domain: 'レジストリ',
    shortTitle: 'Artifact Registry とイメージ管理',
    title: 'Artifact Registry とコンテナイメージの安全な管理',
    tagline: '「タグ（付箋） vs ダイジェスト（固有指紋）」と、裏側で動く 4 つの主体・リージョン配置・脆弱性管理を押さえる',
    story: {
      episodeLabel: '第8話',
      hookTitle: ':latest で戻したつもりが別物＆共有倉庫からの pull で 403！',
      request:
        '開発メンバーが 3 人に増え、`week01-manual-api` のコンテナイメージを共有ビルドプロジェクトの Artifact Registry で一元管理し始めた。ところが週明けに 2 つの問題が同時に噴出する。① 検証環境で「昨日動いていた `:latest` イメージで戻した」はずが、裏で別メンバーが上書き push しており違う挙動になってしまった。② セキュリティ監査で「古いイメージが数百件溜まり、既知の脆弱性チェックも未設定」と指摘を受けた。',
      goal:
        'Artifact Registry を本番標準のイメージ倉庫として正しく設計し、ダイジェスト（`@sha256:...`）固定による 100% の再現性・Cloud Run と同リージョン配置・リポジトリ単位の最小権限 IAM・脆弱性スキャンとクリーンアップポリシーまで一貫したサプライチェーンを確立する。',
      challenge:
        'さらに共有ビルドプロジェクトの Artifact Registry から本番プロジェクトの Cloud Run へデプロイしようとした瞬間、「イメージを pull できない（403 Permission Denied）」で完全に停止した。慌ててアプリの「実行時 SA（`sa-reader`）」へ `roles/artifactregistry.reader` を付けたのにエラーは消えず――裏側で倉庫からイメージを運んでいる「本当の主体（Cloud Run サービスエージェント）」を見落としていたのだ。',
      nextBridge: {
        nextLabel: '第2週ストーリー完了 → 次は第3週（Storage 版管理・Firestore・Cloud Tasks）へ',
        teaser:
          'コンテナを安全に保管・段階リリース・伸縮・切り戻しできる土台が完全に整いました！第3週では、マニュアル本体や回答履歴をどう守るか――Cloud Storage の版管理、Firestore のデータ設計、そして Cloud Tasks による非同期再試行と冪等性へ進みます。',
      },
    },
    visualTypeLabel: '静的骨格図（サプライチェーン＆4主体分離）',
    estimatedMinutes: 6,
    examQuiz: {
      title: '再現性のある本番リリースと共有リポジトリからの pull 権限は？',
      scenario:
        '共有ビルド用プロジェクトの Artifact Registry（東京リージョン）に保管したコンテナイメージを、本番プロジェクトの Cloud Run（東京リージョン）へデプロイします。昨日と同じバイナリを確実に再現でき、かつ最小権限で pull させる設計として最も適切なものはどれですか？',
      choices: [
        {
          id: 'A',
          label: 'A',
          text: 'イメージは `:latest` タグで指定し、Cloud Run の「実行時サービスアカウント」に共有リポジトリの `roles/artifactregistry.reader` を付ける。',
          correct: false,
          rationale:
            '2 点とも誤りです。`:latest` は上書きで中身が変わるため再現性がなく、さらにイメージの pull を行うのは実行時 SA ではなく「Cloud Run サービスエージェント」です。',
        },
        {
          id: 'B',
          label: 'B',
          text: 'イメージを不変のダイジェスト（`@sha256:...`）で指定し、本番プロジェクトの「Cloud Run サービスエージェント」に共有リポジトリ単体の `roles/artifactregistry.reader` を付ける。',
          correct: true,
          rationale:
            '正解。ダイジェスト指定で中身を厳密に固定でき、別プロジェクトの AR から pull する主体である Cloud Run サービスエージェントへ対象リポジトリ単体の読み取りロールを付与するのが最小権限です。',
        },
        {
          id: 'C',
          label: 'C',
          text: '旧 Container Registry（`gcr.io`）へ移行し、リポジトリをインターネット公開（`allUsers`）にして誰でも pull できるようにする。',
          correct: false,
          rationale:
            'Container Registry（GCR）は非推奨・廃止済みであり、さらに社内イメージを `allUsers` で公開するのは重大なセキュリティ違反です。',
        },
        {
          id: 'D',
          label: 'D',
          text: '米国マルチリージョンの Artifact Registry に保管し、本番プロジェクトの `Owner` 権限を Cloud Build SA へ付与する。',
          correct: false,
          rationale:
            'Cloud Run と別リージョンに置くとイメージ取得遅延やクロスリージョン転送費が増え、`Owner` 付与も最小権限に反します。',
        },
      ],
      summary:
        'Artifact Registry 設計の 4 原則は「① ダイジェスト（`@sha256:...`）で固定 ② Cloud Run と同リージョン配置 ③ リポジトリ単位の最小権限（pull 主体はサービスエージェント）④ 脆弱性スキャン＆クリーンアップポリシー」。',
    },
    thinkingChart: [
      {
        label: '1. タグ（付箋）ではなくダイジェスト（固有指紋）で固定する',
        detail:
          '`:v2` や `:latest` は上書き可能。本番リリースや切り戻しの再現性を保証するには、中身から生成される `@sha256:...` を指定する。',
      },
      {
        label: '2. 誰が push し、誰が pull するか（裏の 2 主体）を区別する',
        detail:
          'push するのは「Cloud Build 用 SA（`roles/artifactregistry.writer`）」、pull するのは「Cloud Run サービスエージェント（`roles/artifactregistry.reader`）」。実行時 SA ではない。',
      },
      {
        label: '3. リージョン配置・脆弱性スキャン・掃除まで設計する',
        detail:
          'Cloud Run と同じリージョン（例：`asia-northeast1`）にリポジトリを作り、Artifact Analysis で脆弱性を検知、クリーンアップポリシーで古い不要イメージの保管費を抑える。',
      },
    ],
    deepDiveParagraphs: [
      {
        heading: 'なぜ `:latest` ではなく `@sha256:...` ダイジェスト固定なのか？（Why）',
        body: 'コンテナの「タグ（例：`:latest` や `:prod`）」は、箱の表面に貼る付箋にすぎません。誰かが同じタグで新しいイメージを push すると、付箋は新しい箱へ貼り替わってしまいます。\n一方「ダイジェスト（例：`@sha256:9f86d0...`）」はイメージの中身全体から計算される暗号ハッシュ（固有指紋）です。中身が 1 バイトでも変われば必ず別の値になるため、ダイジェストでデプロイ・記録しておけば「テストを通過したまったく同じバイナリ」を 100% 再現できます。',
        callout: 'Cloud Run 自身も、タグ指定でデプロイを受け取ると内部で即座に `@sha256:...` ダイジェストへ解決し、リビジョンに固定記録します。',
      },
      {
        heading: 'なぜ旧 Container Registry（GCR）ではなく Artifact Registry なのか？',
        body: '昔の Container Registry（`gcr.io`）は裏側でプロジェクト共通の Cloud Storage バケットを使う設計だったため、「アプリごとに別リポジトリを作って IAM を分ける」ことができず、Docker 以外の言語パッケージも置けませんでした。\n標準後継の **Artifact Registry**（`asia-northeast1-docker.pkg.dev/...`）では、① リポジトリ単位の細かい IAM 分離、② リージョン指定（Cloud Run と同リージョンに置いて起動高速化＆クロスリージョン転送費ゼロ）、③ Docker だけでなく Python / npm / Maven / Helm 等の統一管理、④ 自動クリーンアップポリシーによる保管コスト最適化、が標準で揃っています。',
      },
      {
        heading: '超頻出の落とし穴：別プロジェクトの AR から pull するとき誰に権限を付ける？',
        body: '第1週の実機観測でも、`gcloud run deploy --source .` の裏側で開発者とは別の **Cloud Build ビルド用 SA** が動いていて権限不足を踏みました。Artifact Registry でも同じ「裏の登場人物」がいます。\nCloud Run がコンテナを起動するために Artifact Registry からイメージを pull する主体は、アプリ実行時の SA（ランタイム SA）ではなく、Google がプロジェクトごとに自動生成する **Cloud Run サービスエージェント**（`service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`）です。同一プロジェクト内なら自動で権限が付いていますが、共有プロジェクトの AR を使うときはこのサービスエージェントへ `roles/artifactregistry.reader` を付ける必要があります。',
      },
    ],
    miniQuiz: {
      prompt: '共有ビルドプロジェクトの Artifact Registry に置いたイメージを、本番プロジェクトの Cloud Run へデプロイしたところ「イメージを pull できない」権限エラーになりました。どのプリンシパルに `roles/artifactregistry.reader` を付けますか？',
      answer: '本番プロジェクトの「Cloud Run サービスエージェント（`service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`）」です。アプリの実行時 SA ではない点が最大のひっかけポイントです。',
    },
    flipCondition:
      'もし「本番環境へデプロイできるコンテナを、セキュリティスキャンと承認を通過した署名済みイメージだけに強制制限したい」という高度なガバナンス要件が加わったら、Artifact Registry ＋ Artifact Analysis に加えて **Binary Authorization**（第12〜13週で詳細学習）を組み合わせます。',
    docLinks: [
      { label: 'Artifact Registry の概要とリポジトリ設計', url: 'https://docs.cloud.google.com/artifact-registry/docs/overview' },
      { label: 'アクセス制御（IAM ロールとサービスエージェント）', url: 'https://docs.cloud.google.com/artifact-registry/docs/access-control' },
      { label: '別プロジェクトのイメージを Cloud Run へデプロイ', url: 'https://docs.cloud.google.com/run/docs/deploying#other-projects' },
      { label: 'クリーンアップポリシーによる古いイメージ自動削除', url: 'https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy' },
    ],
    consoleScreens: [
      {
        id: 'w02-p4-artifact-registry',
        title: 'Artifact Registry「リポジトリ」とイメージのダイジェスト一覧',
        menuPath: 'Artifact Registry › リポジトリ',
        consoleUrl: 'https://console.cloud.google.com/artifacts?hl=ja',
        expectedFile: 'app/public/screenshots/week02/w02-p4-artifact-registry.png',
        caption: 'リージョン配置・タグと不変ダイジェスト（`sha256:...`）・リポジトリ単位の IAM 権限・脆弱性スキャン結果を確認する重要画面です。',
        lookFor: [
          {
            label: 'ロケーション列（Cloud Run と同リージョンか）',
            detail: 'Cloud Run と同じ `asia-northeast1` に配置すると pull 速度とネットワーク転送コストを最適化できます。',
          },
          {
            label: 'イメージ詳細のダイジェスト列と「権限」タブ',
            detail: 'タグとは別に不変の `sha256:...` が割り当てられていること、リポジトリ単体で読み書き IAM を絞れることを確認します。',
          },
        ],
      },
    ],
    ankiCardIds: ['pca-w02-013', 'pca-w02-014', 'pca-w02-015', 'pca-w02-016'],
    labPredictionPrompt:
      '`gcloud run deploy --source .` を 2 回実行したあと、Artifact Registry 側にはいくつのダイジェストが保存され、Cloud Run の各リビジョンはどう参照しているか？',
    labGuide: WEEK02_CORE_LAB_GUIDE,
  },
];
