import { CheckCircle2, XCircle, ArrowRight, BookMarked } from 'lucide-react';
import type { GlossaryTerm, QuizQuestion } from '../types';
import { RichText } from './RichText';

interface QuizCardProps {
  quiz: QuizQuestion;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string, isCorrect: boolean) => void;
  onJumpToVisual: () => void;
  keyTerms: GlossaryTerm[];
  onOpenGlossary: (termId?: string) => void;
}

export function QuizCard({
  quiz,
  selectedChoiceId,
  onSelectChoice,
  onJumpToVisual,
  keyTerms,
  onOpenGlossary,
}: QuizCardProps) {
  const selected = quiz.choices.find((c) => c.id === selectedChoiceId) ?? null;

  return (
    <div>
      <p className="panel-kicker">まず考えてみよう</p>
      <h2 className="panel-title">{quiz.title}</h2>
      <p className="panel-lead">
        <RichText text={quiz.scenario} />
      </p>

      {keyTerms.length > 0 && (
        <div className="quiz-glossary-strip" aria-label="この問題に出てくる用語">
          <div className="quiz-glossary-head">
            <span className="quiz-glossary-label">
              <BookMarked size={13} aria-hidden="true" />
              わからない用語をタップして確認
            </span>
            <button
              type="button"
              className="quiz-glossary-all-btn"
              onClick={() => onOpenGlossary()}
            >
              一覧
            </button>
          </div>
          <div className="term-chip-list">
            {keyTerms.slice(0, 6).map((item) => (
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
        </div>
      )}

      <div className="quiz-choices" role="group" aria-label="選択肢">
        {quiz.choices.map((choice) => {
          const isPicked = selectedChoiceId === choice.id;
          let stateClass = '';
          if (selectedChoiceId) {
            if (isPicked && choice.correct) stateClass = 'selected-correct';
            else if (isPicked && !choice.correct) stateClass = 'selected-wrong';
            else if (choice.correct) stateClass = 'selected-correct';
          }

          return (
            <button
              key={choice.id}
              type="button"
              className={`quiz-choice-btn ${stateClass}`}
              aria-pressed={isPicked}
              onClick={() => onSelectChoice(choice.id, choice.correct)}
            >
              <span className="choice-letter">{choice.label}</span>
              <span>
                <RichText text={choice.text} />
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className={`feedback-box ${selected.correct ? 'correct' : 'wrong'}`}
          role="status"
          aria-live="polite"
        >
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {selected.correct ? (
              <>
                <CheckCircle2 size={16} aria-hidden="true" />
                正解（{selected.label}）
              </>
            ) : (
              <>
                <XCircle size={16} aria-hidden="true" />
                {selected.label} は不正解
              </>
            )}
          </strong>
          <p>
            <RichText text={selected.rationale} />
          </p>
          <p style={{ marginTop: '0.5rem', fontWeight: 650 }}>
            <RichText text={quiz.summary} />
          </p>

          <div style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn-play" onClick={onJumpToVisual}>
              インスペクタで動きを追う
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
