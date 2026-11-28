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
function Laptop({ portal = false }) {
  return (
    <g transform="translate(139 91)">
      <Shadow w={84} d={123} />
      <Box w={84} d={123} h={6} right={paper} front={side} />
      <Surface z={6}>
        {series(5, (i) =>
          series(12, (j) => (
            <rect
              x={12 + i * 8.1}
              y={9 + j * 8.9}
              width={5.85}
              height={6.5}
              stroke="none"
              rx=".9"
              fill="#3c4b45"
            />
          )),
        )}
        <rect x="44.4" y="35.7" width="5.85" height="51" fill="#3c4b45" stroke="none" />
        <rect x="56" y="43" width="22" height="39" rx="3" strokeWidth="1.4" fill="#e9f0ea" />
      </Surface>
      <Box z={6} w={5} d={123} h={77} right={ink} front="#9caca3" />
      <Surface face="right" x={5} y={123} z={83}>
        <rect
          x="4"
          y="5"
          width="115"
          height="65"
          rx="2"
          stroke="none"
          fill={portal ? '#f4faf7' : '#2f403d'}
        />
        <rect x="4" y="5" width="115" height="9" fill={portal ? mint : '#5b6e65'} stroke="none" />
        {series(3, (i) => (
          <circle cx={10 + 6 * i} cy="9.5" r="1.5" stroke="none" fill="white" />
        ))}
        {portal ? (
          <g>
            <rect x="10" y="20" width="23" height="43" stroke="none" fill={side} />
            <rect x="40" y="21" width="71" height="17" stroke="none" fill={ink} />
            <path d="M42 47h58 m-58 5h48 m-48 5h54" stroke="#657c70" />
          </g>
        ) : (
          <>
            <path
              d="M47 28l-14 11 14 11M75 28l14 11-14 11M66 24L56 54"
              stroke={mint}
              strokeWidth="4.5"
              fill="none"
            />
            <path d="M11 62h19m4 0h9" stroke="#89998e" strokeWidth="2.5" />
          </>
        )}
      </Surface>
      <Surface face="left" y={123} z={5}>
        <path d="M12 2h8M25 2h8" />
      </Surface>
      <Surface face="right" x={84} y={123} z={6}>
        <path d="M49 0l3 2h20l3-2" />
      </Surface>
    </g>
  );
}
function Server({ identity = false }) {
  const cloud = 'M14 51Q0 51 0 36Q0 23 15 21C19 -5 53 -4 60 17Q71 12 78 27Q90 28 90 40Q90 51 79 51Z';
  return (
    <g transform="translate(107 104)">
      <Shadow w={97} d={78} />
      {series(2, (i) => (
        <g transform={`translate(0 ${i * -32})`}>
          <Box x={5} y={5} w={87} d={68} h={8} front={ink} right={ink} />
          <Box z={6} w={97} d={78} h={26} right="#cbd9d0" />
          <Surface face="left" y={78} z={32}>
            <rect x="7" y="6" width="51" height="14" rx="2" fill={ink} />
            {series(5, (j) => (
              <path d={`M${15 + 8 * j} 9v8`} stroke="#879d92" />
            ))}
            <circle cx="76" cy="13" r="3.2" fill={mint} />
            <circle cx="87" cy="13" r="3.2" fill={mint} />
          </Surface>
          <Surface face="right" x={97} y={78} z={32}>
            {series(8, (j) => (
              <path d={`M${38 + 4 * j} 7v12`} stroke="#63736a" strokeWidth="1.35" />
            ))}
          </Surface>
        </g>
      ))}
      <Surface z={64}>
        <rect x="4" y="31" width="88" height="21" rx="8" stroke="none" fill="#c6d9cc" />
      </Surface>
      <Surface face="left" x={4} y={49} z={124}>
        <path d={cloud} transform="translate(11 -10)" fill={green} />
        <path d="M9 23L19 13M25 9L37 -2 M86 49L98 38L90 39" fill={green} />
        <path d={cloud} fill={mint} />
        <path d="M34 20L49 30 34 40Z" fill={ink} />
        <path d="M48 21l13 9-13 9" fill="none" strokeWidth="4" />
      </Surface>
      {identity && (
        <Surface face="right" x={113} y={63} z={58}>
          <rect width="54" height="39" rx="4" fill={paper} />
          <circle cx="15" cy="14" r="5" fill={ink} />
          <path d="M7 30q0-17 16 0Z" fill={ink} />
          <path d="M29 15h17m-17 6h14m-14 6h10" />
        </Surface>
      )}
    </g>
  );
}
function Storage() {
  return (
    <g transform="translate(119 44)">
      <ellipse cy="112" rx="77" ry="30" fill="#d5e6db" stroke="none" />
      <ellipse cy="23" rx="76" ry="29" fill={ink} />
      <g transform="matrix(.9 .4 0 1 -40 -36)">
        <rect x="9" y="-5" width="88" height="63" fill={green} rx="2" />
        <path d="M0 1H70L87 17V74H0Z" fill="white" />
        <path d="M70 1v16h17M12 18h25m-25 11h58m-58 8h50m-50 8h58" fill="none" />
      </g>
      <path d="M-74 28L-60 103C-56 139 56 139 60 103L74 28C61 62-61 62-74 28Z" fill="#fff" />
      <path stroke="none" d="M74 29L59 104Q51 122 24 126L31 47Z" fill={side} />
      <path d="M-76 23c0 39 152 39 152 0v13c0 39-152 39-152 0Z" fill={mint} />
      <rect x="-22" y="78" width="44" height="26" rx="4" fill={ink} />
      <path d="M-13 87h17m-17 8h17" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="87" r="2" fill={mint} stroke="none" />
    </g>
  );
}
function Crate() {
  return (
    <g transform="translate(120 92)">
      <Shadow w={96} d={96} />
      <Box w={96} d={96} h={80} right="#cbd9d0" />
      <Surface z={80}>
        <rect x={37} width={22} height={96} fill={mint} />
      </Surface>
      <Surface face="left" y={96} z={80}>
        <rect x="37" width="22" height="31" fill={mint} />
        <rect x="9" y="43" width="46" height="24" rx="3" fill="white" />
        <path d="M15 50h29m-29 5h20m-20 5h26" />
      </Surface>
      <Surface face="right" x={96} y={96} z={80}>
        <rect x="28" y="19" width="42" height="42" rx="6" fill={ink} />
        <path d="M41 31l-7 8 7 8m14-16 7 8-7 8m-4-19-6 22" stroke={mint} strokeWidth="3" fill="none" />
      </Surface>
    </g>
  );
}
export type ArtName = 'laptop' | 'portal' | 'server' | 'identity' | 'bucket' | 'image' | 'job' | 'badge';
const objects: Record<ArtName, React.ReactNode> = {
  laptop: <Laptop />,
  portal: <Laptop portal />,
  bucket: <Storage />,
  server: <Server />,
  identity: <Server identity />,
  image: <Crate />,
  badge: (
    <g transform="translate(57 34) skewY(20)">
      <rect x="-4" y="94" width="143" height="16" rx="7" fill="#d5e6db" stroke="none" />
      <rect x="8" y="-8" width="126" height="88" rx="8" fill={green} />
      <rect width="126" height="88" rx="8" fill="white" />
      <path d="M8 0H118Q126 0 126 8V19H0V8Q0 0 8 0Z" fill={mint} />
      <rect x="52" y="-14" width="22" height="23" rx="4" fill={ink} />
      <path d="M57 1H69" stroke={mint} />
      <rect x="11" y="31" width="38" height="43" rx="3" fill={side} />
      <circle cx="30" cy="45" r="7" fill={ink} />
      <path d="M18 67q0-23 24 0Z" fill={ink} />
      <path d="M62 38h45m-45 11h35m-35 11h44m-44 8h20" strokeWidth={3} />
    </g>
  ),
  job: (
    <>
      <Server />
      <circle cx={182} cy={137} r={35} fill={paper} />
      <circle cx={182} cy={137} r={28} fill={mint} />
      <path d="M182 119v18l14 7" fill="none" strokeWidth={3} />
    </>
  ),
};
export const Art = React.memo(function Art({ name }: { name: ArtName }) {
  return (
    <svg
      viewBox="0 0 240 196"
      aria-hidden="true"
      className="illustration"
      stroke={ink}
      strokeWidth="1.85"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {objects[name]}
    </svg>
  );
});
