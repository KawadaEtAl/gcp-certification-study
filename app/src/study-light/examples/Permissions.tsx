import { useState } from 'react';
import { Check, X, KeyRound, LockKeyhole, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Art } from '../ui/Art';
import { Comparison, ChoiceGroup, ScenarioSelect, Insight, Status, type Verdict } from '../ui/Diagrams';
import { GuidedText, Modal, TermLink, Analogy } from '../ui/Help';
import { usePlayback, Playback } from '../ui/Playback';
import { FlowNode, FlowEdge } from '../ui/Relations';
import { Inspector } from '../ui/Lesson';
const steps = [
  {
    name: 'デプロイ',
    route: '開発者が sa-reader を指定',
    cargo: '実行 ID を指定',
    trace:
      '開発者は自分の ID で Cloud Run 管理 API を呼びます。sa-reader を実行 ID に指定するには、このアカウントに対する actAs 権限が必要です。',
    id: 'act-as',
    art: 'laptop',
    who: '開発者',
    target: 'sa-reader',
    phase: '設定時',
    analogy: '担当者を任命',
    from: '開発者',
    to: 'Cloud Run',
    source: 'laptop',
    dest: 'server',
    short: 'actAs',
    title: '誰の ID でアプリを動かすか',
    subject: 'デプロイする開発者',
    resource: '実行用のサービスアカウント（sa-reader）',
    role: 'roles/iam.serviceAccountUser',
    permission: 'iam.serviceAccounts.actAs',
    body: 'アプリは sa-reader というサービスアカウントで動きます。開発者には、デプロイ権限と、sa-reader を使う権限（actAs）が必要です。',
    failed: '実行用のアカウントを指定できない',
    why: '開発者に sa-reader を使う権限がないため、デプロイが拒否されます。sa-reader に対する開発者の権限を確認しましょう。',
  },
  {
    name: '呼び出し',
    route: '社内ポータルから Cloud Run へ',
    cargo: 'ID トークン',
    trace:
      'ポータルは manual-rag 宛ての ID トークンを送ります。入口では sa-internal-app に呼び出しを許可したかを判定します。',
    id: 'run-invoker',
    art: 'server',
    who: 'sa-internal-app',
    target: 'Cloud Run サービス',
    phase: '実行時',
    analogy: '窓口に依頼',
    from: '社内ポータル',
    to: 'Cloud Run',
    source: 'portal',
    dest: 'server',
    short: 'Invoker',
    title: '誰がアプリを呼び出せるか',
    subject: '社内ポータルのサービスアカウント',
    resource: '非公開の Cloud Run サービス',
    role: 'roles/run.invoker',
    permission: 'run.routes.invoke',
    body: 'ポータルは、呼び出すサービス宛ての ID トークンを送ります。Cloud Run はポータルの ID を確かめ、その ID に呼び出し権限があるかを判定します。',
    failed: 'リクエストがアプリに届かない',
    why: 'ポータルの ID に呼び出し権限がないため、Cloud Run の入口で拒否されます。バケットにアクセスする前に止まっています。',
  },
  {
    name: '読み取り',
    route: 'Cloud Run から Cloud Storage へ',
    cargo: 'アクセストークン',
    trace:
      'ADC がメタデータサーバーから sa-reader のアクセストークンを取得します。アプリはこれを送って guide.md を読み、結果をポータルに返します。',
    id: 'object-viewer',
    art: 'bucket',
    who: 'sa-reader',
    target: 'manual-docs',
    phase: '実行時',
    analogy: '書庫で閲覧',
    from: 'Cloud Run',
    to: 'Cloud Storage',
    source: 'identity',
    dest: 'bucket',
    short: 'Object Viewer',
    title: '誰がマニュアルを読み取るか',
    subject: '実行用のサービスアカウント（sa-reader）',
    resource: 'manual-docs バケット',
    role: 'roles/storage.objectViewer',
    permission: 'storage.objects.get',
    body: 'manual-docs バケットで sa-reader に Object Viewer を付けると、アプリはマニュアルを読めます。このロールでは書き込みはできません。',
    failed: 'アプリは動いたが、マニュアルを読めない',
    why: 'ポータルからの呼び出しは成功しています。manual-docs で sa-reader に読み取り権限がないため、Cloud Storage が拒否します。',
  },
] as const;

type Step = (typeof steps)[number];
const span = 8;

