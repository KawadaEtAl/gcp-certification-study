import { useCallback, useEffect, useState } from 'react';
import { ROADMAP_PREVIEW, WEEK00_LESSON, WEEK01_LESSONS } from './data/week01';
import type { InspectorTabId, LessonId, StepInsight } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InspectorPanel } from './components/InspectorPanel';
import { Week0OverviewViz } from './visualizers/Week0OverviewViz';
import { Part1CloudRunViz } from './visualizers/Part1CloudRunViz';
import { Part2KeylessAuthViz } from './visualizers/Part2KeylessAuthViz';
import { Part3HierarchyViz } from './visualizers/Part3HierarchyViz';
import { Part4BudgetQuotaViz } from './visualizers/Part4BudgetQuotaViz';

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

const ALL_LESSONS = [WEEK00_LESSON, ...WEEK01_LESSONS];

export function App() {
  const [activeLessonId, setActiveLessonId] = useState<LessonId>('w00-overview');
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('step');
  const [focusCanvas, setFocusCanvas] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stepInsight, setStepInsight] = useState<StepInsight>(DEFAULT_INSIGHT);
  const [saved, setSaved] = useState<SavedProgress>(() => loadSavedState());

  const activeLesson = ALL_LESSONS.find((l) => l.id === activeLessonId) ?? WEEK00_LESSON;

  useEffect(() => {
    document.title =
      activeLesson.week === 0
        ? 'Week 0: GCP 全体像・目次 | GCP Architecture Explorer'
        : `Part ${activeLesson.part}: ${activeLesson.shortTitle} | GCP Architecture Explorer`;
  }, [activeLesson]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore storage quota failures
    }
  }, [saved]);

  const handleSelectLesson = (id: LessonId) => {
    setActiveLessonId(id);
    if (id === 'w00-overview') {
      setInspectorTab('step');
    } else {
      setInspectorTab(saved.solved[id] ? 'step' : 'quiz');
    }
  };

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

  const handleChangePrediction = (value: string) => {
    setSaved((prev) => ({
      ...prev,
      predictions: { ...prev.predictions, [activeLesson.id]: value },
    }));
  };

  const handleStepInsightChange = useCallback((insight: StepInsight) => {
    setStepInsight(insight);
  }, []);

  const solvedCount = WEEK01_LESSONS.filter((l) => saved.solved[l.id]).length;

  return (
    <div className="app-shell">
      <a href="#main-stage" className="skip-link visually-hidden">
        メインの図解キャンバスへ移動
      </a>

      <Header
        solvedCount={solvedCount}
        totalCount={WEEK01_LESSONS.length}
        focusCanvas={focusCanvas}
        onToggleFocusCanvas={() => setFocusCanvas((prev) => !prev)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className={`workspace ${focusCanvas ? 'focus-canvas' : ''}`}>
        <Sidebar
          overviewLesson={WEEK00_LESSON}
          lessons={WEEK01_LESSONS}
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
          </nav>

          <div className="stage-header">
            <div>
              <div className="stage-kicker-row">
                <span className="kicker-tag">
                  {activeLesson.week === 0
                    ? 'Week 0・全体像とインデックス'
                    : `第1週・Part ${activeLesson.part}（${activeLesson.domain}）`}
                </span>
                <span className="kicker-visual">{activeLesson.visualTypeLabel}</span>
              </div>
              <h1 className="stage-title" tabIndex={-1}>
                {activeLesson.title}
              </h1>
              <p className="stage-tagline">{activeLesson.tagline}</p>
            </div>
          </div>

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
        </main>

        <InspectorPanel
          lesson={activeLesson}
          activeTab={inspectorTab}
          onChangeTab={setInspectorTab}
          stepInsight={stepInsight}
          selectedChoiceId={saved.quizChoices[activeLesson.id] ?? null}
          onSelectQuizChoice={handleSelectQuizChoice}
          predictionText={saved.predictions[activeLesson.id] ?? ''}
          onChangePrediction={handleChangePrediction}
        />
      </div>
    </div>
  );
}
