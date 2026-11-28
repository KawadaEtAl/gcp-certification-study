import { LESSON_KEY_TERM_IDS } from '../../data/glossary';
import { useState, type ReactNode } from 'react';
import { ArrowDown, Check, RotateCcw, X } from 'lucide-react';
import { Art, type ArtName } from '../ui/Art';
import { Comparison, ChoiceGroup, RatioBar, RangeControl, Insight } from '../ui/Diagrams';
import { Analogy, TermLink, GuidedText } from '../ui/Help';
import { CodeBlock, Disclosure } from '../ui/Lesson';
import { StageStrip } from '../ui/StageStrip';

/* ---------- Week 1 Part 2: Keyless Auth + Token Comparison ---------- */
const AUTH_SCENARIOS = [
  {
    label: 'Cloud Run (ADC)',
    ttlLabel: '約 1 時間（自動更新）',
    ttlPct: 14,
    bad: false,
    steps: [
      { art: 'identity' as ArtName, label: 'Cloud Run', note: 'sa-reader 割当済', result: 'pass' as const },
      { art: 'key' as ArtName, label: 'メタデータサーバー', note: '169.254.169.254', result: 'pass' as const },
      { art: 'badge' as ArtName, label: '短命トークン', note: 'TTL 約1時間', result: 'pass' as const },
      { art: 'bucket' as ArtName, label: 'Cloud Storage', note: 'IAM 検証で 200', result: 'pass' as const },
    ],
    title: 'メタデータサーバーと ADC で鍵ファイルゼロ',
    body: 'Cloud Run コンテナ内からはリンクローカルのメタデータサーバーへ直接到達できます。ADC が自動的に sa-reader の短命トークンを取得・更新するため、JSON 鍵は 1 つも不要です。',
    json: {
      environment: 'Cloud Run',
      credentialSource: 'metadata.google.internal (ADC)',
      tokenLifetime: '~3600s (auto-refreshed)',
      staticJsonKeyRequired: false,
    },
  },
  {
    label: '外部 CI (WIF)',
    ttlLabel: '数分〜1 時間（都度交換）',
    ttlPct: 10,
    bad: false,
    steps: [
      { art: 'repository' as ArtName, label: 'GitHub Actions', note: 'OIDC トークン発行', result: 'pass' as const },
      { art: 'policy' as ArtName, label: 'WIF プール', note: 'リポジトリ条件検証', result: 'pass' as const },
      { art: 'key' as ArtName, label: 'GCP STS', note: '短命トークンへ交換', result: 'pass' as const },
      { art: 'server' as ArtName, label: 'GCP API', note: '最小権限でデプロイ', result: 'pass' as const },
    ],
    title: '外部 CI は OIDC トークンを WIF + STS で短命交換',
    body: 'GitHub Actions などの外部環境からは GCP のメタデータサーバーに届きません。代わりに CI が発行した OIDC トークンを WIF と STS で検証・交換し、attributeCondition で特定リポジトリ・main ブランチに絞ります。',
    json: {
      environment: 'GitHub Actions (External CI)',
      proof: 'Signed OIDC JWT',
      exchange: 'Workload Identity Federation -> STS',
      attributeCondition: "assertion.repository == 'org/manual-api' && assertion.ref == 'refs/heads/main'",
    },
  },
  {
    label: 'ローカル Mac',
    ttlLabel: '開発者 ADC / 借用で安全検証',
    ttlPct: 18,
    bad: false,
    steps: [
      { art: 'laptop' as ArtName, label: '開発者の Mac', note: 'ADC login 済', result: 'pass' as const },
      { art: 'badge' as ArtName, label: '開発者本人 / 借用', note: 'impersonate 可', result: 'pass' as const },
      { art: 'bucket' as ArtName, label: 'Cloud Storage', note: '手元と本番のID差に注意', result: 'pass' as const },
    ],
    title: '手元の Mac では開発者本人の ID で動く点に注意',
    body: '同じコードでも Mac では開発者個人の ADC、Cloud Run では sa-reader が使われます。本番と同じ権限を安全に試すときは JSON 鍵を落とさず --impersonate-service-account を使います。',
    json: {
      environment: 'Local Mac',
      localPrincipal: 'developer@example.com (or impersonated sa-reader)',
      pitfall: 'Mac で動いても Cloud Run の実行時 SA に権限がなければ 403',
    },
  },
  {
    label: 'JSON キー（NG例）',
    ttlLabel: '手動削除まで無期限（漏えいリスク大）',
    ttlPct: 100,
    bad: true,
    steps: [
      { art: 'secret' as ArtName, label: '長期 JSON 鍵', note: '手動削除まで有効', result: 'stop' as const },
      { art: 'repository' as ArtName, label: '誤コミット / 流出', note: '誰でも複製可能', result: 'stop' as const },
      { art: 'bucket' as ArtName, label: '継続的な不正アクセス', note: 'ローテーション負荷大', result: 'stop' as const },
    ],
    title: '長期 JSON キーは漏えい時の影響窓が無期限',
    body: 'サービスアカウントの JSON キーは手動で失効させるまで無期限に有効です。組織ポリシー（disableServiceAccountKeyCreation）で発行自体を禁じ、キーレス構成に統一するのが鉄則です。',
    json: {
      credentialType: 'Static Service Account JSON Key',
      lifetime: 'Indefinite until manually revoked',
      recommendation: 'Avoid; enforce constraints/iam.disableServiceAccountKeyCreation',
    },
  },
];