export function Permissions({ hidden }: { hidden: boolean }) {
  const [scenario, sc] = useState(-1),
    [mode, setMode] = useState(0),
    [details, setDetails] = useState<number | null>(null);
  const end = scenario < 0 ? steps.length * span : (scenario + 0.5) * span;
  const player = usePlayback(end, span, mode === 1 || hidden);
  const { i, position } = player,
    item = steps[i],
    denied = i === scenario;
  const pass = position / span - i,
    progress = pass,
    advancing = pass > 0 && pass < 0.5;
  const verdict = (j: number): Verdict =>
    scenario < 0 || j < scenario ? 'pass' : j === scenario ? 'stop' : 'unreached';
  const board = (
    <Comparison<Step>
      label="3つの権限チェックの比較"
      compact={mode !== 1}
      active={mode !== 1 ? item.id : undefined}
      items={steps.map((s, j) => ({
        id: s.id,
        art: s.art,
        data: s,
        status: verdict(j),
        title: (
          <button className="inspect" onClick={() => setDetails(j)} aria-label={s.name + 'の詳細'}>
            <span>{j + 1}</span>
            {s.name}
            <ChevronRight size={15} />
          </button>
        ),
      }))}
      axes={[
        {
          label: '誰に',
          value: (s) => (s.who === 'sa-reader' ? <TermLink id="runtime-sa">{s.who}</TermLink> : s.who),
        },
        {
          label: '対象',
          value: (s) => (
            <TermLink
              id={s.id === 'act-as' ? 'runtime-sa' : s.id === 'run-invoker' ? 'cloud-run' : 'cloud-storage'}
            >
              {s.target}
            </TermLink>
          ),
        },
        {
          label: (s) => (s.id === 'act-as' ? '権限' : 'ロール例'),
          value: (s) => <TermLink id={s.id}>{s.short}</TermLink>,
        },
        { label: '資料室なら', value: (s) => s.analogy },
      ]}
    />
  );
  return (
    <>
      <div className="diagram-tools">
        <ChoiceGroup
          label="図解の見方"
          choices={['全体図', '比較', '拡大']}
          value={mode}
          onChange={(v) => {
            player.seek(position);
            setMode(v);
          }}
        />
        <ScenarioSelect
          label="権限の条件"
          choices={['すべて許可', ...steps.map((s) => s.short + ' なし')]}
          value={scenario + 1}
          onChange={(v) => {
            const failure = v - 1;
            sc(failure);
            player.reset(v ? (failure + 0.5) * span : i * span);
          }}
        />
      </div>
      {mode === 0 ? (
        <>
          <PermissionMap player={player} verdict={verdict} onDetail={setDetails} />
          {board}
        </>
      ) : mode === 1 ? (
        <>
          {board}
          <Insight title={scenario < 0 ? '①で指定した ID が③で資料を読む' : steps[scenario].failed}>
            {scenario < 0 ? (
              <>
                ①で開発者が指定する <TermLink id="runtime-sa">sa-reader</TermLink> は、アプリ専用の ID
                です。②でポータルがアプリを呼ぶと、③ではアプリがこの ID で{' '}
                <TermLink id="cloud-storage">manual-docs バケット</TermLink>を読みます。
              </>
            ) : (
              <GuidedText text={steps[scenario].why} />
            )}
          </Insight>
        </>
      ) : (
        <>
          <section className="figure" aria-label="権限チェックの再生">
            <div className="sheet">
              <nav className="stages" aria-label="図解のステップ">
                {steps.map((s, j) => (
                  <button
                    key={s.id}
                    aria-current={j === i ? 'step' : undefined}
                    disabled={verdict(j) === 'unreached'}
                    onClick={() => player.seek(j * span)}
                  >
                    <span>{j + 1}</span>
                    {s.name}
                  </button>
                ))}
              </nav>
              <div className="scene" key={i}>
                <div className="entity">
                  <Art name={item.source} />
                  <b>{item.from}</b>
                </div>
                <div className={'bridge' + (denied ? ' denied' : '')}>
                  <div className="route">
                    <div className="track" />
                    {!denied && <ChevronRight className="tip" size={18} />}
                    {pass > 0 && progress < 1 && (
                      <span
                        className="travel"
                        style={{ left: (denied ? Math.min(progress * 100, 50) : progress * 100) + '%' }}
                      />
                    )}
                  </div>
                  <button
                    className="gate"
                    onClick={() => setDetails(i)}
                    aria-label={item.short + ' の権限の詳細'}
                  >
                    {denied ? <LockKeyhole /> : <KeyRound />}
                  </button>
                  <div className="outcome" aria-live="polite">
                    {advancing ? (
                      '確認中'
                    ) : denied ? (
                      <>
                        <X />
                        拒否
                      </>
                    ) : (
                      <>
                        <Check />
                        許可
                      </>
                    )}
                  </div>
                  <span className="key-name">
                    <TermLink id={item.id}>{item.short}</TermLink>
                  </span>
                </div>
                <div className={'entity' + (denied ? ' inactive' : '')}>
                  <Art name={item.dest} />
                  <b>{item.to}</b>
                </div>
              </div>
            </div>

            <Playback player={player} label={item.name} />
          </section>
          <Insight
            title={denied ? item.failed : item.title}
            action={
              <button className="link" onClick={() => setDetails(i)}>
                権限の詳細 <ArrowUpRight size={16} />
              </button>
            }
          >
            <GuidedText text={denied ? item.why : item.body} />
          </Insight>
          {board}
        </>
      )}
      <Analogy title="社内の資料室にたとえると">
        ①責任者が窓口の担当者を任命します。②社員が窓口で資料を頼むと、③担当者が自分の閲覧証で書庫に入ります。社員の入館証だけでは、担当者は書庫に入れません。
      </Analogy>
      <p className="sub">
        判定は選んだ条件での結果です。①は設定時、②と③は実行時の判定です。①を毎回繰り返す必要はありません。再生時間は説明用です。①の
        actAs
        は権限名、②③はロールの例です。新規デプロイを想定し、開発者のデプロイ権限など他の条件は満たしているとします。
      </p>
      {details !== null && (
        <Modal title={steps[details].name + 'の詳細'} onClose={() => setDetails(null)}>
          <PermissionDetail step={steps[details]} verdict={verdict(details)} />
        </Modal>
      )}
    </>
  );
}

