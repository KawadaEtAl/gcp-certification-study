import { type ReactNode, useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Menu,
  Search,
  Shapes,
  Workflow,
} from 'lucide-react';
import { Art, type ArtName } from '../ui/Art';
import { ChoiceGroup, Insight } from '../ui/Diagrams';
import { Modal } from '../ui/Help';
import { StageStrip } from '../ui/StageStrip';
import { groups, names, objects, type Group } from './objects';
import { figures, type Figure } from './figures';
import './library.css';

const categories = Object.keys(groups) as Group[];
const gallery = (group?: Group) => '#art' + (group ? '/' + group : '');
const example = (figure: Figure) => '#figures/' + figure.id;

function Preview({ name, onClose }: { name: ArtName; onClose: () => void }) {
  const { label, usage } = objects[name];
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState('');
  const snippet = '<Art name="' + name + '" />';
  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied('コピー済み');
    } catch {
      setCopied('コードを選んでコピーしてください');
    }
  }
  function save() {
    const svg = ref.current!.querySelector('svg')!.cloneNode(true) as SVGSVGElement;
    svg.removeAttribute('aria-hidden');
    svg.removeAttribute('class');
    svg.setAttribute('width', '240');
    svg.setAttribute('height', '196');
    const a = document.createElement('a');
    a.download = name + '.svg';
    a.href =
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    a.click();
  }
  const related = figures.filter((f) => f.variants.some((v) => v.steps.some((s) => s.art === name)));
  return (
    <Modal title={label} onClose={onClose}>
      <div className="art-preview sheet" ref={ref}>
        <Art name={name} />
        <div>
          <Art name={name} />
          <small>64 px</small>
        </div>
      </div>
      <p>{usage}</p>
      <div className="art-snippet">
        <code>{snippet}</code>
        <button className="bare" aria-label="コードをコピー" onClick={copy}>
          {copied === 'コピー済み' ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
      <div className="art-actions">
        <button className="status" onClick={save}>
          <Download size={16} />
          SVG を保存
        </button>
        <small role="status">{copied}</small>
      </div>
      {related.length > 0 && (
        <>
          <h3>この絵を使った図解</h3>
          {related.map((f) => (
            <a className="dictionary-row" key={f.id} href={example(f)} onClick={onClose}>
              {f.title}
              <ArrowRight size={16} />
            </a>
          ))}
        </>
      )}
    </Modal>
  );
}