export function AuthPaths() {
  const [envIdx, setEnvIdx] = useState(0);
  const current = AUTH_SCENARIOS[envIdx];

  const paths = [
    {
      title: '開発者の PC',
      art: 'laptop' as ArtName,
      proof: '開発者のログイン',
      lookup: (
        <>
          ローカルの <TermLink id="adc">ADC</TermLink> の認証情報を使う
        </>
      ),
      principal: '開発者本人',
    },
    {
      title: 'Cloud Run',
      art: 'identity' as ArtName,
      proof: 'サービスに実行 ID を割り当て済み',
      lookup: (
        <>
          <TermLink id="adc">ADC</TermLink> が<TermLink id="metadata-server">メタデータサーバー</TermLink>
          に問い合わせる
        </>
      ),
      principal: 'sa-reader',
    },
    {
      title: '外部 CI',
      art: 'portal' as ArtName,
      proof: (
        <>
          CI が発行した <TermLink id="oidc-token">OIDC トークン</TermLink>
        </>
      ),
      lookup: (
        <>
          <TermLink id="wif">WIF</TermLink> を使い、<TermLink id="sts">STS</TermLink> で検証・交換
        </>
      ),
      principal: 'CI の外部 ID',
    },
  ];

  return (
    <>
      <Comparison
        label="短期の認証情報を得る3つの経路"
        items={paths.map((path) => ({ id: path.title, title: path.title, art: path.art, data: path }))}
        axes={[
          { label: '根拠', value: (path) => path.proof },
          { label: '取得方法', value: (path) => path.lookup },
          { label: '使う ID', value: (path) => path.principal },
        ]}
      />

      <div className="diagram-tools" style={{ marginTop: 22 }}>
        <ChoiceGroup
          label="認証環境とトークン寿命の比較"
          choices={AUTH_SCENARIOS.map((s) => s.label)}
          value={envIdx}
          onChange={setEnvIdx}
        />
      </div>

      <StageStrip label="認証情報の取得フロー" steps={current.steps} />

      <div className="sl-card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <b>認証情報の有効期限（漏えい時の影響窓）</b>
          <span className={'sl-pill ' + (current.bad ? 'bad' : 'ok')}>{current.ttlLabel}</span>
        </div>
        <div className="ttl-bar-track">
          <div className={'ttl-bar-fill' + (current.bad ? ' bad' : '')} style={{ width: current.ttlPct + '%' }} />
        </div>
      </div>

      <Insight title={current.title}>
        <GuidedText text={current.body} />
      </Insight>

      <Disclosure title="この環境の認証設定を JSON で見る">
        <CodeBlock text={JSON.stringify(current.json, null, 2)} />
      </Disclosure>

      <h2>宛先によって、送るトークンも変わる</h2>
      <Comparison
        label="送るトークンは相手によって変わる"
        items={[
          {
            id: 'invoke',
            art: 'server',
            title: <TermLink id="run-invoker">アプリを呼ぶ</TermLink>,
            data: { dest: '非公開の Cloud Run', who: 'ポータル', token: 'ID トークン（aud = サービスURL）' },
          },
          {
            id: 'storage',
            art: 'bucket',
            title: <TermLink id="cloud-storage">資料を読む</TermLink>,
            data: { dest: 'Cloud Storage API', who: '実行用の sa-reader', token: 'OAuth アクセストークン' },
          },
        ]}
        axes={[
          { label: '宛先', value: (d) => d.dest },
          { label: '使う ID', value: (d) => d.who },
          { label: '送るもの', value: (d) => <TermLink id="id-vs-oauth-token">{d.token}</TermLink> },
        ]}
      />
      <Analogy title="送るトークンは相手によって変わる">
        窓口で見せる宛名付きの名刺（ID トークン）と、担当者が書庫で使う施設利用チケット（OAuth アクセストークン）を分けて考えます。どちらも有効なトークンを持つことと、IAM で操作を許されることは別です。
      </Analogy>
    </>
  );
}

