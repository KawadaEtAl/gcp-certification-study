import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Monitor,
  X,
} from 'lucide-react';
import type { ConsoleScreenRef } from '../types';
import { RichText } from './RichText';

interface ConsoleScreenGalleryProps {
  screens?: ConsoleScreenRef[];
}

export function ConsoleScreenGallery({ screens }: ConsoleScreenGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  const items = screens ?? [];
  const activeScreen = activeIndex !== null ? items[activeIndex] ?? null : null;

  // Open/close native modal dialog via showModal() so top-layer, focus trap, and Esc work natively.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeScreen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [activeScreen]);

  // Fallback for browsers without <dialog closedby="any"> support (e.g., Safari).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, []);

  if (items.length === 0) return null;

  const hasCapturedImage = (screen: ConsoleScreenRef) =>
    Boolean(screen.imagePath) && !failedImages[screen.id];

  const handleClose = () => {
    setActiveIndex(null);
  };

  const handleStep = (delta: number) => {
    if (activeIndex === null || items.length < 2) return;
    setActiveIndex((activeIndex + delta + items.length) % items.length);
  };

  return (
    <section className="console-screens-section" aria-label="GCP Console の該当画面">
      <div className="console-screens-head">
        <div>
          <p className="panel-kicker">GCP Console の該当画面</p>
          <h3 className="console-screens-heading">実画面だと「このページ」</h3>
        </div>
      </div>

      <div className="console-screens-list">
        {items.map((screen, index) => {
          const showImage = hasCapturedImage(screen);
          const imgWidth = screen.width ?? 1280;
          const imgHeight = screen.height ?? 800;

          return (
            <article key={screen.id} className="console-screen-card">
              <div className="console-screen-meta">
                <span className="console-breadcrumb">{screen.menuPath}</span>
                <h4 className="console-screen-title">{screen.title}</h4>
              </div>

              {showImage ? (
                <button
                  type="button"
                  className="console-shot-trigger"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`${screen.title} のスクリーンショットを拡大表示`}
                >
                  <img
                    src={screen.imagePath}
                    alt={`${screen.title}（${screen.menuPath}）の Google Cloud Console 画面`}
                    width={imgWidth}
                    height={imgHeight}
                    loading="lazy"
                    fetchPriority="low"
                    className="console-shot-img"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [screen.id]: true }))
                    }
                  />
                  <span className="console-shot-zoom-pill" aria-hidden="true">
                    <Maximize2 size={13} />
                    拡大して見る
                  </span>
                </button>
              ) : (
                <div className="console-shot-placeholder">
                  <div className="console-shot-placeholder-top">
                    <Monitor size={18} aria-hidden="true" />
                    <span>実画面スクショ待機中</span>
                  </div>
                  <p className="console-shot-placeholder-desc">
                    <code className="inline-code">/browser</code> で個人情報マスク済みの{' '}
                    <code className="inline-code">1280×800</code> 画面を撮影してここに反映します。
                  </p>
                  <p className="console-shot-placeholder-file mono">{screen.expectedFile}</p>
                </div>
              )}

              <p className="console-screen-caption">
                <RichText text={screen.caption} />
              </p>

              <ul className="console-lookfor-list" role="list">
                {screen.lookFor.map((point, idx) => (
                  <li key={point.label} className="console-lookfor-item">
                    <span className="console-lookfor-num" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <div>
                      <strong>{point.label}</strong>
                      <span>
                        <RichText text={point.detail} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="console-screen-actions">
                <a
                  href={screen.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="console-action-link"
                >
                  Console で開く
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
                {showImage && (
                  <button
                    type="button"
                    className="console-action-btn"
                    onClick={() => setActiveIndex(index)}
                  >
                    <Maximize2 size={12} aria-hidden="true" />
                    拡大表示
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        className="console-lightbox"
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby={titleId}
        onClose={handleClose}
      >
        {activeScreen && (
          <div className="console-lightbox-surface">
            <header className="console-lightbox-header">
              <div className="console-lightbox-title-wrap">
                <span className="console-breadcrumb">{activeScreen.menuPath}</span>
                <h2 id={titleId} className="console-lightbox-title">
                  {activeScreen.title}
                </h2>
              </div>

              <div className="console-lightbox-controls">
                {items.length > 1 && (
                  <div className="console-lightbox-nav" aria-label="スクリーンショット切替">
                    <button
                      type="button"
                      className="console-lightbox-icon-btn"
                      onClick={() => handleStep(-1)}
                      aria-label="前の画面を表示"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <span className="console-lightbox-counter mono">
                      {(activeIndex ?? 0) + 1}/{items.length}
                    </span>
                    <button
                      type="button"
                      className="console-lightbox-icon-btn"
                      onClick={() => handleStep(1)}
                      aria-label="次の画面を表示"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="console-lightbox-close-btn"
                  onClick={() => dialogRef.current?.close()}
                >
                  <X size={16} aria-hidden="true" />
                  閉じる
                </button>
              </div>
            </header>

            <div className="console-lightbox-body">
              {hasCapturedImage(activeScreen) && (
                <figure className="console-lightbox-figure">
                  <img
                    src={activeScreen.imagePath}
                    alt={`${activeScreen.title}（${activeScreen.menuPath}）の Google Cloud Console 画面`}
                    width={activeScreen.width ?? 1280}
                    height={activeScreen.height ?? 800}
                    className="console-lightbox-img"
                  />
                  <figcaption className="console-lightbox-caption">
                    <RichText text={activeScreen.caption} />
                  </figcaption>
                </figure>
              )}

              <div className="console-lightbox-notes">
                <p className="panel-kicker">この画面で見るポイント</p>
                <ul className="console-lookfor-list" role="list">
                  {activeScreen.lookFor.map((point, idx) => (
                    <li key={point.label} className="console-lookfor-item">
                      <span className="console-lookfor-num" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <div>
                        <strong>{point.label}</strong>
                        <span>
                          <RichText text={point.detail} />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="console-lightbox-footer">
                  <a
                    href={activeScreen.consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-link-pill"
                  >
                    Google Cloud Console で開く
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                  <span className="console-mask-note">
                    ※プロジェクト名・メールアドレス等は学習用のダミー値へ置換済
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
