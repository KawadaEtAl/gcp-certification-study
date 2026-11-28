import { useRef, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Layers,
  Mic,
  Microscope,
  PenTool,
  ShieldAlert,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { InspectorTabId, LessonData, LessonId, StepInsight } from '../types';
import { getGlossaryTermsForLesson } from '../data/glossary';
import { QuizCard } from './QuizCard';
import { ConsoleScreenGallery } from './ConsoleScreenGallery';
import { BreakableIdentifier, RichText } from './RichText';

interface InspectorPanelProps {
  lesson: LessonData;
  activeTab: InspectorTabId;
  onChangeTab: (tab: InspectorTabId) => void;
  stepInsight: StepInsight;
  selectedChoiceId: string | null;
  onSelectQuizChoice: (choiceId: string, isCorrect: boolean) => void;
  predictions: Record<string, string>;
  onChangePrediction: (key: string, value: string) => void;
  onOpenGlossary: (termId?: string) => void;
  onSelectLesson: (id: LessonId) => void;
}

const TABS: { id: InspectorTabId; label: string; icon: typeof HelpCircle }[] = [
  { id: 'quiz', label: '例題', icon: HelpCircle },
  { id: 'step', label: 'インスペクタ', icon: Microscope },
  { id: 'deepdive', label: '解説', icon: BookOpen },
  { id: 'lab', label: 'ラボ', icon: FlaskConical },
];

export function InspectorPanel({
  lesson,
  activeTab,
  onChangeTab,
  stepInsight,
  selectedChoiceId,
  onSelectQuizChoice,
  predictions,
  onChangePrediction,
  onOpenGlossary,
  onSelectLesson,
}: InspectorPanelProps) {
  const [miniOpen, setMiniOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lessonTerms = getGlossaryTermsForLesson(lesson.id);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const targetTab = TABS[nextIdx];
      onChangeTab(targetTab.id);
      const btn = tabRefs.current[nextIdx];
      btn?.focus();
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1600);
    } catch {
      // ignore clipboard denial in insecure contexts
    }
  };

  return (
    <aside className="inspector-pane" aria-label="解説とインスペクタ">
      <div className="tablist" role="tablist" aria-label="学習パネル切替">
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              id={`inspector-tab-${tab.id}`}
              type="button"
              role="tab"
              className="tab-btn"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChangeTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tab-panels-stack">
        {/* Panel 1: Exam Quiz */}
        <div
          role="tabpanel"
          aria-labelledby="inspector-tab-quiz"
          hidden={activeTab !== 'quiz'}
          tabIndex={activeTab === 'quiz' ? 0 : undefined}
        >
          <div className="tabpanel-inner">
            <QuizCard
              quiz={lesson.examQuiz}
              selectedChoiceId={selectedChoiceId}
              onSelectChoice={onSelectQuizChoice}
              onJumpToVisual={() => onChangeTab('step')}
              keyTerms={lessonTerms}
              onOpenGlossary={onOpenGlossary}
            />
          </div>
        </div>

        {/* Panel 2: Live Step / Payload Inspector */}
        <div
          role="tabpanel"
          aria-labelledby="inspector-tab-step"
          hidden={activeTab !== 'step'}
          tabIndex={activeTab === 'step' ? 0 : undefined}
        >
          <div className="tabpanel-inner">
            <p className="panel-kicker">
              ステップ {stepInsight.stepNumber}/{stepInsight.totalSteps}・{stepInsight.badge}
            </p>
            <h2 className="panel-title">{stepInsight.title}</h2>
            <p className="panel-lead">{stepInsight.subtitle}</p>

            <p className="inspector-explain">
              <RichText text={stepInsight.explanation} />
            </p>

            <dl className="kv-list">
              {stepInsight.kvPairs.map((pair) => (
                <div key={pair.label} style={{ display: 'contents' }}>
                  <dt>{pair.label}</dt>
                  <dd>
                    {pair.tone ? (
                      <span className={`status-chip ${pair.tone}`}>
                        <RichText text={pair.value} />
                      </span>
                    ) : (
                      <BreakableIdentifier text={pair.value} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {stepInsight.payloadJson && (
              <div className="code-inspector">
                <div className="code-inspector-head">
                  <span>{stepInsight.payloadTitle ?? 'イベント詳細（JSON）'}</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopyText('payload-json', stepInsight.payloadJson!)}
                  >
                    {copiedKey === 'payload-json' ? (
                      <>
                        <Check size={13} aria-hidden="true" />
                        コピー済
                      </>
                    ) : (
                      <>
                        <Copy size={13} aria-hidden="true" />
                        コピー
                      </>
                    )}
                  </button>
                </div>
                <pre>{stepInsight.payloadJson}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Deep Dive & Thinking Chart */}
        <div
          role="tabpanel"
          aria-labelledby="inspector-tab-deepdive"
          hidden={activeTab !== 'deepdive'}
          tabIndex={activeTab === 'deepdive' ? 0 : undefined}
        >
          <div className="tabpanel-inner">
            <p className="panel-kicker">思考のチャート</p>
            <h2 className="panel-title">迷わず切り分ける 3 ステップ</h2>

            <ol className="chart-steps" role="list">
              {lesson.thinkingChart.map((step, idx) => (
                <li key={step.label} className="chart-step">
                  <span className="chart-step-index" aria-hidden="true">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <strong>{step.label}</strong>
                    <span>
                      <RichText text={step.detail} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            {lesson.deepDiveParagraphs.map((section) => (
              <div key={section.heading} className="prose-block">
                <h3>
                  <RichText text={section.heading} />
                </h3>
                {section.body.split('\n').map((para, pIdx) => (
                  <p key={pIdx}>
                    <RichText text={para} />
                  </p>
                ))}
                {section.callout && (
                  <div className="callout-tip">
                    <span className="callout-kicker">ポイント</span>
                    <RichText text={section.callout} />
                  </div>
                )}
              </div>
            ))}

            {lessonTerms.length > 0 && (
              <section className="lesson-glossary-box" aria-label="この単元の重要用語">
                <div className="lesson-glossary-head">
                  <div>
                    <p className="panel-kicker">この単元の用語辞典</p>
                    <h3 className="lesson-glossary-title">タップして意味とイメージを確認</h3>
                  </div>
                  <button
                    type="button"
                    className="console-action-btn"
                    onClick={() => onOpenGlossary()}
                  >
                    <BookMarked size={13} aria-hidden="true" />
                    全用語を見る
                  </button>
                </div>
                <div className="term-chip-list">
                  {lessonTerms.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="term-chip"
                      onClick={() => onOpenGlossary(item.id)}
                    >
                      {item.term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <ConsoleScreenGallery screens={lesson.consoleScreens} />

            <div className="disclosure-box">
              <p className="disclosure-prompt">
                ミニ確認：<RichText text={lesson.miniQuiz.prompt} />
              </p>
              <button
                type="button"
                className="disclosure-trigger"
                aria-expanded={miniOpen}
                onClick={() => setMiniOpen((prev) => !prev)}
              >
                <span>{miniOpen ? '解説を閉じる' : '答えと解説を見る'}</span>
                {miniOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>
              {miniOpen && (
                <p className="disclosure-answer">
                  <RichText text={lesson.miniQuiz.answer} />
                </p>
              )}
            </div>

            <div className="flip-box">
              <strong className="flip-title">
                <Sparkles size={14} aria-hidden="true" />
                条件が変わったら
              </strong>
              <div>
                <RichText text={lesson.flipCondition} />
              </div>
            </div>

            {lesson.story.nextBridge && (
              <section className="next-story-card" aria-label="次のストーリー">
                <p className="panel-kicker">ストーリーの続き</p>
                <p className="next-story-teaser">
                  <RichText text={lesson.story.nextBridge.teaser} />
                </p>
                {lesson.story.nextBridge.nextLessonId ? (
                  <button
                    type="button"
                    className="btn-play"
                    onClick={() => onSelectLesson(lesson.story.nextBridge!.nextLessonId!)}
                  >
                    {lesson.story.nextBridge.nextLabel}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <p className="next-story-finale">{lesson.story.nextBridge.nextLabel}</p>
                )}
              </section>
            )}

            <p className="panel-kicker" style={{ marginTop: '1.1rem' }}>
              公式ドキュメント・Anki
            </p>
            <div className="doc-links">
              {lesson.docLinks.map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="doc-link-pill"
                >
                  {doc.label}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
            <p className="anki-meta">
              対応 Anki カード（<code className="inline-code">GCP::PCA</code>）：{' '}
              <span className="mono">{lesson.ankiCardIds.join(', ')}</span>
            </p>
          </div>
        </div>

        {/* Panel 4: Lab Retention Loop (4-Step for Week 2+, Single Prediction for Week 0-1) */}
        <div
          role="tabpanel"
          aria-labelledby="inspector-tab-lab"
          hidden={activeTab !== 'lab'}
          tabIndex={activeTab === 'lab' ? 0 : undefined}
        >
          <div className="tabpanel-inner">
            {lesson.labGuide ? (
              <div className="lab-loop-stack">
                <div>
                  <p className="panel-kicker">4 ステップ定着ループ（サンドボックス継続）</p>
                  <h2 className="panel-title">{lesson.labGuide.title}</h2>
                  <p className="panel-lead">
                    <RichText text={lesson.labGuide.sandboxSummary} />
                  </p>
                </div>

                {/* Step 1: 3 Pre-Lab Predictions */}
                <section className="lab-step-card" aria-labelledby={`lab-step1-${lesson.id}`}>
                  <div className="lab-step-head">
                    <span className="lab-step-badge" aria-hidden="true">1</span>
                    <h3 id={`lab-step1-${lesson.id}`} className="lab-step-title">
                      事前予測（3 問）— 手を動かす前に一言メモ
                    </h3>
                  </div>

                  <div className="lab-pred-list">
                    {lesson.labGuide.predictions.map((pred) => {
                      const storageKey = `${lesson.id}:${pred.id}`;
                      return (
                        <div key={pred.id} className="lab-pred-item">
                          <label htmlFor={`pred-${storageKey}`} className="prediction-label">
                            <RichText text={pred.question} />
                          </label>
                          <textarea
                            id={`pred-${storageKey}`}
                            className="prediction-textarea prediction-textarea--compact"
                            value={predictions[storageKey] ?? ''}
                            onChange={(e) => onChangePrediction(storageKey, e.target.value)}
                            placeholder={pred.placeholder}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="anki-meta">
                    ※入力はこの端末のブラウザへ自動保存されます。実測後に予想との差分を確認します。
                  </p>
                </section>

                {/* Step 2: Hand Drawing & AI Review */}
                <section className="lab-step-card" aria-labelledby={`lab-step2-${lesson.id}`}>
                  <div className="lab-step-head">
                    <span className="lab-step-badge" aria-hidden="true">2</span>
                    <h3 id={`lab-step2-${lesson.id}`} className="lab-step-title">
                      <PenTool size={14} aria-hidden="true" />
                      手書き作図 ＆ AI 添削
                    </h3>
                  </div>
                  <p className="lab-step-body">
                    <RichText text={lesson.labGuide.handDrawTheme} />
                  </p>
                  <ul className="lab-checklist" role="list">
                    {lesson.labGuide.handDrawChecklist.map((point) => (
                      <li key={point}>
                        <RichText text={point} />
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Step 3: Minimal Commands on Existing week01-manual-api */}
                <section className="lab-step-card" aria-labelledby={`lab-step3-${lesson.id}`}>
                  <div className="lab-step-head">
                    <span className="lab-step-badge" aria-hidden="true">3</span>
                    <h3 id={`lab-step3-${lesson.id}`} className="lab-step-title">
                      <Terminal size={14} aria-hidden="true" />
                      既存 week01-manual-api での最小実測
                    </h3>
                  </div>

                  <div className="lab-command-list">
                    {lesson.labGuide.minimalCommands.map((cmd, idx) => {
                      const copyId = `cmd-${lesson.id}-${idx}`;
                      return (
                        <div key={cmd.title} className="lab-command-card">
                          <strong className="lab-command-title">{cmd.title}</strong>
                          <p className="lab-command-purpose">
                            <RichText text={cmd.purpose} />
                          </p>
                          <div className="code-inspector">
                            <div className="code-inspector-head">
                              <span>gcloud コマンド</span>
                              <button
                                type="button"
                                className="copy-btn"
                                onClick={() => handleCopyText(copyId, cmd.command)}
                              >
                                {copiedKey === copyId ? (
                                  <>
                                    <Check size={13} aria-hidden="true" />
                                    コピー済
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} aria-hidden="true" />
                                    コピー
                                  </>
                                )}
                              </button>
                            </div>
                            <pre>{cmd.command}</pre>
                          </div>
                          <p className="lab-command-observe">
                            <strong>観測：</strong>
                            <RichText text={cmd.observe} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Step 4: Voice Explanation & Logging */}
                <section className="lab-step-card" aria-labelledby={`lab-step4-${lesson.id}`}>
                  <div className="lab-step-head">
                    <span className="lab-step-badge" aria-hidden="true">4</span>
                    <h3 id={`lab-step4-${lesson.id}`} className="lab-step-title">
                      <Mic size={14} aria-hidden="true" />
                      メモなし音声説明 ＆ 記録
                    </h3>
                  </div>
                  <ul className="lab-checklist" role="list">
                    {lesson.labGuide.voiceExplainPrompts.map((prompt) => (
                      <li key={prompt}>
                        <RichText text={prompt} />
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Hidden Actors & 3-Tier Settings Hierarchy */}
                <section className="lab-hidden-box" aria-labelledby={`lab-hidden-${lesson.id}`}>
                  <h3 id={`lab-hidden-${lesson.id}`} className="lab-hidden-title">
                    <ShieldAlert size={15} aria-hidden="true" />
                    {lesson.labGuide.hiddenActorsTitle}
                  </h3>
                  <dl className="lab-hidden-list">
                    {lesson.labGuide.hiddenActors.map((actor) => (
                      <div key={actor.label} className="lab-hidden-row">
                        <dt>{actor.label}</dt>
                        <dd>
                          <RichText text={actor.detail} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="lab-hidden-box is-hierarchy" aria-labelledby={`lab-tiers-${lesson.id}`}>
                  <h3 id={`lab-tiers-${lesson.id}`} className="lab-hidden-title">
                    <Layers size={15} aria-hidden="true" />
                    {lesson.labGuide.hierarchyLevelsTitle}
                  </h3>
                  <dl className="lab-hidden-list">
                    {lesson.labGuide.hierarchyLevels.map((tier) => (
                      <div key={tier.label} className="lab-hidden-row">
                        <dt>{tier.label}</dt>
                        <dd>
                          <RichText text={tier.detail} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            ) : (
              <>
                <p className="panel-kicker">MacBook ラボ前の予測メモ</p>
                <h2 className="panel-title">手を動かす前に予測を書く</h2>
                <p className="panel-lead">
                  MacBook で演習を実行する前に、挙動の予測を自分の言葉でメモしておくと、実際の観測とのズレが最も記憶に残ります。
                </p>

                <label htmlFor={`prediction-${lesson.id}`} className="prediction-label">
                  予測のお題：{lesson.labPredictionPrompt}
                </label>
                <textarea
                  id={`prediction-${lesson.id}`}
                  className="prediction-textarea"
                  value={predictions[lesson.id] ?? ''}
                  onChange={(e) => onChangePrediction(lesson.id, e.target.value)}
                  placeholder="例：入口の Invoker を外すと、Cloud Run のフロント層で 403 になり、コンテナ内のアプリコードには到達しないはず…"
                />
                <p className="anki-meta">
                  ※入力内容はこの端末のブラウザに自動保存されます。実習後はリポジトリの PROGRESS.md へ観測結果を記録します。
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