/* ---------- Week 2 Part 0: Overview Map ---------- */
function RunBranch({
  art,
  title,
  trigger,
  split,
  children,
  result,
}: {
  art: ArtName;
  title: string;
  trigger: string;
  split: ReactNode;
  children: ReactNode;
  result: ReactNode;
}) {
  return (
    <section className="run-branch">
      <Art name={art} />
      <h3>
        <TermLink id="cloud-run-service-vs-job">{title}</TermLink>
      </h3>
      <div>{trigger}</div>
      <div className="run-split">
        <ArrowDown size={15} />
        {split}
      </div>
      <div className="run-units">{children}</div>
      <strong>{result}</strong>
    </section>
  );
}

export function OverviewMap() {
  return (
    <>
      <div className="figure run-map sheet">
        <div className="store-art">
          <Art name="image" />
          <div>
            <strong>
              コードをビルド → <TermLink id="artifact-registry">Artifact Registry</TermLink>
            </strong>
            <p>
              できた<TermLink id="container">コンテナイメージ</TermLink>を保管
            </p>
          </div>
        </div>
        <div className="run-source">
          <ArrowDown size={17} />
          <TermLink id="tag-vs-digest">ダイジェスト</TermLink>で指定し、
          <TermLink id="cloud-run">Cloud Run</TermLink> にデプロイ
        </div>
        <div className="run-fork">
          <RunBranch
            art="identity"
            title="サービス"
            trigger="ポータルからの問い合わせ"
            split={<TermLink id="traffic-split">リクエストを配分</TermLink>}
            result="マニュアルを返す"
          >
            <span>
              <TermLink id="revision">旧版 v1</TermLink>　90%<small>インスタンス 3台</small>
            </span>
            <span>
              <TermLink id="revision">新版 v2</TermLink>　10%<small>インスタンス 1台</small>
            </span>
          </RunBranch>
          <RunBranch
            art="job"
            title="ジョブ"
            trigger="スケジューラが毎晩起動"
            split="1回の実行で分担"
            result="全タスク成功で索引更新が完了"
          >
            <span>
              タスク 0<small>前半の資料を処理</small>
            </span>
            <span>
              タスク 1<small>後半の資料を処理</small>
            </span>
          </RunBranch>
        </div>
      </div>
      <p className="sub">
        配分・台数・作業分担は一例です。サービスでは各版の負荷や
        <TermLink id="concurrency">同時実行数</TermLink>
        などに応じて台数が変わります。ジョブの分担はアプリ側で決めます。
      </p>
      <Insight title="「版（リビジョン）」と「台数（インスタンス）」を分けて考える">
        <TermLink id="revision">リビジョン</TermLink>
        はアプリの版（不変スナップショット）、インスタンスはその版を実際に動かす 1 台です。旧版へ
        <TermLink id="rollback">切り戻す</TermLink>
        ときはトラフィック配分を変えます。アクセス集中で台数だけ増やすときは、新しい版を作る必要はありません。
      </Insight>
      <Analogy>同じ版の本を何冊用意するか（インスタンス台数）と、改訂版を出すかどうか（リビジョン）は別の判断です。</Analogy>
      <h2>今週の前提になる用語</h2>
      <div className="term-list">
        {LESSON_KEY_TERM_IDS['w02-p0'].map((id) => (
          <TermLink key={id} id={id} />
        ))}
      </div>
    </>
  );
}

