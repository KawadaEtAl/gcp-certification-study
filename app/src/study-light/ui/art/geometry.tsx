import React from 'react';
const ink = '#192925',
  side = '#cad9d1',
  mint = '#87e3ab',
  green = '#4fc98c',
  paper = '#fbfffa';
const P = (x: number, y: number, z: number) => [0.95 * (x - y), 0.425 * (x + y) - z];
type Point = { x?: number; y?: number; z?: number };
type Size = { w: number; d: number };
function Surface({
  x = 0,
  y = 0,
  z = 0,
  face = 'top',
  children,
}: Point & { face?: 'top' | 'left' | 'right'; children: React.ReactNode }) {
  const a = { top: '.95 .425 -.95 .425', left: '.95 .425 0 1', right: '.95 -.425 0 1' }[face];
  return <g transform={`matrix(${a} ${P(x, y, z).join(' ')})`}>{children}</g>;
}
function Box({
  x = 0,
  y = 0,
  z = 0,
  w,
  d,
  h,
  front = paper,
  right = side,
  top = 'white',
}: Point & Size & { h: number; front?: string; right?: string; top?: string }) {
  const face = (axes: number[][], fill: string) => (
    <polygon
      fill={fill}
      points={axes.map(([i, j, k]) => P(x + w * i, y + d * j, z + h * k).join(',')).join(' ')}
    />
  );
  return (
    <>
      {face(
        [
          [0, 1, 0],
          [1, 1, 0],
          [1, 1, 1],
          [0, 1, 1],
        ],
        front,
      )}
      {face(
        [
          [1, 1, 0],
          [1, 0, 0],
          [1, 0, 1],
          [1, 1, 1],
        ],
        right,
      )}
      {face(
        [
          [0, 0, 1],
          [0, 1, 1],
          [1, 1, 1],
          [1, 0, 1],
        ],
        top,
      )}
    </>
  );
}
const series = (n: number, render: (i: number) => React.ReactNode) =>
  Array.from({ length: n }, (_, i) => <React.Fragment key={i}>{render(i)}</React.Fragment>);
const Shadow = ({ w, d }: Size) => (
  <Surface x={1} y={6} z={-2}>
    <rect width={w + 5} height={d + 5} rx="7" fill="#d5e6db" stroke="none" />
  </Surface>
);
export { ink, side, mint, green, paper, P, Box, Surface, Shadow, series };

type Children = { children?: React.ReactNode };
export function Ground({ children }: Children) {
  return (
    <g transform="translate(120 87)">
      <Shadow w={105} d={105} />
      <Box w={105} d={105} h={10} />
      <g transform="translate(0 -10)">{children}</g>
    </g>
  );
}
export function Panel({
  children,
  dark = false,
  flip = false,
}: Children & { dark?: boolean; flip?: boolean }) {
  return (
    <g transform={flip ? 'matrix(1 -.4 0 1 53 76)' : 'matrix(1 .4 0 1 43 18)'}>
      <rect x="-8" y="96" width="162" height="13" rx="7" fill="#d5e6db" stroke="none" />
      <rect x={flip ? -9 : 9} y="-7" width="144" height="96" rx="8" fill={side} />
      <rect width="144" height="96" rx="8" fill={dark ? ink : 'white'} />
      {children}
    </g>
  );
}
export function Dots({ x = 12, y = 12, fill = ink }) {
  return (
    <g stroke="none" fill={fill}>
      {series(3, (i) => (
        <circle cx={x + i * 9} cy={y} r={2.4} />
      ))}
    </g>
  );
}
export function Lines({
  x,
  y,
  w = 40,
  step = 10,
  stroke = ink,
}: {
  x: number;
  y: number;
  w?: number;
  step?: number;
  stroke?: string;
}) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d={`M0 0h${w}M0 ${step}h${w * 0.68}M0 ${2 * step}h${w * 0.86}`}
      strokeWidth="3"
      stroke={stroke}
      fill="none"
    />
  );
}
export function FileFace({ children, fill = 'white' }: Children & { fill?: string }) {
  return (
    <>
      <path d="M0 0H60L82 22V108H0Z" fill={fill} />
      <path d="M60 0V22H82" fill={side} />
      {children}
    </>
  );
}
export function Disc({ r = 65, h = 32, fill = paper, lid = 'white', rim = side }) {
  const a = r * 0.38;
  return (
    <>
      <path d={`M${-r} 0v${h}a${r} ${a} 0 0 0 ${2 * r} 0V0Z`} fill={fill} />
      <path d={`M${r} 0v${h}a${r} ${a} 0 0 1 ${-r * 0.5} ${a * 0.866}V0`} stroke="none" fill={rim} />
      <ellipse rx={r} ry={a} fill={lid} />
    </>
  );
}
export function BaseShadow({ x = 120, y = 153, rx = 86, ry = 26 }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#d5e6db" stroke="none" />;
}
export function Rack({
  x = 0,
  y = 0,
  z = 0,
  w = 47,
  d = 42,
  h = 56,
  top = 'white',
}: Point & Partial<Size> & { h?: number; top?: string }) {
  return (
    <>
      <Box {...{ x, y, z, w, d, h, top }} />
      <Surface x={x} y={y + d} z={z + h} face="left">
        <rect x="5" y="5" width={w - 10} height={h - 10} rx="2" fill={ink} />
        {series(3, (i) => (
          <path
            d={`M10 ${10 + (i * (h - 14)) / 3}h${w - 20}`}
            stroke={i === 0 ? mint : side}
            strokeWidth="3"
          />
        ))}
      </Surface>
    </>
  );
}
export function Tile({ x, y, w = 30, h = 24, top = mint }: Point & { w?: number; h?: number; top?: string }) {
  return <Box x={x} y={y} w={w} d={w} h={h} top={top} right={top === mint ? green : side} />;
}
export function CheckMark({ x, y, stroke = ink }: { x: number; y: number; stroke?: string }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M-10 0l7 7 14-16"
      fill="none"
      stroke={stroke}
      strokeWidth="4"
    />
  );
}
export function Wire({ d, fill = mint }: { d: string; fill?: string }) {
  return (
    <g fill="none">
      <path d={d} strokeWidth="9" />
      <path d={d} stroke={fill} strokeWidth="5" />
    </g>
  );
}
