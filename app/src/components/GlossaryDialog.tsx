import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BookMarked, Lightbulb, Search, ShieldCheck, X } from 'lucide-react';
import {
  GLOSSARY_CATEGORY_LABELS,
  GLOSSARY_TERMS,
  getGlossaryTermById,
  getGlossaryTermsForLesson,
} from '../data/glossary';
import type { GlossaryCategoryId, LessonId } from '../types';
import { RichText } from './RichText';

type FilterScope = 'lesson' | 'all' | GlossaryCategoryId;

interface GlossaryDialogProps {
  open: boolean;
  activeLessonId: LessonId;
  activeLessonLabel: string;
  initialTermId: string | null;
  onClose: () => void;
}

const CATEGORY_FILTERS: { id: GlossaryCategoryId; label: string }[] = [
  { id: 'basics', label: '共通基礎' },
  { id: 'w01-p1', label: 'Part 1' },
  { id: 'w01-p2', label: 'Part 2' },
  { id: 'w01-p3', label: 'Part 3' },
  { id: 'w01-p4', label: 'Part 4' },
  { id: 'overview', label: '全体像' },
];

export function GlossaryDialog({
  open,
  activeLessonId,
  activeLessonLabel,
  initialTermId,
  onClose,
}: GlossaryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const firstCardRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const titleId = useId();
  const searchId = useId();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<FilterScope>('lesson');
  const [focusedTermId, setFocusedTermId] = useState<string | null>(null);

  // Sync open state with native <dialog>.showModal() / .close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setQuery('');
      if (initialTermId) {
        setScope('all');
        setFocusedTermId(initialTermId);
      } else {
        setScope('lesson');
        setFocusedTermId(null);
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, initialTermId, activeLessonId]);

  // Scroll the requested term into view when opened directly on a specific term
  useEffect(() => {
    if (!open || !focusedTermId) return;
    const raf = window.requestAnimationFrame(() => {
      const target = cardRefs.current[focusedTermId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, focusedTermId, scope]);

  // Safari fallback for <dialog closedby="any"> using pointerdown + pointerup outside bounds
  // so text-selection drags ending on the backdrop do not accidentally dismiss the dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const lessonTerms = useMemo(
    () => getGlossaryTermsForLesson(activeLessonId),
    [activeLessonId],
  );

  const visibleTerms = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      return GLOSSARY_TERMS.filter((item) => {
        const haystack = [
          item.term,
          item.subtitle ?? '',
          ...(item.aliases ?? []),
          item.summary,
          item.analogy,
          item.examPoint,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(trimmed);
      });
    }

    if (scope === 'lesson') {
      return lessonTerms;
    }
    if (scope === 'all') {
      return GLOSSARY_TERMS;
    }
    return GLOSSARY_TERMS.filter((item) => item.category === scope);
  }, [query, scope, lessonTerms]);

  const handleJumpRelated = (termId: string) => {
    setQuery('');
    setScope('all');
    setFocusedTermId(termId);
  };

  // IME-safe Enter handling for the search bar (prevents Japanese conversion Enter from jumping focus)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        return;
      }
      firstCardRef.current?.focus();
    }
  };

  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="glossary-dialog"
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      onClose={handleDialogClose}
    >
      <div className="glossary-surface">
        <header className="glossary-header">
          <div className="glossary-header-top">
            <div className="glossary-title-row">
              <span className="glossary-title-icon" aria-hidden="true">
                <BookMarked size={18} />
              </span>
              <div>
                <h2 id={titleId} className="glossary-title">
                  Google Cloud 学習 用語集
                </h2>
                <p className="glossary-subtitle">
                  専門用語を「一言・イメージ・試験ポイント」でいつでも引けます（全 {GLOSSARY_TERMS.length} 語）
                </p>
              </div>
            </div>

            <button
              type="button"
              className="console-lightbox-close-btn"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={16} aria-hidden="true" />
              閉じる
            </button>
          </div>

          <div className="glossary-controls">
            <div className="glossary-search-wrap">
              <label htmlFor={searchId} className="visually-hidden">
                用語を検索
              </label>
              <Search size={16} className="glossary-search-icon" aria-hidden="true" />
              <input
                ref={searchInputRef}
                id={searchId}
                type="search"
                className="glossary-search-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedTermId(null);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="用語を検索（例：OIDC、ADC、actAs、クォータ、403…）"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="glossary-search-clear"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="検索語をクリア"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="glossary-filter-strip" role="group" aria-label="表示範囲の絞り込み">
              <button
                type="button"
                className="glossary-filter-pill"
                aria-pressed={!query.trim() && scope === 'lesson'}
                onClick={() => {
                  setQuery('');
                  setScope('lesson');
                  setFocusedTermId(null);
                }}
              >
                この単元（{activeLessonLabel}・{lessonTerms.length}）
              </button>
              <button
                type="button"
                className="glossary-filter-pill"
                aria-pressed={!query.trim() && scope === 'all'}
                onClick={() => {
                  setQuery('');
                  setScope('all');
                  setFocusedTermId(null);
                }}
              >
                すべて（{GLOSSARY_TERMS.length}）
              </button>
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="glossary-filter-pill"
                  aria-pressed={!query.trim() && scope === cat.id}
                  onClick={() => {
                    setQuery('');
                    setScope(cat.id);
                    setFocusedTermId(null);
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="glossary-body">
          <div className="glossary-result-meta" role="status" aria-live="polite">
            {query.trim() ? (
              <span>
                「{query.trim()}」の検索結果：<strong>{visibleTerms.length} 件</strong>（全 {GLOSSARY_TERMS.length} 語から横断検索）
              </span>
            ) : (
              <span>
                {visibleTerms.length} 語を表示中
              </span>
            )}
          </div>

          {visibleTerms.length === 0 ? (
            <div className="glossary-empty">
              <p>一致する用語が見つかりませんでした。</p>
              <button
                type="button"
                className="glossary-reset-btn"
                onClick={() => {
                  setQuery('');
                  setScope('all');
                }}
              >
                すべての用語を表示する
              </button>
            </div>
          ) : (
            <ul className="glossary-grid" role="list">
              {visibleTerms.map((item, idx) => {
                const isHighlighted = focusedTermId === item.id;
                const relatedTerms = (item.relatedIds ?? [])
                  .map((id) => getGlossaryTermById(id))
                  .filter((t): t is NonNullable<typeof t> => Boolean(t));

                return (
                  <li
                    key={item.id}
                    ref={(el) => {
                      cardRefs.current[item.id] = el;
                      if (idx === 0) firstCardRef.current = el;
                    }}
                    tabIndex={-1}
                    className={`glossary-card ${isHighlighted ? 'is-highlighted' : ''}`}
                  >
                    <div className="glossary-card-head">
                      <div>
                        <h3 className="glossary-term-title">{item.term}</h3>
                        {item.subtitle && (
                          <p className="glossary-term-sub">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="glossary-cat-badge">
                        {GLOSSARY_CATEGORY_LABELS[item.category]}
                      </span>
                    </div>

                    <p className="glossary-term-summary">
                      <RichText text={item.summary} />
                    </p>

                    <div className="glossary-term-detail-row">
                      <span className="glossary-detail-label">
                        <Lightbulb size={13} aria-hidden="true" />
                        イメージ
                      </span>
                      <p className="glossary-detail-text">
                        <RichText text={item.analogy} />
                      </p>
                    </div>

                    <div className="glossary-term-detail-row">
                      <span className="glossary-detail-label is-point">
                        <ShieldCheck size={13} aria-hidden="true" />
                        試験・実務
                      </span>
                      <p className="glossary-detail-text">
                        <RichText text={item.examPoint} />
                      </p>
                    </div>

                    {relatedTerms.length > 0 && (
                      <div className="glossary-related-row">
                        <span className="glossary-related-label">関連：</span>
                        {relatedTerms.map((rel) => (
                          <button
                            key={rel.id}
                            type="button"
                            className="glossary-related-chip"
                            onClick={() => handleJumpRelated(rel.id)}
                          >
                            {rel.term}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