function PermissionMap({
  player,
  verdict,
  onDetail,
}: {
  player: ReturnType<typeof usePlayback>;
  verdict: (j: number) => Verdict;
  onDetail: (j: number) => void;
}) {
  const { i, position, seek } = player;
  const stage = steps[i],
    denied = verdict(i) === 'stop';
  function edge(j: number, area: string) {
    const s = steps[j],
      result = verdict(j);
    return (
      <FlowEdge
        area={area}
        number={j + 1}
        label={s.name}
        route={s.route}
        result={result}
        active={j === i}
        progress={position / span - i}
        onSelect={() => (result === 'unreached' ? onDetail(j) : seek(j * span))}
      >
        <span>{j === 0 ? s.cargo : <TermLink id="id-vs-oauth-token">{s.cargo}</TermLink>}</span>
        <TermLink id={s.id}>{s.short}</TermLink>
      </FlowEdge>
    );
  }
  return (
    <section className="figure" aria-label="実行 ID の設定と資料の読み取り">
      <div className="permission-map sheet" data-assigned={verdict(0) === 'pass'}>
        <FlowNode area="developer" art="laptop" label="開発者">
          個人の ID
        </FlowNode>
        {edge(0, 'deploy')}
        <FlowNode area="account" art="badge" label={<TermLink id="runtime-sa">実行 ID</TermLink>}>
          sa-reader
        </FlowNode>
        <div className="assignment" aria-label="Cloud Run に sa-reader を割り当てる設定">
          <span>{verdict(0) === 'stop' ? '未設定' : '割り当て'}</span>
        </div>
        <FlowNode area="portal" art="portal" label="社内ポータル">
          sa-internal-app
        </FlowNode>
        {edge(1, 'invoke')}
        <FlowNode area="app" art="identity" label={<TermLink id="cloud-run">Cloud Run</TermLink>}>
          manual-rag
          <br />
          {verdict(0) === 'stop' ? (
            '未作成'
          ) : (
            <>
              ID　<span className="id-name">sa-reader</span>
            </>
          )}
        </FlowNode>
        {edge(2, 'read')}
        <FlowNode area="bucket" art="bucket" label={<TermLink id="cloud-storage">Cloud Storage</TermLink>}>
          manual-docs
          <br />
          guide.md
        </FlowNode>
        <section className="focus-note" aria-live="polite">
          <div>
            <b>
              {stage.phase}　{i + 1} / 3
            </b>
            <button className="link" onClick={() => onDetail(i)}>
              権限の詳細 <ArrowUpRight size={15} />
            </button>
          </div>
          <strong>{denied ? stage.failed : stage.title}</strong>
          <p>
            <GuidedText text={denied ? stage.why : stage.trace} />
          </p>
        </section>
      </div>
      <Playback player={player} label={stage.name} />
    </section>
  );
}

function PermissionDetail({ step: s, verdict }: { step: Step; verdict: Verdict }) {
  const config = { principal: s.who, resource: s.target, role: s.role, permission: s.permission };
  return (
    <>
      <div>
        {s.phase}　<Status value={verdict} />
      </div>
      {verdict === 'unreached' && <p>前の段階で拒否されたため、この権限は判定されません。</p>}
      <p>
        <GuidedText text={verdict === 'stop' ? s.why : s.body} />
      </p>
      <Inspector
        fields={[
          { label: '権限を使う人・ID', value: s.subject },
          { label: '対象', value: s.resource },
          { label: '権限', value: <code>{s.permission}</code> },
          {
            label: 'ロールの例',
            value: (
              <TermLink id={s.id}>
                <code>{s.role}</code>
              </TermLink>
            ),
          },
        ]}
        payload={{
          label: '図の値を JSON で見る',
          note: '説明用の値です。実際の IAM ポリシーとは形式が異なります。',
          text: JSON.stringify(config, null, 2),
        }}
      >
        <Analogy title="資料室での役割">{s.analogy}するための許可です。</Analogy>
      </Inspector>
    </>
  );
}
