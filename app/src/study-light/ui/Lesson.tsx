import { Fragment, useId, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Copy, X, ChevronDown, RotateCcw } from 'lucide-react';
import type { LessonData, QuizQuestion, LessonStory } from '../../types';
import { ConsoleScreenGallery } from '../../components/ConsoleScreenGallery';
import { GuidedText, LessonTerms } from './Help';

export function useStored<T>(key: string, initial: T) {
  const name = 'gcp.study.light.v2.' + key;
  const [value, set] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(name) ?? 'null') ?? initial;
    } catch {
      return initial;
    }
  });
  const [failed, warn] = useState(false);
  function update(next: T) {
    set(next);
    try {
      localStorage.setItem(name, JSON.stringify(next));
      warn(false);
    } catch {
      warn(true);
    }
  }
  return [value, update, failed] as const;
}
export function CodeBlock({ text }: { text: string }) {
  const [copied, set] = useState('');
  return (
    <div className="code-block">
      <button
        className="link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            set('コピーしました');
          } catch {
            set('テキストを選択してコピーしてください');
          }
        }}
      >
        <Copy size={16} />
        コピー
      </button>
      <small role="status">{copied}</small>
      <pre>{text}</pre>
    </div>
  );
}
export function Inspector({
  fields,
  children,
  payload,
}: {
  fields: { label: string; value: ReactNode }[];
  children?: ReactNode;
  payload?: { label: string; note?: string; text: string };
}) {
  return (
    <>
      <dl>
        {fields.map((f) => (
          <Fragment key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </Fragment>
        ))}
      </dl>
      {children}
      {payload && (
        <Disclosure title={payload.label}>
          {payload.note && <p>{payload.note}</p>}
          <CodeBlock key={payload.text} text={payload.text} />
        </Disclosure>
      )}
    </>
  );
}
function CopyText({ text }: { text: string }) {
  return (
    <p>
      <GuidedText text={text} />
    </p>
  );
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details>
      <summary>
        {title}
        <ChevronDown size={16} />
      </summary>
      {children}
    </details>
  );
}
export function Story({ story: s }: { story: LessonStory }) {
  return (
    <Disclosure title={s.episodeLabel + '　' + s.hookTitle}>
      {[
        ['依頼', s.request],
        ['目標', s.goal],
        ['課題', s.challenge],
      ].map(([label, text]) => (
        <div key={label}>
          <h3>{label}</h3>
          <CopyText text={text} />
        </div>
      ))}
    </Disclosure>
  );
}
export function Quiz({ quiz: q }: { quiz: QuizQuestion }) {
  const [selected, select] = useState('');
  return (
    <article className="reading">
      <h2>{q.title}</h2>
      <CopyText text={q.scenario} />
      <div className="choices">
        {q.choices.map((c) => (
          <div key={c.id}>
            <button className="choice" aria-pressed={selected === c.id} onClick={() => select(c.id)}>
              <span>{c.label}</span>
              <span>
                <GuidedText text={c.text} links={false} />
              </span>
            </button>
            <div role="status">
              {selected === c.id && (
                <div className="feedback">
                  <h3 className={'result' + (c.correct ? '' : ' wrong')}>
                    {c.correct ? <Check /> : <X />}
                    {c.correct ? '正解' : 'もう一度考えてみよう'}
                  </h3>
                  <CopyText text={c.rationale.replace(/^正解。/, '')} />
                  <button className="link" onClick={() => select('')}>
                    <RotateCcw size={15} />
                    解き直す
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
export function Explanation({ lesson: l }: { lesson: LessonData }) {
  const screens = l.consoleScreens?.filter((s) => s.imagePath);
  return (
    <article className="reading">
      <Story story={l.story} />
      <section>
        <h2>判断の順序</h2>
        <ol>
          {l.thinkingChart.map((x) => (
            <li key={x.label}>
              <strong>{x.label.replace(/^\d+\.\s*/, '')}</strong>
              <CopyText text={x.detail} />
            </li>
          ))}
        </ol>
      </section>
      {l.deepDiveParagraphs.map((x) => (
        <section key={x.heading}>
          <h2>
            <GuidedText text={x.heading} links={false} />
          </h2>
          <CopyText text={x.body} />
          {x.callout && <CopyText text={x.callout} />}
        </section>
      ))}
      <Disclosure title="条件を変えると？">
        <CopyText text={l.flipCondition} />
      </Disclosure>
      {!!screens?.length && (
        <Disclosure title="設定画面を見る">
          <ConsoleScreenGallery screens={screens} />
        </Disclosure>
      )}
      <section>
        <h2>この単元の用語</h2>
        <LessonTerms lessonId={l.id} expanded />
      </section>
      <section>
        <h2>公式ドキュメント</h2>
        <ul>
          {l.docLinks.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.label} <ArrowUpRight size={15} />
              </a>
            </li>
          ))}
        </ul>
      </section>
      {l.story.nextBridge && (
        <section>
          <h2>次の課題</h2>
          <CopyText text={l.story.nextBridge.teaser} />
        </section>
      )}
    </article>
  );
}
function Prediction({ id, question }: { id: string; question: string }) {
  const [text, set, error] = useStored('note.' + id, '');
  const prompt = useId();
  return (
    <>
      <p id={prompt}>
        <GuidedText text={question} />
      </p>
      <textarea
        aria-labelledby={prompt}
        placeholder="予測とその理由をメモ"
        value={text}
        onChange={(e) => set(e.currentTarget.value)}
      />
      {error && <p role="alert">保存できません。別の場所にメモを控えてください。</p>}
    </>
  );
}
export function Lab({ lesson: l }: { lesson: LessonData }) {
  const g = l.labGuide;
  return (
    <article className="reading">
      <h2>結果を予測する</h2>
      <p className="sub">メモはこの見本を開いたブラウザに保存します。機密情報は入力しないでください。</p>
      {(g?.predictions ?? [{ id: 'main', question: l.labPredictionPrompt }]).map((x) => (
        <Prediction key={l.id + x.id} id={l.id + '.' + x.id} question={x.question} />
      ))}
      <section>
        <h2>図を描く</h2>
        <CopyText text={g?.handDrawTheme ?? '図を閉じて、登場する人やサービスを紙に描いてみましょう。'} />
        {g?.handDrawChecklist.map((x) => (
          <CopyText key={x} text={x} />
        ))}
      </section>
      {g && (
        <section>
          <h2>実機で確かめる</h2>
          <CopyText text={g.sandboxSummary} />
          <p>
            学習用プロジェクトと復元方法を確認してから進めてください。この画面からコマンドは実行されません。
          </p>
          {g.minimalCommands.map((x) => (
            <Disclosure key={x.title} title={x.title}>
              <CopyText text={x.purpose} />
              <CodeBlock text={x.command} />
              <CopyText text={x.observe} />
            </Disclosure>
          ))}
          {[
            { title: g.hiddenActorsTitle, items: g.hiddenActors },
            { title: g.hierarchyLevelsTitle, items: g.hierarchyLevels },
          ].map((x) => (
            <Disclosure key={x.title} title={x.title}>
              {x.items.map((item) => (
                <div key={item.label}>
                  <b>{item.label}</b>
                  <CopyText text={item.detail} />
                </div>
              ))}
            </Disclosure>
          ))}
        </section>
      )}
      <section>
        <h2>声に出して説明する</h2>
        {g?.voiceExplainPrompts.map((x) => (
          <CopyText key={x} text={x} />
        ))}
        <CopyText text={l.miniQuiz.prompt} />
        <Disclosure title="回答例を見る">
          <CopyText text={l.miniQuiz.answer} />
        </Disclosure>
      </section>
    </article>
  );
}