/* ---------- Week 2 Part 1: Service vs Job ---------- */
export function ServiceVsJob() {
  const [taskState, setTaskState] = useState(0); // 0: normal, 1: task2 fail, 2: task2 retried
  const tasks = [
    { idx: 0, range: 'PDF 1〜250', state: 'ok' },
    { idx: 1, range: 'PDF 251〜500', state: 'ok' },
    { idx: 2, range: 'PDF 501〜750', state: taskState === 1 ? 'failed' : taskState === 2 ? 'retried' : 'ok' },
    { idx: 3, range: 'PDF 751〜1000', state: 'ok' },
  ];

  return (
    <>
      <Comparison
        label="呼び出しに答えるか、作業を終えるか"
        items={[
          {
            id: 'service',
            art: 'server',
            title: <TermLink id="cloud-run-service-vs-job">Cloud Run サービス</TermLink>,
            data: {
              trigger: 'HTTP リクエスト（ポータル・API）',
              contract: '$PORT をリッスンし続け応答を返す',
              timeout: 'リクエスト単位で最大 60 分',
              use: '昼間のマニュアル検索 API',
            },
          },
          {
            id: 'job',
            art: 'job',
            title: <TermLink id="cloud-run-service-vs-job">Cloud Run ジョブ</TermLink>,
            data: {
              trigger: 'Cloud Scheduler（定時）や手動実行',
              contract: 'ポート不要。完了したら exit 0 で終了',
              timeout: 'タスク単位で最大 24 時間',
              use: '毎晩 2 時の PDF 1,000 件索引バッチ',
            },
          },
        ]}
        axes={[
          { label: 'きっかけ', value: (d) => <GuidedText text={d.trigger} /> },
          { label: '実行契約', value: (d) => d.contract },
          { label: '上限時間', value: (d) => d.timeout },
          { label: '今回の用途', value: (d) => d.use },
        ]}
      />

      <h2>ジョブの 3 層構造と失敗タスクだけの自動再試行</h2>
      <div className="diagram-tools">
        <ChoiceGroup
          label="ジョブの実行状態"
          choices={['全タスク成功', 'Task 2 が途中エラー', 'Task 2 のみ自動再試行']}
          value={taskState}
          onChange={setTaskState}
        />
      </div>

      <section className="figure sheet" style={{ padding: '18px 20px' }} aria-label="Cloud Run ジョブの並列タスク実行">
        <StageStrip
          label="ジョブの起動から並列実行"
          steps={[
            { art: 'scheduler', label: 'Cloud Scheduler', note: '毎晩 02:00 起動', result: 'pass' },
            { art: 'job', label: 'Job 定義', note: 'tasks=4 / retries=2', result: 'pass' },
            { art: 'workflow', label: 'Execution（1回分）', note: '今夜の実行履歴', result: taskState === 1 ? 'wait' : 'pass' },
          ]}
        />
        <div className="sl-task-grid">
          {tasks.map((t) => (
            <div key={t.idx} className={'sl-task ' + t.state}>
              <b>Task {t.idx}</b>
              <div>{t.range}</div>
              <small>
                {t.state === 'failed'
                  ? '✕ exit 1（失敗）'
                  : t.state === 'retried'
                    ? '✓ 再試行で成功'
                    : '✓ exit 0'}
              </small>
            </div>
          ))}
        </div>
      </section>

      <Insight
        title={
          taskState === 1
            ? 'Task 2 が失敗しても、成功済みの Task 0・1・3 はやり直さない'
            : taskState === 2
              ? '失敗した Task 2 だけが max-retries の範囲で再試行されて完了'
              : '全タスクが exit 0 で終了すると課金も即座に終了する'
        }
      >
        各タスクには環境変数 <code>CLOUD_RUN_TASK_INDEX</code> が自動で渡るため、1,000 件の PDF を 250 件ずつ並列分担できます。HTTP サービスで応答後に裏スレッドへ重い処理を逃がすと、
        <TermLink id="cpu-allocation">リクエストベース課金の CPU 制限</TermLink>やスケールダウンで途中終了してしまいます。
      </Insight>

      <Analogy title="窓口の受付と、閉館後の夜間作業班">
        資料の問い合わせを待ち受ける窓口がサービス、閉館後に 4 人チームで棚卸しを終えたら電気を消して帰る作業班がジョブです。担当者が 1 人つまずいても、他の 3 人が終えた棚をやり直す必要はありません。
      </Analogy>
    </>
  );
}

