import { useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Microscope,
  Sparkles,
} from 'lucide-react';
import type { InspectorTabId, LessonData, StepInsight } from '../types';
import { QuizCard } from './QuizCard';
import { BreakableIdentifier, RichText } from './RichText';

interface InspectorPanelProps {
  lesson: LessonData;
  activeTab: InspectorTabId;
  onChangeTab: (tab: InspectorTabId) => void;
  stepInsight: StepInsight;
  selectedChoiceId: string | null;
  onSelectQuizChoice: (choiceId: string, isCorrect: boolean) => void;
  predictionText: string;
  onChangePrediction: (value: string) => void;
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
  predictionText,
  onChangePrediction,
}: InspectorPanelProps) {
  const [miniOpen, setMiniOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const handleCopyJson = async () => {
    if (!stepInsight.payloadJson) return;
    try {
      await navigator.clipboard.writeText(stepInsight.payloadJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
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
                      <span className={`status-chip ${pair.tone}`}>{pair.value}</span>
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
                  <button type="button" className="copy-btn" onClick={handleCopyJson}>
                    {copied ? (
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

        {/* Panel 4: MacBook Lab Prediction */}
        <div
          role="tabpanel"
          aria-labelledby="inspector-tab-lab"
          hidden={activeTab !== 'lab'}
          tabIndex={activeTab === 'lab' ? 0 : undefined}
        >
          <div className="tabpanel-inner">
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
              value={predictionText}
              onChange={(e) => onChangePrediction(e.target.value)}
              placeholder="例：入口の Invoker を外すと、Cloud Run のフロント層で 403 になり、コンテナ内のアプリコードには到達しないはず…"
            />
            <p className="anki-meta">
              ※入力内容はこの端末のブラウザに自動保存されます。実習後はリポジトリの PROGRESS.md へ観測結果を記録します。
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
