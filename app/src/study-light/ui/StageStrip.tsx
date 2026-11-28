import type { CSSProperties } from 'react';
import { ArrowRight, Check, Minus, X, Clock3 } from 'lucide-react';
import { Art, type ArtName } from './Art';

export type Step = {
  art: ArtName;
  label: string;
  note: string;
  result?: 'pass' | 'stop' | 'unreached' | 'wait';
};
const marks = { pass: Check, stop: X, unreached: Minus, wait: Clock3 };

/** Ordered stages. Arrows express sequence, not physical hops. */
export function StageStrip({
  steps,
  label,
  onArt,
}: {
  steps: readonly Step[];
  label: string;
  onArt?: (name: ArtName) => void;
}) {
  return (
    <ol
      aria-label={label}
      role="list"
      className="stage-strip sheet"
      style={{ '--stages': steps.length } as CSSProperties}
    >
      {steps.map(({ art, label, note, result }, i) => {
        const Icon = result && marks[result];
        const drawing = <Art name={art} />;
        return (
          <li key={i} data-result={result}>
            {onArt ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={label + 'のイラストを見る'}
                onClick={() => onArt(art)}
              >
                {drawing}
              </button>
            ) : (
              drawing
            )}
            <div>
              <strong>{label}</strong>
              <span>
                {Icon && <Icon size={16} aria-hidden="true" />}
                {note}
              </span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="strip-arrow" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
