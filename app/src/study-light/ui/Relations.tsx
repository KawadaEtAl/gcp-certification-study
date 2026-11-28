import type { ReactNode, CSSProperties } from 'react';
import { Art, type ArtName } from './Art';
import { Status, type Verdict } from './Diagrams';

export function FlowNode({
  area,
  art,
  label,
  children,
}: {
  area: string;
  art: ArtName;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flow-node" style={{ gridArea: area }} data-node={area}>
      <Art name={art} />
      <div>
        <strong>{label}</strong>
        <small>{children}</small>
      </div>
    </div>
  );
}

export function FlowEdge({
  area,
  number,
  label,
  route,
  children,
  result,
  active,
  progress,
  onSelect,
}: {
  area: string;
  number: number;
  label: string;
  route: string;
  children: ReactNode;
  result: Verdict;
  active: boolean;
  progress: number;
  onSelect: () => void;
}) {
  return (
    <div
      data-edge={area}
      className="flow-edge"
      data-active={active}
      data-result={result}
      style={{ gridArea: area }}
    >
      <button
        onClick={onSelect}
        aria-current={active ? 'step' : undefined}
        aria-haspopup={result === 'unreached' ? 'dialog' : undefined}
        aria-label={number + ' ' + label + ' ' + route}
      >
        <span>{number}</span>
        {label}
      </button>
      <div className="flow-line" aria-hidden="true">
        {active && progress > 0 && progress < 1 && (
          <i style={{ '--travel': progress * 100 + '%' } as CSSProperties} />
        )}
      </div>
      <div className="flow-cargo">{children}</div>
      <Status value={result} />
    </div>
  );
}

export type TreeItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  kind?: string;
  children?: TreeItem[];
};

export function ResourceTree({
  label,
  items,
  annotation,
}: {
  label: string;
  items: TreeItem[];
  annotation: (item: TreeItem, parents: string[]) => ReactNode;
}) {
  function branch(nodes: TreeItem[], parents: string[]) {
    return (
      <ul role="list">
        {nodes.map((n) => (
          <li key={n.id}>
            <div className="branch-row" data-resource={n.id}>
              <div className="branch-name">
                {n.icon}
                <div>{n.label}</div>
              </div>
              <div className="branch-note">{annotation(n, parents)}</div>
            </div>
            {n.children && branch(n.children, [...parents, n.id])}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section className="resource-tree" aria-label={label}>
      {branch(items, [])}
    </section>
  );
}
