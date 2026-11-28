import { Fragment, useId, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, BookOpenText, Check, Copy, X, ChevronDown, RotateCcw } from 'lucide-react';
import type { LessonData, LessonId, QuizQuestion, LessonStory } from '../../types';
import { ConsoleScreenGallery } from '../../components/ConsoleScreenGallery';
import { GuidedText, LessonTerms } from './Help';

function readLegacyState(): {
  quizChoices?: Record<string, string>;
  solved?: Record<string, boolean>;
  predictions?: Record<string, string>;
} {
  try {
    return JSON.parse(localStorage.getItem('gcp-pca-explorer-state-v1') ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function useStored<T>(key: string, initial: T, legacyFallback?: () => T | undefined) {
  const name = 'gcp.study.light.v2.' + key;
  const [value, set] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(name);
      if (raw !== null) return JSON.parse(raw) ?? initial;
      const legacy = legacyFallback?.();
      return legacy !== undefined ? legacy : initial;
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
        type="button"
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
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return (
      <p>
        <GuidedText text={text} />
      </p>
    );
  }
  return (
    <>
      {lines.map((line, idx) => (
        <p key={idx}>
          <GuidedText text={line} />
        </p>
      ))}
    </>
  );
}

export function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined}>
      <summary>
        {title}
        <ChevronDown size={16} />
      </summary>
      {children}
    </details>
  );
}

export function Story({ story: s, defaultOpen = false }: { story: LessonStory; defaultOpen?: boolean }) {
  return (
    <Disclosure title={s.episodeLabel + '　' + s.hookTitle} defaultOpen={defaultOpen}>
      <div className="story-beats">
        {(
          [
            ['① 依頼・状況', s.request],
            ['② 作りたいもの', s.goal],
            ['③ 直面した課題', s.challenge],
          ] as const
        ).map(([label, text]) => (
          <div key={label} className="story-beat">
            <h3>{label}</h3>
            <CopyText text={text} />
          </div>
        ))}
      </div>
    </Disclosure>
  );
}

export function Quiz({ lessonId, quiz: q }: { lessonId: LessonId; quiz: QuizQuestion }) {
  const [selected, select] = useStored<string>(
    'quiz.' + lessonId,
    '',
    () => readLegacyState().quizChoices?.[lessonId],
  );
  const picked = q.choices.find((c) => c.id === selected);
  return (
    <article className="reading">
      <h2>{q.title}</h2>
      <CopyText text={q.scenario} />
      <div className="choices">
        {q.choices.map((c) => (
          <div key={c.id}>
            <button type="button" className="choice" aria-pressed={selected === c.id} onClick={() => select(c.id)}>
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
                  <button type="button" className="link" onClick={() => select('')}>
                    <RotateCcw size={15} />
                    解き直す
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {picked && q.summary && (
        <div className="callout-box quiz-summary">
          <strong>判断のまとめ</strong>
          <CopyText text={q.summary} />
        </div>
      )}
    </article>
  );
}

export function Explanation({ lesson: l }: { lesson: LessonData }) {
  const screens = l.consoleScreens ?? [];
  const hasCaptured = screens.some((s) => Boolean(s.imagePath));
  return (
    <article className="reading">
      <Story story={l.story} defaultOpen />
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
          {x.callout && (
            <div className="callout-box">
              <CopyText text={x.callout} />
            </div>
          )}
        </section>
      ))}
      <Disclosure title="条件が変わると答えが反転するポイント" defaultOpen>
        <CopyText text={l.flipCondition} />
      </Disclosure>
      {!!screens.length && (
        <Disclosure title="設定画面を見る（GCP Console）" defaultOpen={hasCaptured}>
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
      {!!l.ankiCardIds?.length && (
        <section className="anki-strip">
          <h2>対応する Anki カード</h2>
          <p className="sub">{l.ankiCardIds.join(' / ')}</p>
        </section>
      )}
      {l.story.nextBridge && (
        <section className="next-bridge-box">
          <h2>
            <BookOpenText size={18} />
            次の課題へ
          </h2>
          <CopyText text={l.story.nextBridge.teaser} />
          {l.story.nextBridge.nextLessonId && (
            <a className="bridge-link" href={'#' + l.story.nextBridge.nextLessonId + '/0'}>
              {l.story.nextBridge.nextLabel}
              <ArrowRight size={16} />
            </a>
          )}
        </section>
      )}
    </article>
  );
}

function Prediction({
  id,
  legacyKey,
  question,
  placeholder,
}: {
  id: string;
  legacyKey: string;
  question: string;
  placeholder?: string;
}) {
  const [text, set, error] = useStored('note.' + id, '', () => readLegacyState().predictions?.[legacyKey]);
  const prompt = useId();
  return (
    <>
      <p id={prompt}>
        <GuidedText text={question} />
      </p>
      <textarea
        aria-labelledby={prompt}
        placeholder={placeholder ?? '予測とその理由をメモ'}
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
      <p className="sub">メモはこのブラウザに保存されます。機密情報は入力しないでください。</p>
      {(g?.predictions ?? [{ id: 'main', question: l.labPredictionPrompt, placeholder: undefined }]).map((x) => (
        <Prediction
          key={l.id + x.id}
          id={l.id + '.' + x.id}
          legacyKey={l.id + '-' + x.id}
          question={x.question}
          placeholder={x.placeholder}
        />
      ))}
      <section>
        <h2>図を描く</h2>
        <CopyText text={g?.handDrawTheme ?? '図を閉じて、登場する人やサービスを紙に描いてみましょう。'} />
        {g?.handDrawChecklist.map((x) => (
          <CopyText key={x} text={'・' + x} />
        ))}
      </section>
      {g && (
        <section>
          <h2>実機で確かめる</h2>
          <CopyText text={g.sandboxSummary} />
          <p className="sub">
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