const normalize = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s/_-]+/g, '');
function Gallery({ group, onArt }: { group?: Group; onArt: (name: ArtName) => void }) {
  const [query, setQuery] = useState('');
  const search = normalize(query);
  const results = names.filter((name) => {
    const info = objects[name];
    return (
      (!group || group === info.group) &&
      normalize([name, info.label, info.keywords, groups[info.group]].join(' ')).includes(search)
    );
  });
  return (
    <>
      <div className="art-filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="イラストを検索"
            type="search"
            placeholder="部品名やサービス名で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="art-select">
          <select
            aria-label="分類を選ぶ"
            value={gallery(group)}
            onChange={(e) => (location.hash = e.target.value)}
          >
            <option value="#art">すべての分類</option>
            {categories.map((id) => (
              <option key={id} value={gallery(id)}>
                {groups[id]}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <small role="status">{results.length}点</small>
      </div>
      {results.length === 0 && (
        <p>
          該当するイラストはありません。
          <button
            className="link"
            onClick={() => {
              setQuery('');
              location.hash = gallery();
            }}
          >
            すべてのイラストを見る
          </button>
        </p>
      )}
      {categories.map((id) => {
        const list = results.filter((n) => objects[n].group === id);
        return (
          list.length > 0 && (
            <section key={id} className="art-group" aria-label={groups[id]}>
              <h2>{groups[id]}</h2>
              <div className="art-grid">
                {list.map((name) => (
                  <button key={name} data-art={name} aria-haspopup="dialog" onClick={() => onArt(name)}>
                    <span className="sheet">
                      <Art name={name} />
                    </span>
                    <b>{objects[name].label}</b>
                    <small>{name}</small>
                  </button>
                ))}
              </div>
            </section>
          )
        );
      })}
    </>
  );
}

function Demo({ figure, onArt }: { figure: Figure; onArt: (name: ArtName) => void }) {
  const [selected, select] = useState(0);
  const { steps, title, reason } = figure.variants[selected];
  const next = figures[(figures.indexOf(figure) + 1) % figures.length];
  return (
    <section className="demo">
      <label className="art-select">
        <select
          aria-label="図解例を選ぶ"
          value={example(figure)}
          onChange={(e) => (location.hash = e.target.value)}
        >
          {figures.map((f) => (
            <option key={f.id} value={example(f)}>
              {f.topic.slice(0, 3)}　{f.title}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <small>{figure.topic}</small>
      <h2>{figure.title}</h2>
      <p className="lead">{figure.question}</p>
      <ChoiceGroup
        label="条件を変える"
        choices={figure.variants.map((v) => v.label)}
        value={selected}
        onChange={select}
      />
      <StageStrip steps={steps} label={figure.title} onArt={onArt} />
      <Insight title={title}>{reason}</Insight>
      <a className="link" href={figure.url} target="_blank" rel="noreferrer">
        {figure.source}
        <ExternalLink size={15} />
      </a>
      <footer>
        <a href="#art">
          <ArrowLeft size={16} />
          イラスト一覧
        </a>
        <a href={example(next)}>
          次の図解へ
          <ArrowRight size={16} />
        </a>
      </footer>
    </section>
  );
}

export function Library({ hash, back, brand }: { hash: string; back: string; brand: ReactNode }) {
  const [nav, setNav] = useState(false);
  const [name, show] = useState<ArtName | null>(null);
  const [page, id] = hash.slice(1).split('/');
  const group = categories.find((g) => g === id);
  const figure = page === 'figures' ? (figures.find((f) => f.id === id) ?? figures[0]) : null;
  const heading = figure ? '図解例' : 'イラスト';
  useEffect(() => {
    setNav(false);
    show(null);
  }, [hash]);
  const navLink = (url: string, label: string, selected: boolean) => (
    <a key={url} href={url} aria-current={selected ? 'page' : undefined} onClick={() => setNav(false)}>
      {label}
    </a>
  );
  const menu = figure ? (
    ['PCA', 'PAA'].map((track) => (
      <nav key={track} className="units" aria-label={track + 'の図解例'}>
        <h2>{track}</h2>
        {figures
          .filter((f) => f.topic.startsWith(track))
          .map((f) => navLink(example(f), f.title, f === figure))}
      </nav>
    ))
  ) : (
    <nav className="units" aria-label="イラストの分類">
      <h2>分類</h2>
      {navLink('#art', 'すべて', !group)}
      {categories.map((g) => navLink(gallery(g), groups[g], g === group))}
    </nav>
  );
  return (
    <div className="study-light library">
      <div className="layout">
        <aside>
          {brand}
          {menu}
        </aside>
        <main>
          <header className="top">
            <button className="bare mobile" aria-label="目次を開く" onClick={() => setNav(true)}>
              <Menu size={22} />
            </button>
            <a className="link" href={back}>
              <ArrowLeft size={16} />
              教材へ戻る
            </a>
            <b>PCA・PAA</b>
          </header>
          <div className="page">
            <h1>図解ライブラリ</h1>
            <nav className="tabs" aria-label="部品と使い方">
              {navLinkWithIcon(gallery(), 'イラスト', names.length, <Shapes size={18} />, !figure)}
              {navLinkWithIcon(
                example(figure ?? figures[0]),
                '図解例',
                figures.length,
                <Workflow size={18} />,
                !!figure,
              )}
            </nav>
            {figure ? (
              <Demo key={figure.id} figure={figure} onArt={show} />
            ) : (
              <Gallery key={group ?? 'all'} group={group} onArt={show} />
            )}
          </div>
        </main>
      </div>
      {nav && (
        <Modal title={heading} onClose={() => setNav(false)}>
          {menu}
        </Modal>
      )}
      {name && <Preview name={name} onClose={() => show(null)} />}
    </div>
  );
}
function navLinkWithIcon(url: string, label: string, count: number, icon: ReactNode, active: boolean) {
  return (
    <a href={url} aria-current={active ? 'page' : undefined}>
      {icon}
      {label}
      <small>{count}</small>
    </a>
  );
}
