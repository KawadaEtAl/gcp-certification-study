import { useCallback, useEffect, useState } from 'react';
import { ROADMAP_PREVIEW, WEEK00_LESSON, WEEK01_LESSONS } from './data/week01';
import { WEEK02_LESSONS } from './data/week02';
import type { InspectorTabId, LessonId, StepInsight } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InspectorPanel } from './components/InspectorPanel';
import { GlossaryDialog } from './components/GlossaryDialog';
import { StoryBrief } from './components/StoryBrief';
import { Week0OverviewViz } from './visualizers/Week0OverviewViz';
import { Part1CloudRunViz } from './visualizers/Part1CloudRunViz';
import { Part2KeylessAuthViz } from './visualizers/Part2KeylessAuthViz';
import { Part3HierarchyViz } from './visualizers/Part3HierarchyViz';
import { Part4BudgetQuotaViz } from './visualizers/Part4BudgetQuotaViz';
import { Week02Part0OverviewViz } from './visualizers/Week02Part0OverviewViz';
import { Week02Part1ServiceVsJobViz } from './visualizers/Week02Part1ServiceVsJobViz';
import { Week02Part2RevisionTrafficViz } from './visualizers/Week02Part2RevisionTrafficViz';
import { Week02Part3ScalingViz } from './visualizers/Week02Part3ScalingViz';
import { Week02Part4ArtifactRegistryViz } from './visualizers/Week02Part4ArtifactRegistryViz';

const STORAGE_KEY = 'gcp-pca-explorer-state-v1';

interface SavedProgress {
  quizChoices: Record<string, string>;
  solved: Record<string, boolean>;
  predictions: Record<string, string>;
}

function loadSavedState(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { quizChoices: {}, solved: {}, predictions: {} };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      quizChoices: parsed.quizChoices ?? {},
      solved: parsed.solved ?? {},
      predictions: parsed.predictions ?? {},
    };
  } catch {
    return { quizChoices: {}, solved: {}, predictions: {} };
  }
}

const DEFAULT_INSIGHT: StepInsight = {
  stepNumber: 1,
  totalSteps: 1,
  badge: '概要',
  title: 'ステップを選択してください',
  subtitle: '図を操作するとここに詳細が表示されます',
  explanation: '再生またはノード・イベントのクリックで詳細インスペクタが連動します。',
  kvPairs: [],
};

const ALL_LESSONS = [WEEK00_LESSON, ...WEEK01_LESSONS, ...WEEK02_LESSONS];
const TRACKED_QUIZ_LESSONS = [
  ...WEEK01_LESSONS,
  ...WEEK02_LESSONS.filter((l) => l.part > 0),
];

