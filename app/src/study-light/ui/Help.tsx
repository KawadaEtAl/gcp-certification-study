import { createContext, useContext, useEffect, useRef, useState, useId, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Lightbulb, Search, X } from 'lucide-react';
import type { GlossaryTerm, LessonId } from '../../types';
import { GLOSSARY_TERMS, getGlossaryTermsForLesson } from '../../data/glossary';
import { RichText } from '../../components/RichText';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} aria-labelledby={heading} {...{ closedby: 'any' }} onClose={onClose}>
      <div className="dialog-bar">
        <h2 id={heading}>{title}</h2>
        <button className="bare" autoFocus onClick={() => ref.current?.close()} aria-label="閉じる">
          <X />
        </button>
      </div>
      <div className="dialog-inner">{children}</div>
    </dialog>
  );
}

export function Analogy({ children, title = 'たとえると' }: { children: ReactNode; title?: string }) {
  return (
    <div className="analogy">
      <Lightbulb size={19} />
      <div>
        <b>{title}</b>
        <p>{children}</p>
      </div>
    </div>
  );
}

// Keep the source glossary authoritative. This example needs one additional role.
const viewer: GlossaryTerm = {
  id: 'object-viewer',
  term: 'Storage Object Viewer',
  subtitle: 'roles/storage.objectViewer',
  category: 'w01-p1',
  lessons: ['w01-p1'],
  aliases: ['Object Viewer', '読み取り'],
  summary:
    'バケットのオブジェクトを一覧表示し、読み取れるロールです。このロールには作成や削除の権限は含まれません。',
  analogy:
    '資料室で目録を見て本を読むための閲覧証です。本を入れ替えたり、持ち出して処分したりする権利は含みません。',
  examPoint:
    'この例では、実行用のアカウント sa-reader に manual-docs バケットで付与します。他のロールで書き込みが許可されていないかも確認します。',
  relatedIds: ['cloud-storage', 'runtime-sa', 'least-privilege'],
};
const terms = new Map([viewer, ...GLOSSARY_TERMS].map((t) => [t.id, t]));
function lessonTerms(id: LessonId) {
  const entries = getGlossaryTermsForLesson(id);
  if (id === 'w01-p1' && !entries.some((t) => t.id === viewer.id)) entries.push(terms.get(viewer.id)!);
  return entries;
}
const Context = createContext<((id?: string) => void) | undefined>(undefined);
export function HelpProvider({ lessonId, children }: { lessonId: LessonId; children: ReactNode }) {
  const [entry, set] = useState<string | null>(null);
  return (
    <Context.Provider value={(id) => set(id ?? '')}>
      {children}
      {entry !== null && (
        <Modal title="用語集" onClose={() => set(null)}>
          <Dictionary initial={entry} lessonId={lessonId} />
        </Modal>
      )}
    </Context.Provider>
  );
}
export function TermLink({ id, children }: { id: string; children?: ReactNode }) {
  const show = useContext(Context),
    term = terms.get(id);
  if (!term || !show) return <>{children ?? term?.term ?? id}</>;
  return (
    <button
      type="button"
      className="term"
      aria-haspopup="dialog"
      data-term={id}
      title={term.term + 'を用語集で見る'}
      onClick={() => show(id)}
    >
      {children ?? term.term}
    </button>
  );
}
export function LessonTerms({ lessonId, expanded = false }: { lessonId: LessonId; expanded?: boolean }) {
  const show = useContext(Context);
  return expanded ? (
    <div className="term-list">
      {lessonTerms(lessonId).map((t) => (
        <TermLink key={t.id} id={t.id} />
      ))}
    </div>
  ) : (
    <button className="link" onClick={() => show?.()} aria-haspopup="dialog" aria-label="この単元の用語">
      <BookOpen size={16} />
      <span>この単元の</span>用語
    </button>
  );
}
export function GlossaryButton({ children }: { children: ReactNode }) {
  const open = useContext(Context);
  return (
    <button onClick={() => open?.()} aria-haspopup="dialog">
      {children}
    </button>
  );
}
// Curated phrases only. Ambiguous words such as 「版」 and 「タグ」 require an explicit TermLink.
const phrases: Record<string, string> = {
  サービスアカウント: 'service-account',
  実行時サービスアカウント: 'runtime-sa',
  実行時ID: 'runtime-sa',
  Invoker: 'run-invoker',
  actAs: 'act-as',
  'Object Viewer': 'object-viewer',
  'Cloud Storage': 'cloud-storage',
  'ID トークン': 'id-vs-oauth-token',
  アクセストークン: 'id-vs-oauth-token',
  ADC: 'adc',
  WIF: 'wif',
  メタデータサーバー: 'metadata-server',
  'Secret Manager': 'secret-manager',
  クォータ: 'quotas',
  予算通知: 'billing-budget',
  'Pub/Sub': 'pubsub',
  リビジョン: 'revision',
  同時実行数: 'concurrency',
  コールドスタート: 'cold-start',
  カナリア: 'traffic-split',
  ロールバック: 'rollback',
  'Artifact Registry': 'artifact-registry',
  ダイジェスト: 'tag-vs-digest',
  コンテナ: 'container',
  'Cloud Run ジョブ': 'cloud-run-service-vs-job',
  'Cloud Run': 'cloud-run',
  IAM: 'iam',
  最小権限: 'least-privilege',
};
const escaped = Object.keys(phrases)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'));
const pattern = new RegExp('(' + escaped.join('|') + ')', 'g');
export function GuidedText({ text, links = true }: { text: string; links?: boolean }) {
  const seen = new Set<string>();
  function plain(s: string) {
    return s.split(pattern).map((word, j) => {
      const id = phrases[word];
      if (!links || !id || seen.has(id) || seen.size >= 3) return word;
      seen.add(id);
      return (
        <TermLink id={id} key={j}>
          {word}
        </TermLink>
      );
    });
  }
  return text.split(/(\x60[^\x60]+\x60|\*\*[^*]+\*\*)/g).map((s, i) =>
    s.startsWith('\x60') ? (
      <RichText key={i} text={s} />
    ) : s.startsWith('**') ? (
      <strong key={i}>
        <RichText text={s.slice(2, -2)} />
      </strong>
    ) : (
      plain(s)
    ),
  );
}

