import { BookMarked, Boxes, Menu, PanelLeftClose, PanelLeftOpen, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  solvedCount: number;
  totalCount: number;
  focusCanvas: boolean;
  onToggleFocusCanvas: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenGlossary: () => void;
}

export function Header({
  solvedCount,
  totalCount,
  focusCanvas,
  onToggleFocusCanvas,
  mobileMenuOpen,
  onToggleMobileMenu,
  onOpenGlossary,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <button
          type="button"
          className="icon-btn mobile-only"
          onClick={onToggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label="カリキュラム目次を開く"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div className="brand-mark" aria-hidden="true">
          <Boxes size={18} strokeWidth={2.2} />
        </div>

        <div>
          <span className="brand-title desktop-brand-title">GCP Architecture Explorer</span>
          <span className="brand-title mobile-brand-title">GCP Explorer</span>
          <span className="brand-sub">PCA → PAA ビジュアル学習ガイド</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn glossary-header-btn"
          onClick={onOpenGlossary}
          aria-label="Google Cloud 用語集を開く"
        >
          <BookMarked size={15} aria-hidden="true" />
          <span>用語集</span>
        </button>

        <span className="progress-pill" aria-label={`章頭例題 ${totalCount}問中 ${solvedCount}問正解`}>
          <CheckCircle2 size={14} aria-hidden="true" />
          例題 {solvedCount}/{totalCount}
        </span>

        <button
          type="button"
          className="icon-btn desktop-only"
          aria-pressed={focusCanvas}
          onClick={onToggleFocusCanvas}
          aria-label="目次サイドバーの表示切り替え"
        >
          {focusCanvas ? (
            <>
              <PanelLeftOpen size={16} aria-hidden="true" />
              目次を表示
            </>
          ) : (
            <>
              <PanelLeftClose size={16} aria-hidden="true" />
              図を広く見る
            </>
          )}
        </button>
      </div>
    </header>
  );
}
