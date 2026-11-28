import { useState, type ReactNode } from 'react';
import { Check, Minus, ArrowDown, KeyRound, Folder, RotateCcw } from 'lucide-react';
import type { LessonId } from '../../types';
import { Art, type ArtName } from '../ui/Art';
import { Comparison, BranchDiagram, ChoiceGroup, RatioBar, RangeControl, Insight } from '../ui/Diagrams';
import { Analogy, TermLink, LessonTerms, GuidedText } from '../ui/Help';
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
export function PairedLesson({ id }: { id: LessonId }) {
  const pair = pairs[id];
  if (!pair) return null;
  return (
    <>
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
export function Hierarchy() {
  const [scope, set] = useState(1);
  const key = (name: string, access: boolean) => (
    <>
      <KeyRound size={17} />
      <strong>{name}キー</strong>
      <span>
        {access ? (
          <>
            <Check />
            読める
          </>
        ) : (
          <>
            <Minus />
            読めない
          </>
        )}
      </span>
    </>
  );
  return (
    <>
      <div className="standalone sheet">
        <ChoiceGroup
          label="許可を付ける範囲"
          choices={['プロジェクト全体', 'マニュアル用のみ']}
          value={scope}
          onChange={set}
        />
        <BranchDiagram
          parent={
            <>
              <Folder size={17} />
              プロジェクト
            </>
          }
        >
          {[key('マニュアル用', true), key('決済用', !scope)]}
        </BranchDiagram>
      </div>
      <Insight title={scope ? '指定したキーだけ読める' : '両方のキーを読める'}>
        上位で与えた許可は下位に<TermLink id="allow-inheritance">継承</TermLink>されます。ここでは Secret
        Accessor の付与先だけを変え、他の許可や拒否はないと仮定します。
      </Insight>
      <Analogy>書庫にある全ての棚の鍵と、マニュアルの棚だけの鍵を比べてみましょう。</Analogy>
    </>
  );
}

export function OverviewMap() {
  const destination = (name: string, example: ReactNode) => (
    <>
      <TermLink id="cloud-run-service-vs-job">{name}</TermLink>
      <small>{example}</small>
    </>
  );
  return (
    <>
      <div className="sheet standalone">
        <div className="store-art">
          <Art name="image" />
          <div>
            <strong>
              <TermLink id="artifact-registry">Artifact Registry</TermLink>
            </strong>
            <p>アプリのイメージを保管</p>
          </div>
        </div>
        <div className="down">
          <ArrowDown size={19} />
          イメージを指定
        </div>
        <BranchDiagram parent={<TermLink id="cloud-run" />}>
          {[destination('サービス', '問い合わせに応答'), destination('ジョブ', '索引を更新して終了')]}
        </BranchDiagram>
      </div>
      <Insight title="版と台数を分けて考える">
        <TermLink id="revision">リビジョン</TermLink>
        はアプリの版、インスタンスはその版を実際に動かす1台です。アクセスが増えても、台数を増やすために新しい版を作る必要はありません。
      </Insight>
      <Analogy>同じ版の本を何冊用意するかと、改訂版を出すかどうかは別の判断です。</Analogy>
      <h2>今週の用語</h2>
      <LessonTerms lessonId="w02-p0" expanded />
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
