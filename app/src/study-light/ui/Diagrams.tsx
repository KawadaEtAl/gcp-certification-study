import { type ReactNode, type CSSProperties } from 'react';
import { Check, ChevronDown, SlidersHorizontal, Minus, X } from 'lucide-react';
import { Art, type ArtName } from './Art';

export type Verdict = 'pass' | 'stop' | 'unreached';
export function Status({ value }: { value: Verdict }) {
  const Icon = { pass: Check, stop: X, unreached: Minus }[value];
  return (
    <span className={'verdict ' + value}>
      <Icon size={15} />
      {{ pass: '許可', stop: '拒否', unreached: '未到達' }[value]}
    </span>
  );
}

export type ComparisonItem<T> = { title: ReactNode; id: string; art?: ArtName; status?: Verdict; data: T };
export type Axis<T> = { label: string | ((item: T) => string); value: (item: T) => ReactNode };
export function Comparison<T>({
  label,
  items,
  axes,
  active,
  compact = false,
}: {
  label: string;
  items: ComparisonItem<T>[];
  axes: Axis<T>[];
  active?: string;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={'board' + (compact ? ' compact' : '')}
      style={{ '--cols': items.length, '--axes': axes.length } as CSSProperties}
    >
      {items.map((item) => (
        <article key={item.id} className="board-item" aria-current={active === item.id ? 'step' : undefined}>
          <div className="art-head sheet">
            {!compact && item.art && <Art name={item.art} />}
            <h3>{item.title}</h3>
            {item.status && <Status value={item.status} />}
          </div>
          <dl>
            {axes.map(({ label, value }, i) => (
              <div className="axis" key={i}>
                <dt>{typeof label === 'string' ? label : label(item.data)}</dt>
                <dd>{value(item.data)}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </section>
  );
}

export function ChoiceGroup({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="options" role="group" aria-label={label}>
      {choices.map((x, i) => (
        <button type="button" aria-pressed={i === value} key={x} onClick={() => onChange(i)}>
          {x}
        </button>
      ))}
    </div>
  );
}
export function ScenarioSelect({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly string[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <label className="setting">
      <SlidersHorizontal size={16} />
      <select aria-label={label} value={value} onChange={(e) => onChange(+e.target.value)}>
        {choices.map((x, i) => (
          <option value={i} key={x}>
            {x}
          </option>
        ))}
      </select>
      <ChevronDown size={15} />
    </label>
  );
}
export function Insight({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="insight">
      <div aria-live="polite">
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}
export function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range">
      {label}
      <b>
        {value}
        {unit}
      </b>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={value + unit}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
export function RatioBar({ labels, second }: { labels: [string, string]; second: number }) {
  const v = Math.max(0, Math.min(100, second));
  return (
    <div className="ratio">
      <div>
        <b>
          {labels[0]}　{100 - v}%
        </b>
        <b>
          {labels[1]}　{v}%
        </b>
      </div>
      <div className="ratio-track">
        <span hidden={v === 0} style={{ width: v + '%' }} />
      </div>
    </div>
  );
}
export function BranchDiagram({ parent, children }: { parent: ReactNode; children: [ReactNode, ReactNode] }) {
  return (
    <div className="tree">
      <div>{parent}</div>
      <section>
        {children.map((child, i) => (
          <div key={i}>{child}</div>
        ))}
      </section>
    </div>
  );
}