function Dictionary({ lessonId, initial }: { lessonId: LessonId; initial: string }) {
  const [path, setPath] = useState(initial ? [initial] : []);
  const [all, setAll] = useState(false),
    [query, setQuery] = useState('');
  const t = terms.get(path.at(-1) ?? '');
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.focus({ preventScroll: true });
    top.current?.closest('dialog')?.scrollTo(0, 0);
  }, [t]);
  const normalized = query.trim().toLowerCase();
  const items = normalized
    ? [...terms.values()].filter((x) =>
        [x.term, x.subtitle, ...(x.aliases ?? []), x.summary, x.analogy, x.examPoint]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    : all
      ? [...terms.values()]
      : lessonTerms(lessonId);
  return (
    <div ref={top} tabIndex={-1} className="dictionary">
      {t ? (
        <>
          <button className="link" onClick={() => setPath(path.slice(0, -1))}>
            <ArrowLeft size={15} />
            {path.length > 1 ? '前の用語へ' : '用語一覧へ'}
          </button>
          <h3>{t.term}</h3>
          <small>{t.subtitle}</small>
          <p>
            <RichText text={t.summary} />
          </p>
          <Analogy>
            <RichText text={t.analogy} />
          </Analogy>
          <h4>試験・実務でのポイント</h4>
          <p>
            <RichText text={t.examPoint} />
          </p>
          {t.id === 'rollback' && (
            <p>切替時間は保証されません。処理中のリクエストやデータの変更は別に確認します。</p>
          )}
          <h4>関連する用語</h4>
          <div className="term-list">
            {t.relatedIds?.map(
              (id) =>
                terms.has(id) && (
                  <button className="term" key={id} onClick={() => setPath([...path, id])}>
                    {terms.get(id)?.term}
                  </button>
                ),
            )}
          </div>
        </>
      ) : (
        <>
          <label className="search">
            <Search size={17} />
            <input
              type="search"
              aria-label="用語を検索"
              placeholder="すべての用語から検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="options">
            {['この単元', 'すべて'].map((label, i) => (
              <button
                key={label}
                aria-pressed={!normalized && all === !!i}
                onClick={() => {
                  setAll(!!i);
                  setQuery('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="sub" role="status">
            {items.length ? items.length + '語' : '一致する用語がありません。'}
          </p>
          {items.map((x) => (
            <button className="dictionary-row" key={x.id} onClick={() => setPath([x.id])}>
              {x.term}
              <ChevronRight size={17} />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
