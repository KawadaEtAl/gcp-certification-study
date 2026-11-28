import { Check, ChevronDown, Compass, Lock } from 'lucide-react';
import type { LessonData, LessonId, RoadmapPreviewWeek } from '../types';

interface SidebarProps {
  overviewLesson: LessonData;
  week1Lessons: LessonData[];
  week2Lessons: LessonData[];
  roadmap: RoadmapPreviewWeek[];
  activeLessonId: LessonId;
  solvedIds: Record<string, boolean>;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectLesson: (id: LessonId) => void;
}

export function Sidebar({
  overviewLesson,
  week1Lessons,
  week2Lessons,
  roadmap,
  activeLessonId,
  solvedIds,
  mobileOpen,
  onCloseMobile,
  onSelectLesson,
}: SidebarProps) {
  const isOverviewActive = activeLessonId === overviewLesson.id;
  const isWeek1Active = week1Lessons.some((l) => l.id === activeLessonId);
  const upcomingWeeks = roadmap.filter((wk) => wk.status === 'upcoming');

  const renderLessonList = (lessons: LessonData[], ariaLabel: string) => (
    <nav aria-label={ariaLabel}>
      <ul className="lesson-list" role="list">
        {lessons.map((lesson) => {
          const isActive = lesson.id === activeLessonId;
          const isSolved = Boolean(solvedIds[lesson.id]);
          const badgeLabel = lesson.part === 0 ? 'P0' : String(lesson.part);
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
                  {isSolved ? <Check size={14} strokeWidth={3} /> : badgeLabel}
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
  );

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
                  <span className="lesson-meta-title">GCP 全体地図・目次</span>
                  <span className="lesson-meta-sub">骨格図・6領域・24週計画</span>
                </span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Week 2 Group (Active / Open by default) */}
        <details className="sidebar-week-group" open>
          <summary className="sidebar-week-summary">
            <ChevronDown size={15} className="sidebar-week-chevron" aria-hidden="true" />
            <span className="sidebar-week-summary-text">
              <span className="sidebar-kicker">Week 2・安全リリース編</span>
              <span className="sidebar-week-title">Cloud Run ＆ Artifact Registry</span>
            </span>
          </summary>
          {renderLessonList(week2Lessons, '第2週の単元')}
        </details>

        {/* Week 1 Group (Non-exclusive collapsible, open when active) */}
        <details className="sidebar-week-group" open={isWeek1Active || undefined}>
          <summary className="sidebar-week-summary">
            <ChevronDown size={15} className="sidebar-week-chevron" aria-hidden="true" />
            <span className="sidebar-week-summary-text">
              <span className="sidebar-kicker">Week 1・立ち上げ編（完了）</span>
              <span className="sidebar-week-title">社内マニュアル回答アプリ</span>
            </span>
          </summary>
          {renderLessonList(week1Lessons, '第1週の単元')}
        </details>

        <div className="roadmap-section">
          <details className="roadmap-details">
            <summary className="roadmap-summary">
              <ChevronDown size={15} className="roadmap-chevron" aria-hidden="true" />
              <span>24週ロードマップ（第3週以降）</span>
            </summary>
            <ul className="roadmap-list" role="list">
              {upcomingWeeks.map((wk) => (
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
