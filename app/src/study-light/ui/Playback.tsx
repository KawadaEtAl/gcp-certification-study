import { type CSSProperties, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, ChevronDown } from 'lucide-react';
const format = (n: number) => Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0');

export function usePlayback(end: number, span: number, blocked: boolean) {
  const [position, pos] = useState(0),
    [playing, play] = useState(false),
    [speed, rate] = useState(1);
  const i = Math.max(0, Math.min(Math.ceil(end / span) - 1, Math.floor(position / span)));
  function seek(t: number) {
    play(false);
    pos(Math.max(0, Math.min(t, end)));
  }
  useEffect(() => {
    if (blocked) play(false);
  }, [blocked]);
  useEffect(() => {
    function pause() {
      if (document.hidden || document.querySelector('dialog[open]')) play(false);
    }
    document.addEventListener('focusin', pause);
    document.addEventListener('visibilitychange', pause);
    return () => {
      document.removeEventListener('focusin', pause);
      document.removeEventListener('visibilitychange', pause);
    };
  }, []);
  useEffect(() => {
    if (!playing || blocked) return;
    const start = performance.now();
    let id: number;
    function tick(t: number) {
      const next = Math.max(0, Math.min(end, position + ((t - start) / 1000) * speed));
      pos(next);
      if (next >= end) play(false);
      else id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // position is sampled once at play/resume or speed change. Seeking pauses playback.
  }, [playing, blocked, end, speed]);
  return {
    i,
    end,
    span,
    position,
    speed,
    playing,
    seek,
    rate,
    reset: (t: number) => {
      play(false);
      pos(t);
    },
    toggle: () => {
      if (position >= end) pos(0);
      play(!playing);
    },
  };
}

export function Playback({ player, label }: { player: ReturnType<typeof usePlayback>; label: string }) {
  const { i, end, span, position, speed, playing, seek, rate, toggle } = player;
  return (
    <div className="player" role="group" aria-label="図解の再生">
      <button
        className="disc"
        aria-label={playing ? '一時停止' : position >= end ? '最初から再生' : '再生'}
        onClick={toggle}
      >
        {playing ? (
          <Pause size={18} fill="currentColor" />
        ) : position >= end ? (
          <RotateCcw size={19} />
        ) : (
          <Play size={17} style={{ marginLeft: 2 }} fill="currentColor" />
        )}
      </button>
      <button
        className="skip bare"
        aria-label="前のステップ"
        disabled={position === 0}
        onClick={() => seek(Math.max(0, i - 1) * span)}
      >
        <SkipBack size={17} fill="currentColor" />
      </button>
      <button
        className="skip bare"
        aria-label="次のステップ"
        disabled={(i + 1) * span >= end}
        onClick={() => seek((i + 1) * span)}
      >
        <SkipForward size={17} fill="currentColor" />
      </button>
      <span className="clock current">{format(position)}</span>
      <input
        style={{ '--value': (position / end) * 100 + '%' } as CSSProperties}
        type="range"
        min="0"
        max={end}
        step=".01"
        value={position}
        onChange={(e) => seek(+e.target.value)}
        onKeyDown={(e) => {
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            seek(Math.max(0, position + (['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : -1)));
          }
        }}
        aria-label="再生位置"
        aria-valuetext={format(position) + ' ' + label}
      />
      <span className="clock">{format(end)}</span>
      <label className="speed">
        <select value={speed} aria-label="再生速度" onChange={(e) => rate(+e.target.value)}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((n) => (
            <option key={n} value={n}>
              {n}×
            </option>
          ))}
        </select>
        <ChevronDown size={13} />
      </label>
    </div>
  );
}
