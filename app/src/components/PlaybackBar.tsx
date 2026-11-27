import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

interface PlaybackBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  speed?: number;
  onChangeSpeed?: (speed: number) => void;
  onPrev?: () => void;
  prevDisabled?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  playLabel?: string;
  pauseLabel?: string;
  /* Optional integrated time slider */
  sliderValue?: number;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderLabel?: string;
  sliderAriaLabel?: string;
  onSliderChange?: (val: number) => void;
  quickActionLabel?: string;
  onQuickAction?: () => void;
}

export function PlaybackBar({
  isPlaying,
  onTogglePlay,
  onReset,
  speed,
  onChangeSpeed,
  onPrev,
  prevDisabled,
  onNext,
  nextLabel = 'ステップ',
  playLabel = '再生',
  pauseLabel = '一時停止',
  sliderValue,
  sliderMin = 0,
  sliderMax = 100,
  sliderStep = 1,
  sliderLabel,
  sliderAriaLabel,
  onSliderChange,
  quickActionLabel,
  onQuickAction,
}: PlaybackBarProps) {
  const hasSlider = typeof sliderValue === 'number' && typeof onSliderChange === 'function';

  return (
    <>
      {/* Unified inline bar directly underneath the diagram */}
      <div className="unified-playback-bar" role="group" aria-label="シミュレーション操作">
        <div className="playback-primary-group">
          <button type="button" className="btn-play" onClick={onTogglePlay}>
            {isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            {isPlaying ? pauseLabel : playLabel}
          </button>

          {onPrev && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onPrev}
              disabled={prevDisabled}
              aria-label="前のステップ"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}

          {onNext && (
            <button type="button" className="btn-secondary" onClick={onNext}>
              {nextLabel}
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        {hasSlider && (
          <div className="playback-slider-group">
            {sliderLabel && <span className="mono slider-time-label">{sliderLabel}</span>}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={sliderValue}
              aria-label={sliderAriaLabel ?? '経過時間'}
              onChange={(e) => onSliderChange(Number(e.target.value))}
            />
            {quickActionLabel && onQuickAction && (
              <button type="button" className="btn-ghost-pill" onClick={onQuickAction}>
                {quickActionLabel}
              </button>
            )}
          </div>
        )}

        <div className="playback-secondary-group">
          {typeof speed === 'number' && onChangeSpeed && (
            <select
              className="speed-select"
              aria-label="再生速度"
              value={speed}
              onChange={(e) => onChangeSpeed(Number(e.target.value))}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          )}

          <button type="button" className="btn-secondary" onClick={onReset} aria-label="リセット">
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Unified sticky mobile dock across ALL parts */}
      <div className="mobile-dock" role="group" aria-label="モバイル再生バー">
        {typeof speed === 'number' && onChangeSpeed && (
          <select
            className="speed-select"
            aria-label="再生速度"
            value={speed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        )}

        {onPrev && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label="前へ"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        )}

        <button type="button" className="btn-play" onClick={onTogglePlay}>
          {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {isPlaying ? pauseLabel : playLabel}
        </button>

        {onNext && (
          <button type="button" className="btn-secondary" onClick={onNext}>
            {nextLabel}
          </button>
        )}

        <button type="button" className="btn-secondary" onClick={onReset} aria-label="リセット">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