/* ---------- Week 2 Part 2: Revision Traffic & Rollback ---------- */
const RELEASE_STAGES = [
  {
    label: '0% タグ検証',
    v2: 0,
    healthy: true,
    rolledBack: false,
    title: '本番 0% のまま専用タグ URL で v2 を単体検証',
    body: '--no-traffic --tag v2 でデプロイすると、本番 URL は v1=100% のまま保護されます。担当者だけが専用タグ URL（https://v2---...）で起動・入口認証・応答を確認できます。',
    cmd: 'gcloud run deploy week01-manual-api --source=. --no-traffic --tag=v2',
  },
  {
    label: '10% カナリア',
    v2: 10,
    healthy: true,
    rolledBack: false,
    title: '10% カナリア配信で実トラフィックの異常を観測',
    body: '同じ本番 URL の裏側で v1 に 90%、v2 に 10% を振り分けます。万が一バグが潜んでいても影響範囲を 10% に封じ込めたままログとエラー率を確認できます。',
    cmd: 'gcloud run services update-traffic week01-manual-api --to-tags=v2=10',
  },
  {
    label: '50% 拡大',
    v2: 50,
    healthy: true,
    rolledBack: false,
    title: '50% へ段階拡大して実負荷の挙動を検証',
    body: '10% で問題がなければ 50% へ広げ、スケーリングや下流 GCS 読み取りに遅延がないか確認します。この間も安定版 v1 は不変リビジョンとして残っています。',
    cmd: 'gcloud run services update-traffic week01-manual-api --to-tags=v2=50',
  },
  {
    label: '障害→即戻し',
    v2: 0,
    healthy: false,
    rolledBack: true,
    title: 'v2 で 500 急増 → 再ビルドなしで v1=100% へ即時切り戻し',
    body: 'v2 は Startup Probe を通過して Ready になりましたが、特定型番の検索で 500 エラーが急増しました。安定版 v1 は不変のまま残っているため、トラフィック配分を戻すだけで再ビルドせずに復旧できます。',
    cmd: 'gcloud run services update-traffic week01-manual-api --to-revisions=week01-manual-api-00001-v1=100',
  },
  {
    label: '100% 完了',
    v2: 100,
    healthy: true,
    rolledBack: false,
    title: '新版 v2 へ全面移行（旧版 v1 は安全網として残置）',
    body: '修正版の検証を終えて 100% 切り替えました。トラフィックが 0% の旧リビジョン v1 はアイドル課金ゼロで残るため、後日異常が出てもすぐ戻せます。',
    cmd: 'gcloud run services update-traffic week01-manual-api --to-latest',
  },
];