function getInitialLessonId(): LessonId {
  if (typeof window === 'undefined') return 'w00-overview';
  const hash = window.location.hash.replace(/^#/, '');
  const match = ALL_LESSONS.find((l) => l.id === hash);
  return match ? match.id : 'w02-p0';
}

export function App() {
  const [activeLessonId, setActiveLessonId] = useState<LessonId>(getInitialLessonId);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>(() => {
    const initId = getInitialLessonId();
    return initId === 'w00-overview' || initId === 'w02-p0' ? 'step' : 'quiz';
  });
  const [focusCanvas, setFocusCanvas] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryTermId, setGlossaryTermId] = useState<string | null>(null);
  const [stepInsight, setStepInsight] = useState<StepInsight>(DEFAULT_INSIGHT);
  const [saved, setSaved] = useState<SavedProgress>(() => loadSavedState());

  const activeLesson = ALL_LESSONS.find((l) => l.id === activeLessonId) ?? WEEK00_LESSON;

  useEffect(() => {
    document.title =
      activeLesson.week === 0
        ? 'Week 0: GCP 全体像・目次 | GCP Architecture Explorer'
        : `W${activeLesson.week} Part ${activeLesson.part}: ${activeLesson.shortTitle} | GCP Architecture Explorer`;
  }, [activeLesson]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore storage quota failures
    }
  }, [saved]);

  const handleSelectLesson = useCallback(
    (id: LessonId) => {
      setActiveLessonId(id);
      if (id === 'w00-overview' || id === 'w02-p0') {
        setInspectorTab('step');
      } else {
        setInspectorTab(saved.solved[id] ? 'step' : 'quiz');
      }
      try {
        window.history.replaceState(null, '', `#${id}`);
      } catch {
        // ignore history restrictions
      }
      const stage = document.getElementById('main-stage');
      stage?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [saved.solved],
  );

  const handleSelectQuizChoice = (choiceId: string, isCorrect: boolean) => {
    setSaved((prev) => ({
      ...prev,
      quizChoices: { ...prev.quizChoices, [activeLesson.id]: choiceId },
      solved: {
        ...prev.solved,
        [activeLesson.id]: prev.solved[activeLesson.id] || isCorrect,
      },
    }));
  };

  const handleChangePrediction = (key: string, value: string) => {
    setSaved((prev) => ({
      ...prev,
      predictions: { ...prev.predictions, [key]: value },
    }));
  };

  const handleStepInsightChange = useCallback((insight: StepInsight) => {
    setStepInsight(insight);
  }, []);

  const handleOpenGlossary = useCallback((termId?: string) => {
    setGlossaryTermId(termId ?? null);
    setGlossaryOpen(true);
  }, []);

  const handleCloseGlossary = useCallback(() => {
    setGlossaryOpen(false);
    setGlossaryTermId(null);
  }, []);

  const solvedCount = TRACKED_QUIZ_LESSONS.filter((l) => saved.solved[l.id]).length;
  const activeLessonBadge =
    activeLesson.week === 0
      ? 'Week 0'
      : `W${activeLesson.week} P${activeLesson.part}`;

  return (
    <div className="app-shell">
      <a href="#main-stage" className="skip-link visually-hidden">
        メインの図解キャンバスへ移動
      </a>

      <Header
        solvedCount={solvedCount}
        totalCount={TRACKED_QUIZ_LESSONS.length}
        focusCanvas={focusCanvas}
        onToggleFocusCanvas={() => setFocusCanvas((prev) => !prev)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onOpenGlossary={() => handleOpenGlossary()}
      />

      <div className={`workspace ${focusCanvas ? 'focus-canvas' : ''}`}>
        <Sidebar
          overviewLesson={WEEK00_LESSON}
          week1Lessons={WEEK01_LESSONS}
          week2Lessons={WEEK02_LESSONS}
          roadmap={ROADMAP_PREVIEW}
          activeLessonId={activeLessonId}
          solvedIds={saved.solved}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectLesson={handleSelectLesson}
        />

        <main id="main-stage" className="stage-pane">
          <nav className="mobile-lesson-strip" aria-label="単元のクイック切替">
            <button
              type="button"
              className="mobile-lesson-pill"
              aria-current={activeLessonId === WEEK00_LESSON.id ? 'page' : undefined}
              onClick={() => handleSelectLesson(WEEK00_LESSON.id)}
            >
              W0 全体像
            </button>

            {activeLesson.week === 2 ? (
              <>
                <button
                  type="button"
                  className="mobile-lesson-pill"
                  onClick={() => handleSelectLesson('w01-p1')}
                >
                  W1 へ
                </button>
                {WEEK02_LESSONS.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className="mobile-lesson-pill"
                    aria-current={lesson.id === activeLessonId ? 'page' : undefined}
                    onClick={() => handleSelectLesson(lesson.id)}
                  >
                    P{lesson.part} {lesson.shortTitle}
                  </button>
                ))}
              </>
            ) : activeLesson.week === 1 ? (
              <>
                {WEEK01_LESSONS.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className="mobile-lesson-pill"
                    aria-current={lesson.id === activeLessonId ? 'page' : undefined}
                    onClick={() => handleSelectLesson(lesson.id)}
                  >
                    P{lesson.part} {lesson.shortTitle}
                  </button>
                ))}
                <button
                  type="button"
                  className="mobile-lesson-pill"
                  onClick={() => handleSelectLesson('w02-p0')}
                >
                  W2 へ
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="mobile-lesson-pill"
                  onClick={() => handleSelectLesson('w02-p0')}
                >
                  W2 リリース編
                </button>
                <button
                  type="button"
                  className="mobile-lesson-pill"
                  onClick={() => handleSelectLesson('w01-p1')}
                >
                  W1 立ち上げ編
                </button>
              </>
            )}
          </nav>

          <div className="stage-header">
            <div>
              <div className="stage-kicker-row">
                <span className="kicker-tag">
                  {activeLesson.week === 0
                    ? 'Week 0・全体像とインデックス'
                    : `第${activeLesson.week}週・Part ${activeLesson.part}（${activeLesson.domain}）`}
                </span>
                <span className="kicker-visual">{activeLesson.visualTypeLabel}</span>
              </div>
              <h1 className="stage-title" tabIndex={-1}>
                {activeLesson.title}
              </h1>
              <p className="stage-tagline">{activeLesson.tagline}</p>
            </div>
          </div>

          <StoryBrief story={activeLesson.story} lessonKey={activeLesson.id} />

          {activeLessonId === 'w00-overview' && (
            <Week0OverviewViz
              onStepInsightChange={handleStepInsightChange}
              onJumpToLesson={handleSelectLesson}
            />
          )}
          {activeLessonId === 'w01-p1' && (
            <Part1CloudRunViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w01-p2' && (
            <Part2KeylessAuthViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w01-p3' && (
            <Part3HierarchyViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w01-p4' && (
            <Part4BudgetQuotaViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w02-p0' && (
            <Week02Part0OverviewViz
              onStepInsightChange={handleStepInsightChange}
              onJumpToLesson={handleSelectLesson}
              onOpenGlossary={handleOpenGlossary}
            />
          )}
          {activeLessonId === 'w02-p1' && (
            <Week02Part1ServiceVsJobViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w02-p2' && (
            <Week02Part2RevisionTrafficViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w02-p3' && (
            <Week02Part3ScalingViz onStepInsightChange={handleStepInsightChange} />
          )}
          {activeLessonId === 'w02-p4' && (
            <Week02Part4ArtifactRegistryViz onStepInsightChange={handleStepInsightChange} />
          )}
        </main>

        <InspectorPanel
          lesson={activeLesson}
          activeTab={inspectorTab}
          onChangeTab={setInspectorTab}
          stepInsight={stepInsight}
          selectedChoiceId={saved.quizChoices[activeLesson.id] ?? null}
          onSelectQuizChoice={handleSelectQuizChoice}
          predictions={saved.predictions}
          onChangePrediction={handleChangePrediction}
          onOpenGlossary={handleOpenGlossary}
          onSelectLesson={handleSelectLesson}
        />
      </div>

      <GlossaryDialog
        open={glossaryOpen}
        activeLessonId={activeLessonId}
        activeLessonLabel={activeLessonBadge}
        initialTermId={glossaryTermId}
        onClose={handleCloseGlossary}
      />
    </div>
  );
}
