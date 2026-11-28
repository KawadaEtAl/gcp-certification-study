import { LESSON_KEY_TERM_IDS } from '../../data/glossary';
import { useState, type ReactNode } from 'react';
import { ArrowDown, RotateCcw } from 'lucide-react';
import type { LessonId } from '../../types';
import { Art, type ArtName } from '../ui/Art';
import { Comparison, ChoiceGroup, RatioBar, RangeControl, Insight } from '../ui/Diagrams';
import { Analogy, TermLink, GuidedText } from '../ui/Help';
import { CodeBlock, Disclosure } from '../ui/Lesson';

type Case = { name: string; term: string; art?: ArtName; fields: [string, string, string] };
type Pair = { axes: [string, string, string]; cases: [Case, Case]; takeaway: string; analogy: string };
const pairs: Partial<Record<LessonId, Pair>> = {
  'w01-p2': {
    axes: ['宛先', '使う ID', '送るもの'],
    cases: [
      {
        name: 'アプリを呼ぶ',
        term: 'run-invoker',
        art: 'server',
        fields: ['非公開の Cloud Run', 'ポータル', 'ID トークン'],
      },
      {
        name: '資料を読む',
        term: 'cloud-storage',
        art: 'bucket',
        fields: ['Cloud Storage API', '実行用の sa-reader', 'アクセストークン'],
      },
    ],
    takeaway: '送るトークンは相手によって変わる',
    analogy:
      '窓口で見せる社員証と、担当者が書庫で使う閲覧証を分けて考えます。どちらも、有効な証明書を持つことと、操作を許されることは別です。',
  },
  'w01-p4': {
    axes: ['単位', '働く時点', '結果'],
    cases: [
      { name: '通知のみの予算', term: 'billing-budget', fields: ['費用', '集計後', 'しきい値で通知'] },
      {
        name: 'API のクォータ',
        term: 'quotas',
        fields: ['呼び出し数など', '利用時', '対象 API の利用を制限'],
      },
    ],
    takeaway: '知らせる仕組みと、量を制限する仕組み',
    analogy:
      '水道代の利用通知と、蛇口で毎分の水量を絞る仕組みの違いです。1つの蛇口を絞っても、建物全体の料金は決まりません。',
  },
  'w02-p1': {
    axes: ['きっかけ', '完了の単位', '今回の用途'],
    cases: [
      {
        name: 'サービス',
        term: 'cloud-run-service-vs-job',
        art: 'server',
        fields: ['HTTP リクエスト', '1件の応答', 'マニュアルを返す'],
      },
      {
        name: 'ジョブ',
        term: 'cloud-run-service-vs-job',
        art: 'job',
        fields: ['手動や定時の実行', 'タスクが終了', '夜間に索引を更新'],
      },
    ],
    takeaway: '呼び出しに答えるか、作業を終えるか',
    analogy:
      '資料の問い合わせを受ける窓口がサービス、閉館後に棚卸しを終えて帰る作業班がジョブです。窓口があることと、担当者が常時待機していることは別です。',
  },
  'w02-p4': {
    axes: ['表記の例', '識別対象', '運用'],
    cases: [
      { name: 'タグ', term: 'tag-vs-digest', fields: [':latest', '人が付けた名前', '設定次第で移せる'] },
      {
        name: 'ダイジェスト',
        term: 'tag-vs-digest',
        fields: ['@sha256:…', 'イメージの内容', '同じ版を指定できる'],
      },
    ],
    takeaway: 'リリース時は中身を特定できる記録を残す',
    analogy:
      '「最新版」という付箋は別の本に貼り替えられます。ダイジェストは内容から計算する識別子なので、付箋を動かしても変わりません。',
  },
};
function CredentialPaths() {
  const paths = [
    {
      title: '開発者の PC',
      art: 'laptop',
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
      art: 'identity',
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
      art: 'portal',
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
  ] as const;
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
      <Insight title="同じコードでも、権限を使う ID は変わる">
        開発者の PC で資料を読めても、Cloud Run では sa-reader の権限で判定されます。
        <TermLink id="short-lived-token">短期トークン</TermLink>
        を取得できた後も、対象の資料を読む許可が必要です。
      </Insight>
      <p className="sub">
        PC はユーザーのローカル ADC を設定済み、Cloud Run は他の認証情報を指定していない例です。外部 CI は
        Google Cloud が信頼する条件を設定し、外部 ID に直接許可した例です。
        <TermLink id="impersonation">サービスアカウントの権限を借りる</TermLink>構成もあります。
      </p>
      <h2>宛先によって、送るトークンも変わる</h2>
    </>
  );
}

