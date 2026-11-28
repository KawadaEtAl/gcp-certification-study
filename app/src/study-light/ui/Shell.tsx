import { type ComponentType, useState, useEffect } from 'react';
import {
  Map as MapIcon,
  BookMarked,
  BookOpen,
  Bookmark,
  PanelLeft,
  Menu,
  Shapes,
  ChevronRight,
  ChevronDown,
  Check,
  CircleCheck,
  Workflow,
  CircleHelp,
  NotebookPen,
  ArrowRight,
} from 'lucide-react';
import type { LessonData } from '../../types';
import { HelpProvider, LessonTerms, GlossaryButton, Modal, GuidedText } from './Help';
import { Explanation, Lab, Quiz, useStored } from './Lesson';
import { Art } from './Art';
import { Library } from '../library/Library';

export interface Unit {
  lesson: LessonData;
  name: string;
  title: string;
  question: string;
  Diagram: ComponentType<{ hidden: boolean }>;
  scope?: string;
}
const tabs = [
  ['図解', Workflow],
  ['例題', CircleHelp],
  ['解説', BookOpen],
  ['ラボ', NotebookPen],
] as const;
function Brand({ url }: { url: string }) {
  return (
    <a className="brand" href={url}>
      <svg width="34" height="35" viewBox="0 0 34 35" aria-hidden="true">
        {[14, 7, 0].map((y, i) => (
          <path
            key={i}
            transform={'translate(0 ' + y + ')'}
            fill={['#15221d', '#f7f9f7', '#87e3ab'][i]}
            stroke="#15221d"
            strokeWidth="2.1"
            strokeLinejoin="round"
            d="M2 10L17 2l15 8-15 8Z"
          />
        ))}
      </svg>
      GCP Explorer
    </a>
  );
}
const link = (u: Unit, t = 0) => '#' + u.lesson.id + '/' + t;
function parseRoute(hash: string, units: Unit[]) {
  const [key, tab] = hash.slice(1).split('/');
  const old = key.match(/^part([1-4])$/);
  const id = old ? 'w01-p' + old[1] : key;
  const home = key.startsWith('week');
  const unit =
    units.find((u) => (home ? u.lesson.week === Number(key.slice(4)) : u.lesson.id === id)) ?? units[0];
  return { unit, home, t: tabs[Number(tab)] ? Number(tab) : 0 };
}
type Marks = Record<string, boolean>;
export function StudyShell({ units, weekTitles }: { units: Unit[]; weekTitles: Record<number, string> }) {
  const [hash, setHash] = useState(location.hash);
  const [back, setBack] = useState(link(units[0]));
  const library = /^#(art|figures)(\/|$)/.test(hash);
  useEffect(() => {
    if (!library) setBack(hash || link(units[0]));
  }, [library, hash, units]);
  const [collapsed, collapse] = useState(false);
  const [modal, setModal] = useState<'saved' | 'nav' | null>(null);
  const [done, mark, doneError] = useStored<Marks>('done', {}),
    [saved, star, starError] = useStored<Marks>('stars', {});
  useEffect(() => {
    function navigate() {
      setHash(location.hash);
      setModal(null);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const { unit, home, t } = parseRoute(hash, units);
  const { lesson, Diagram } = unit,
    { week, id } = lesson;
  const thisWeek = units.filter((u) => u.lesson.week === week);
  const weeks = [...new Set(units.map((u) => u.lesson.week))];
  const weeksPage = '#week' + week;
  const next = units[units.indexOf(unit) + 1];
  const progress = thisWeek.filter((u) => done[u.lesson.id]).length;
  const title = library ? '図解ライブラリ' : home ? weekTitles[week] : unit.title;
  useEffect(() => {
    document.title = title + ' | GCP Explorer';
  }, [title]);
  if (library) return <Library hash={hash} back={back} brand={<Brand url={back} />} />;
  const closeNav = () => setModal(null);
  const num = (l: LessonData) => (
    <span className={'num' + (done[l.id] ? ' finished' : '')}>
      {done[l.id] ? <Check size={14} aria-label="学習済み" /> : l.part}
    </span>
  );
  const links = (list: Unit[]) =>
    list.map((u) => (
      <a key={u.lesson.id} className="unit-link" onClick={closeNav} href={link(u)}>
        {num(u.lesson)}
        <b>{u.title}</b>
        <small>{u.lesson.estimatedMinutes}分</small>
        <ChevronRight size={17} />
      </a>
    ));
  const nav = (
    <>
      <nav className="utilities" aria-label="学習メニュー">
        <a href={weeksPage} onClick={closeNav} aria-current={home ? 'page' : undefined}>
          <MapIcon />
          今週の概要
        </a>
        <a href="#art" onClick={closeNav}>
          <Shapes />
          図解ライブラリ
        </a>
        <GlossaryButton>
          <BookMarked />
          用語集
        </GlossaryButton>
        <button onClick={() => setModal('saved')}>
          <Bookmark />
          ブックマーク
        </button>
      </nav>
      <nav className="units" aria-label="今週の単元">
        <h2>Week {week}</h2>
        {thisWeek.map((u) => (
          <a
            key={u.lesson.id}
            onClick={closeNav}
            href={link(u)}
            aria-current={!home && unit === u ? 'page' : undefined}
          >
            {num(u.lesson)}
            {u.name}
          </a>
        ))}
      </nav>
      <div className="progress">
        <div>
          <b>今週の進捗</b>
          <span>
            {progress} / {thisWeek.length}
          </span>
        </div>
        <progress value={progress} max={thisWeek.length} aria-label="学習済みの単元" />
      </div>
    </>
  );
  return (
    <div className="study-light">
      <HelpProvider key={home ? weeksPage : id} lessonId={id}>
        <div className={collapsed ? 'layout narrow' : 'layout'}>
          <aside>
            <Brand url={weeksPage} />
            {nav}
          </aside>
          <main>
            <header className="top">
              <button
                className="bare desktop"
                aria-label={collapsed ? '目次を開く' : '目次を閉じる'}
                onClick={() => collapse(!collapsed)}
              >
                <PanelLeft size={20} />
              </button>
              <button className="bare mobile" aria-label="目次を開く" onClick={() => setModal('nav')}>
                <Menu size={22} />
              </button>
              <label className="week-select">
                <select
                  value={week}
                  aria-label="週を選ぶ"
                  onChange={(e) => {
                    location.hash = link(units.find((u) => u.lesson.week === Number(e.target.value))!);
                  }}
                >
                  {weeks.map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <b>{home ? '概要' : 'Part ' + lesson.part}</b>
              {!home && (
                <div className="actions">
                  <button
                    className="bare"
                    aria-label={saved[id] ? 'ブックマークを解除' : 'ブックマークに追加'}
                    aria-pressed={!!saved[id]}
                    onClick={() => star({ ...saved, [id]: !saved[id] })}
                  >
                    <Bookmark size={19} fill={saved[id] ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="status"
                    aria-pressed={!!done[id]}
                    onClick={() => mark({ ...done, [id]: !done[id] })}
                  >
                    <CircleCheck size={17} />
                    {done[id] ? '学習済み' : '学習済みにする'}
                  </button>
                </div>
              )}
            </header>
            <div className="page">
              {(doneError || starError) && <p role="alert">ブラウザに保存できませんでした。</p>}
              <h1>{title}</h1>
              {home ? (
                <>
                  <div className="sheet overview">
                    <Art name="laptop" />
                    <Art name="server" />
                    <Art name={week === 1 ? 'bucket' : 'image'} />
                  </div>
                  <h2>今週の単元</h2>
                  {links(thisWeek)}
                </>
              ) : (
                <>
                  <p className="lead">
                    <GuidedText text={unit.question} />
                  </p>
                  <div className="section-select">
                    <nav className="tabs" aria-label="学習内容">
                      {tabs.map(([label, Icon], i) => (
                        <a key={i} href={link(unit, i)} aria-current={t === i ? 'page' : undefined}>
                          <Icon size={17} />
                          {label}
                        </a>
                      ))}
                    </nav>
                    <LessonTerms lessonId={id} />
                  </div>
                  {t !== 0 && unit.scope && <p className="sub">{unit.scope}</p>}
                  <div hidden={t !== 0}>
                    <Diagram hidden={t !== 0} />
                  </div>
                  <div hidden={t !== 1}>
                    <Quiz quiz={lesson.examQuiz} />
                  </div>
                  {t === 2 && <Explanation lesson={lesson} />}
                  {t === 3 && <Lab lesson={lesson} />}
                  <footer>
                    <a href={link(unit, t === 0 ? 1 : 0)}>
                      {t === 0 ? '例題を解く' : '図解に戻る'}
                      <ChevronRight size={16} />
                    </a>
                    <a href={next ? link(next) : weeksPage}>
                      {next ? (week === next.lesson.week ? '次の単元へ' : '次の週へ') : '今週の概要へ'}
                      <ArrowRight size={17} />
                    </a>
                  </footer>
                </>
              )}
            </div>
          </main>
        </div>
        {modal && (
          <Modal title={modal === 'nav' ? '目次' : 'ブックマーク'} onClose={closeNav}>
            {modal === 'nav' ? (
              nav
            ) : Object.values(saved).some(Boolean) ? (
              links(units.filter((u) => saved[u.lesson.id]))
            ) : (
              <p>単元の右上のブックマークを押すと、ここから開けます。</p>
            )}
          </Modal>
        )}
      </HelpProvider>
    </div>
  );
}
