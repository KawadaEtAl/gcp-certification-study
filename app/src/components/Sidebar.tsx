import { Check, ChevronDown, Compass, Lock } from 'lucide-react';
import type { LessonData, LessonId, RoadmapPreviewWeek } from '../types';

interface SidebarProps {
  overviewLesson: LessonData;
  lessons: LessonData[];
  roadmap: RoadmapPreviewWeek[];
  activeLessonId: LessonId;
  solvedIds: Record<string, boolean>;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectLesson: (id: LessonId) => void;
}

export function Sidebar({
  overviewLesson,
  lessons,
  roadmap,
  activeLessonId,
  solvedIds,
  mobileOpen,
  onCloseMobile,
  onSelectLesson,
}: SidebarProps) {
  const isOverviewActive = activeLessonId === overviewLesson.id;

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop mobile-only"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="カリキュラムと単元一覧">
        <div className="sidebar-head">
          <p className="sidebar-kicker">Week 0・全体像</p>
        </div>

        <nav aria-label="全体像とインデックス">
          <ul className="lesson-list" role="list" style={{ paddingTop: 0, paddingBottom: '0.35rem' }}>
            <li>
              <button
                type="button"
                className="lesson-nav-btn"
                aria-current={isOverviewActive ? 'page' : undefined}
                onClick={() => {
                  onSelectLesson(overviewLesson.id);
                  onCloseMobile();
                }}
              >
                <span className="lesson-num" aria-hidden="true">
                  <Compass size={15} />
                </span>
                <span className="lesson-nav-copy">
                  <span className="lesson-meta-title">GCP 全体像・目次</span>
                  <span className="lesson-meta-sub">6領域マップ・24週計画</span>
                </span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-head" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <p className="sidebar-kicker">Week 1・立ち上げ編</p>
          <h2 className="sidebar-heading">社内マニュアル回答アプリ</h2>
        </div>

        <nav aria-label="第1週の単元">
          <ul className="lesson-list" role="list">
            {lessons.map((lesson) => {
              const isActive = lesson.id === activeLessonId;
              const isSolved = Boolean(solvedIds[lesson.id]);
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className={`lesson-nav-btn ${isSolved ? 'solved' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      onSelectLesson(lesson.id);
                      onCloseMobile();
                    }}
                  >
                    <span className="lesson-num" aria-hidden="true">
                      {isSolved ? <Check size={14} strokeWidth={3} /> : lesson.part}
                    </span>
                    <span className="lesson-nav-copy">
                      <span className="lesson-meta-title">{lesson.shortTitle}</span>
                      <span className="lesson-meta-sub">
                        {lesson.story.episodeLabel}：{lesson.story.hookTitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="roadmap-section">
          <details className="roadmap-details">
            <summary className="roadmap-summary">
              <span>24週ロードマップ（第2週以降）</span>
              <ChevronDown size={15} className="roadmap-chevron" aria-hidden="true" />
            </summary>
            <ul className="roadmap-list" role="list">
              {roadmap.slice(1).map((wk) => (
                <li key={wk.week} className="roadmap-row">
                  <span className="roadmap-wk">W{String(wk.week).padStart(2, '0')}</span>
                  <span>
                    {wk.title}{' '}
                    <Lock size={11} style={{ verticalAlign: 'middle', opacity: 0.5 }} aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </aside>
    </>
  );
}