export function Traffic() {
  const [stageIdx, setStageIdx] = useState(1);
  const [customShare, setCustomShare] = useState<number | null>(null);
  const stage = RELEASE_STAGES[stageIdx];
  const share = customShare ?? stage.v2;
  const isCustom = customShare !== null;
  const rolledBack = !isCustom && stage.rolledBack;

  const setShare = (n: number) => {
    setCustomShare(n);
  };

  return (
    <>
      <div className="sheet standalone">
        <ChoiceGroup
          label="段階リリースのステージ"
          choices={RELEASE_STAGES.map((s) => s.label)}
          value={isCustom ? -1 : stageIdx}
          onChange={(i) => {
            setCustomShare(null);
            setStageIdx(i);
          }}
        />
        <RatioBar labels={['旧版 v1', '新版 v2']} second={share} />
        <RangeControl label="新版への配分" value={share} min={0} max={100} unit="%" onChange={setShare} />

        <div className="sl-gates" aria-label="v2 の 4 つの関門">
          <div className="sl-gate ok">
            1. 起動・Ready
            <b>
              <Check size={14} style={{ verticalAlign: 'text-bottom' }} /> 通過
            </b>
          </div>
          <div className="sl-gate ok">
            2. 入口認証
            <b>Invoker 必須</b>
          </div>
          <div className={'sl-gate ' + (rolledBack ? 'bad' : 'ok')}>
            3. トラフィック
            <b>v2: {share}%</b>
          </div>
          <div className={'sl-gate ' + (rolledBack ? 'bad' : 'ok')}>
            4. 業務応答
            <b>
              {rolledBack ? (
                <>
                  <X size={14} style={{ verticalAlign: 'text-bottom' }} /> 500 検知
                </>
              ) : (
                '200 OK'
              )}
            </b>
          </div>
        </div>

        <button
          type="button"
          className="link revert"
          onClick={() => {
            setCustomShare(null);
            setStageIdx(3);
          }}
        >
          <RotateCcw size={16} />
          旧版に戻す（v1 = 100%）
        </button>
      </div>

      <Insight
        title={isCustom ? `手動配分シミュレーション（v1: ${100 - share}% / v2: ${share}%）` : stage.title}
      >
        {isCustom ? (
          <>
            通常のサービス URL では v1 が {100 - share}%、v2 が {share}% です。トラフィック比率の変更はサービス設定層なので新リビジョンは作られません。
            {share === 0
              ? 'タグ付きの v2 URL なら権限のある呼び出し元は直接検証できます。'
              : '割合は個々のリクエストの行き先を保証しません。'}
            <TermLink id="rollback">切り戻し</TermLink>しても DB のデータ変更は元に戻らない点に注意します。
          </>
        ) : (
          <GuidedText text={stage.body} />
        )}
      </Insight>

      <Analogy>
        受付が 2 つの窓口へ案内する割合を変えるイメージです。旧窓口に案内を戻しても、新窓口で済ませた DB のデータ書き換えは取り消されないため、DB 変更は後方互換（Expand & Contract）で行います。
      </Analogy>

      <Disclosure title="実行コマンドと配分を JSON で見る">
        <CodeBlock
          text={JSON.stringify(
            {
              service: 'week01-manual-api',
              command: isCustom
                ? `gcloud run services update-traffic week01-manual-api --to-revisions=rev-00001-v1=${100 - share},rev-00002-v2=${share}`
                : stage.cmd,
              traffic: { v1: 100 - share, v2: share },
              v2Healthy: !rolledBack,
            },
            null,
            2,
          )}
        />
      </Disclosure>
    </>
  );
}

/* ---------- Week 2 Part 3: Scaling, Concurrency & 3 Setting Tiers ---------- */
const SCALE_PRESETS = [
  { label: 'コスト最小 (min=0)', requests: 0, per: 80, minI: 0, maxI: 5 },
  { label: '朝9時対策 (min=1)', requests: 1, per: 80, minI: 1, maxI: 5 },
  { label: '急増飽和 (max=3)', requests: 200, per: 50, minI: 1, maxI: 3 },
];