export function PairedLesson({ id }: { id: LessonId }) {
  const pair = pairs[id];
  if (!pair) return null;
  return (
    <>
      {id === 'w01-p2' && <CredentialPaths />}
      <Comparison<Case>
        label={pair.takeaway}
        items={pair.cases.map((c) => ({
          id: c.name,
          art: c.art,
          title: <TermLink id={c.term}>{c.name}</TermLink>,
          data: c,
        }))}
        axes={pair.axes.map((label, i) => ({ label, value: (c) => <GuidedText text={c.fields[i]} /> }))}
      />
      <Analogy title={pair.takeaway}>{pair.analogy}</Analogy>
    </>
  );
}
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
      <Insight title="版と台数を分けて考える">
        <TermLink id="revision">リビジョン</TermLink>
        はアプリの版、インスタンスはその版を実際に動かす1台です。旧版へ
        <TermLink id="rollback">切り戻す</TermLink>
        ときは配分を変えます。台数だけ増やすなら、新しい版を作る必要はありません。
      </Insight>
      <Analogy>同じ版の本を何冊用意するかと、改訂版を出すかどうかは別の判断です。</Analogy>
      <h2>今週の前提になる用語</h2>
      <div className="term-list">
        {LESSON_KEY_TERM_IDS['w02-p0'].map((id) => (
          <TermLink key={id} id={id} />
        ))}
      </div>
    </>
  );
}

export function Traffic() {
  const [share, set] = useState(10),
    [reverted, mark] = useState(false);
  const change = (n: number) => {
    set(n);
    mark(false);
  };
  const presets = [0, 10, 50, 100];
  return (
    <>
      <div className="sheet standalone">
        <ChoiceGroup
          label="新しい版の割合"
          choices={presets.map((n) => n + '%')}
          value={presets.indexOf(share)}
          onChange={(i) => change(presets[i])}
        />
        <RatioBar labels={['旧版 v1', '新版 v2']} second={share} />
        <RangeControl label="新版への配分" value={share} min={0} max={100} unit="%" onChange={change} />
        <button
          className="link revert"
          onClick={() => {
            set(0);
            mark(true);
          }}
        >
          <RotateCcw size={16} />
          旧版に戻す
        </button>
      </div>
      <Insight
        title={
          reverted
            ? '旧版への切り戻し'
            : share === 0
              ? '新版はタグ URL で確認'
              : share === 100
                ? '新版へ全面移行'
                : '2つの版に振り分ける'
        }
      >
        通常のサービス URL での設定は v1 が {100 - share}%、v2 が {share}% です。
        {share === 0
          ? 'タグ付きの v2 を指定すれば、権限のある呼び出し元は直接検証できます。'
          : '割合は個々のリクエストの行き先を保証しません。'}
        <TermLink id="rollback">切り戻し</TermLink>
        は配分を戻す操作です。反映には時間がかかり、データの変更は元に戻りません。
      </Insight>
      <Analogy>
        受付が2つの窓口へ案内する割合を変えるイメージです。旧窓口に案内を戻しても、新窓口で済ませた手続きは取り消されません。
      </Analogy>
      <Disclosure title="配分を JSON で見る">
        <CodeBlock text={JSON.stringify({ v1: 100 - share, v2: share }, null, 2)} />
      </Disclosure>
    </>
  );
}

export function Capacity() {
  const [requests, set] = useState(90),
    [per, setPer] = useState(30);
  const count = Math.ceil(requests / per);
  return (
    <>
      <div className="sheet standalone">
        <RangeControl
          label="同時に処理したい件数"
          value={requests}
          min={0}
          max={200}
          unit="件"
          onChange={set}
        />
        <RangeControl
          label="1台あたりの同時実行上限"
          value={per}
          min={1}
          max={80}
          unit="件"
          onChange={setPer}
        />
        <div className="capacity" aria-live="polite">
          {requests} ÷ {per} を切り上げると <strong>{count} 台</strong>
        </div>
      </div>
      <Insight title="同時に処理するための台数の下限">
        全台が<TermLink id="concurrency">同時実行数</TermLink>
        の上限まで処理できるという単純な計算です。実際の台数は CPU 使用率やスケール設定にも左右されます。
      </Insight>
      <Analogy>
        1人で同時に扱える依頼が {per} 件なら、{requests} 件を一斉に受けるには少なくとも {count}{' '}
        人必要です。待機中の人や準備時間はこの計算に入りません。
      </Analogy>
    </>
  );
}