export function Capacity() {
  const [presetIdx, setPresetIdx] = useState<number>(1);
  const [requests, setRequests] = useState(1);
  const [per, setPer] = useState(80);
  const [minI, setMinI] = useState(1);
  const [maxI, setMaxI] = useState(5);

  const rawNeeded = requests === 0 ? 0 : Math.ceil(requests / per);
  const activeCount = Math.min(maxI, Math.max(minI, rawNeeded));
  const maxCap = maxI * per;
  const overflow = Math.max(0, requests - maxCap);
  const isSaturated = overflow > 0;
  const isColdRisk = minI === 0 && requests === 0;

  const applyPreset = (i: number) => {
    const p = SCALE_PRESETS[i];
    setPresetIdx(i);
    setRequests(p.requests);
    setPer(p.per);
    setMinI(p.minI);
    setMaxI(p.maxI);
  };

  return (
    <>
      <div className="sheet standalone">
        <ChoiceGroup
          label="スケーリングのプリセット"
          choices={SCALE_PRESETS.map((p) => p.label)}
          value={presetIdx}
          onChange={applyPreset}
        />

        <RangeControl
          label="同時に処理したい件数"
          value={requests}
          min={0}
          max={240}
          unit="件"
          onChange={(v) => {
            setPresetIdx(-1);
            setRequests(v);
          }}
        />
        <RangeControl
          label="1台あたりの同時実行上限（Concurrency）"
          value={per}
          min={1}
          max={80}
          unit="件"
          onChange={(v) => {
            setPresetIdx(-1);
            setPer(v);
          }}
        />

        <div className="sl-inline-controls">
          <div className="sl-inline-control">
            <b>min-instances</b>
            <ChoiceGroup
              label="最小インスタンス数"
              choices={['0台', '1台', '2台']}
              value={[0, 1, 2].indexOf(minI)}
              onChange={(i) => {
                const nextMin = [0, 1, 2][i];
                setPresetIdx(-1);
                setMinI(nextMin);
                if (maxI < nextMin) setMaxI(nextMin);
              }}
            />
          </div>
          <div className="sl-inline-control">
            <b>max-instances</b>
            <ChoiceGroup
              label="最大インスタンス数"
              choices={['1台', '3台', '5台', '8台']}
              value={[1, 3, 5, 8].indexOf(maxI)}
              onChange={(i) => {
                const nextMax = [1, 3, 5, 8][i];
                setPresetIdx(-1);
                setMaxI(nextMax);
                if (minI > nextMax) setMinI(nextMax);
              }}
            />
          </div>
        </div>

        <div className="capacity" aria-live="polite">
          必要 {rawNeeded} 台 → 実稼働 <strong>{activeCount} 台</strong>
          {isSaturated && <span className="sl-pill bad">+{overflow}件 待機 / 429 保護</span>}
          {isColdRisk && <span className="sl-pill warn">0台（次回コールドスタート）</span>}
          {minI > 0 && requests === 0 && <span className="sl-pill ok">ウォーム待機中（アイドル課金あり）</span>}
        </div>

        <div className="sl-slots" aria-label="インスタンス稼働スロット">
          {Array.from({ length: maxI }, (_, idx) => {
            const isWorking = idx < Math.min(maxI, rawNeeded);
            const isWarm = !isWorking && idx < minI;
            return (
              <div key={idx} className={'sl-slot ' + (isWorking ? 'active' : isWarm ? 'warm' : '')}>
                <div>#{idx + 1}</div>
                <small>{isWorking ? '処理中' : isWarm ? 'ウォーム' : '待機枠'}</small>
              </div>
            );
          })}
          {isSaturated && (
            <div className="sl-slot overflow">
              <div>上限超過</div>
              <small>429 保護</small>
            </div>
          )}
        </div>
      </div>

      <Insight
        title={
          isSaturated
            ? `上限飽和：max-instances=${maxI} で頭打ち（最大 ${maxCap} 件まで）`
            : isColdRisk
              ? 'スケール・トゥ・ゼロ（0 台）：課金ゼロだが朝イチにコールドスタート発生'
              : minI > 0 && requests === 0
                ? `min-instances=${minI} でウォーム待機中（初回遅延なし・アイドル課金あり）`
                : `ceil(${requests} ÷ ${per}) = ${rawNeeded} 台でスムーズに処理`
        }
      >
        全台が<TermLink id="concurrency">同時実行数</TermLink>の上限まで処理できる単純計算です（実際は CPU 使用率などにも左右されます）。
        <TermLink id="cold-start">コールドスタート</TermLink>は「軽量化 →{' '}
        <TermLink id="cpu-allocation">起動時 CPU ブースト</TermLink> →{' '}
        <TermLink id="min-instances">min-instances</TermLink>」の順で対策します。
      </Insight>

      <h2>実機で迷いやすい「設定の 3 階層」</h2>
      <Comparison
        label="設定の 3 階層"
        items={[
          {
            id: 'quota',
            title: '第1層：クォータ',
            data: {
              scope: 'プロジェクト × リージョン全体',
              items: '総 vCPU / 総メモリ / API レート上限',
              effect: '全サービス共通の天井。超えると新規起動不可',
            },
          },
          {
            id: 'service',
            title: '第2層：サービス設定',
            data: {
              scope: 'Cloud Run サービス単体',
              items: 'トラフィック配分（%）・入口認証・Ingress',
              effect: '変更しても新リビジョンは作られない',
            },
          },
          {
            id: 'revision',
            title: '第3層：リビジョン設定',
            data: {
              scope: 'デプロイごとの不変版',
              items: 'min/max-instances・concurrency・環境変数・SA',
              effect: '1 項目でも変えると必ず新リビジョンが生成',
            },
          },
        ]}
        axes={[
          { label: '効く範囲', value: (d) => d.scope },
          { label: '主な項目', value: (d) => d.items },
          { label: '変更時', value: (d) => d.effect },
        ]}
      />

      <Analogy>
        1 人で同時に扱える注文が {per} 件なら、{requests} 件を一斉に受けるには少なくとも {rawNeeded} 人必要です。お客さんがゼロのときに 1 人残しておくか（min-instances）、最大何人まで増やすか（max-instances）は「待ち時間 vs 人件費・厨房容量」の設計判断です。
      </Analogy>
    </>
  );
}

/* ---------- Week 2 Part 4: Artifact Registry Supply Chain + Tag vs Digest ---------- */
export function RegistryFlow() {
  const [pushedV2, setPushedV2] = useState(false);

  return (
    <>
      <Comparison
        label="タグ（付箋）とダイジェスト（固有指紋）の比較"
        items={[
          {
            id: 'tag',
            title: <TermLink id="tag-vs-digest">タグ（:latest 等）</TermLink>,
            data: {
              example: ':latest / :prod',
              target: '人が付けた可変ラベル（付箋）',
              afterPush: pushedV2 ? '別の中身（sha256:9f2b…）へズレる' : '現在は v1（sha256:4a81…）を指す',
              ops: '設定次第で上書き移動し再現性が崩れる',
            },
          },
          {
            id: 'digest',
            title: <TermLink id="tag-vs-digest">ダイジェスト（@sha256:…）</TermLink>,
            data: {
              example: '@sha256:4a81c9…',
              target: '中身全体から算出する暗号ハッシュ（指紋）',
              afterPush: '常に元の v1（sha256:4a81…）を厳密に再現',
              ops: '本番リリース・切り戻し・監査で必ず指定',
            },
          },
        ]}
        axes={[
          { label: '表記の例', value: (d) => d.example },
          { label: '識別対象', value: (d) => d.target },
          { label: '再現結果', value: (d) => d.afterPush },
          { label: '運用方針', value: (d) => d.ops },
        ]}
      />

      <div className="diagram-tools" style={{ marginTop: 18 }}>
        <ChoiceGroup
          label="上書き push のシミュレーション"
          choices={['初期状態（v1 のみ）', '別メンバーが :latest を v2 で上書き push']}
          value={pushedV2 ? 1 : 0}
          onChange={(i) => setPushedV2(i === 1)}
        />
      </div>

      <h2>裏側で動く 4 つの別主体（サプライチェーン）</h2>
      <StageStrip
        label="ビルド・保管・pull・実行の 4 主体"
        steps={[
          { art: 'build', label: '① Cloud Build SA', note: 'ビルド＆AR へ push', result: 'pass' },
          { art: 'registry', label: '② Artifact Registry', note: '同リージョン保管・検査', result: 'pass' },
          { art: 'badge', label: '③ Run サービスエージェント', note: 'AR から pull（超頻出）', result: 'pass' },
          { art: 'identity', label: '④ 実行時 SA', note: '起動後に GCS 等を読む', result: 'pass' },
        ]}
      />

      <Insight
        title={
          pushedV2
            ? ':latest は新しい v2 へ移動したが、@sha256:4a81… は元の v1 を確実に再現'
            : '別プロジェクトの AR から pull する主体は「実行時 SA」ではなく「サービスエージェント」'
        }
      >
        <TermLink id="cloud-build">Cloud Build 用 SA</TermLink> がイメージを push し、起動時に{' '}
        <TermLink id="artifact-registry">Artifact Registry</TermLink> からイメージを pull するのは{' '}
        <TermLink id="cloud-run-service-agent">Cloud Run サービスエージェント</TermLink>です。共有リポジトリ利用時はこのサービスエージェントへ <code>roles/artifactregistry.reader</code> を付与し、さらに{' '}
        <TermLink id="cleanup-policy">クリーンアップポリシーと脆弱性スキャン</TermLink>を組み合わせます。
      </Insight>

      <Analogy title="「最新版」という付箋と DNA 指紋">
        「最新版」という付箋（タグ）は別の本に貼り替えられますが、中身から計算される指紋（ダイジェスト）は付箋を動かしても変わりません。また倉庫から店へ箱を運ぶ配送員（サービスエージェント）と、店内で接客する店員（実行時 SA）は別々の担当者です。
      </Analogy>
    </>
  );
}
