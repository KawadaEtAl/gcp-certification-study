import {
  BaseShadow,
  Box,
  Disc,
  Dots,
  FileFace,
  Ground,
  Lines,
  Panel,
  Shadow,
  Surface,
  Tile,
  Wire,
  ink,
  mint,
  green,
  side,
  series,
} from './geometry';

export function Database() {
  return (
    <g transform="translate(120 50)">
      <BaseShadow x={0} y={101} rx={71} />
      {series(3, (i) => (
        <g transform={`translate(0 ${64 - i * 32})`}>
          <Disc h={30} lid={i === 2 ? mint : ink} />
          <circle cx="-42" cy="34" r="4" fill={green} />
          <path d="M-29 38l18 2" strokeWidth="4" />
        </g>
      ))}
    </g>
  );
}
export function Glass() {
  return (
    <g transform="rotate(-38)">
      <rect width="18" x="-9" y="28" height="53" rx="6" fill={ink} />
      <path d="M-7 51H7" stroke={mint} strokeWidth="4" />
      <circle r="42" fill={mint} />
      <circle r="33" fill="white" />
      <path d="M-21 3Q-22-19 0-22" stroke={green} strokeWidth="5" fill="none" />
    </g>
  );
}
function Table() {
  return (
    <Surface z={85}>
      <rect x="3" y="3" width="100" height="74" fill="white" />
      <rect x="3" y="3" width="100" height="16" fill={mint} />
      <path d="M27 3v74M53 3v74M77 3v74M3 38h100M3 58h100" />
    </Surface>
  );
}
export const data = {
  sql: (
    <>
      <Database />
      <g transform="matrix(1 -.42 0 1 138 116)">
        <rect width="75" height="55" rx="3" fill="white" />
        <path d="M0 0h75v14H0Z" fill={ink} />
        <path d="M0 14h20v41H0Z" fill={mint} />
        <path d="M47 14v41M0 33h75" />
      </g>
    </>
  ),
  'distributed-db': (
    <>
      <Wire d="M120 58L54 132H186Z" />
      {[
        [120, 51],
        [56, 129],
        [184, 129],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x - 66} ${y - 52}) scale(.55)`} strokeWidth="3">
          <Database />
        </g>
      ))}
    </>
  ),
  'wide-column': (
    <g transform="translate(86 92)">
      <Shadow w={133} d={62} />
      {series(3, (i) => (
        <g transform={`translate(0 ${-i * 23})`}>
          <Box w={133} d={62} h={16} top={ink} />
          <Surface face="left" y={62} z={16}>
            {series(6, (j) => (
              <rect x={j * 22} width="22" height="16" fill={!j ? green : (i + j) % 3 ? 'white' : mint} />
            ))}
          </Surface>
        </g>
      ))}
      <Surface z={62}>
        {series(6, (j) => (
          <rect x={j * 22} width="22" height="62" fill={!j ? green : j % 3 === 1 ? mint : 'white'} />
        ))}
        <path d="M0 21H132M0 42H132" />
      </Surface>
    </g>
  ),
  'document-db': (
    <>
      <g transform="translate(-10 30) scale(.82)">
        <Database />
      </g>
      <g transform="matrix(.93 -.38 0 .96 127 75)">
        <FileFace>
          <path
            d="M29 31h-5q-6 0-6 7v13q0 9-7 9 7 0 7 9v13q0 7 6 7h5M53 31h5q6 0 6 7v13q0 9 7 9-7 0-7 9v13q0 7-6 7h-5"
            fill="none"
            strokeWidth="4"
          />
          <Dots x={32} y={60} />
        </FileFace>
      </g>
    </>
  ),
  warehouse: (
    <g transform="translate(99 96)">
      <Shadow w={106} d={80} />
      {series(3, (i) => (
        <Box w={106} d={80} h={24} z={i * 26} top={i === 2 ? side : ink} />
      ))}
      <Box x={3} y={3} z={76} w={100} d={74} h={9} />
      <Table />
      <g transform="translate(50 4)">
        <Glass />
        <path d="M-12 13V0M0 13V-7M12 13V-17" strokeWidth="6" />
      </g>
    </g>
  ),
  cache: (
    <>
      <g transform="translate(112 89)">
        <Shadow w={103} d={83} />
        <Box w={103} d={83} h={29} top={mint} />
        <Surface z={29}>
          {series(4, (i) => (
            <rect x={9 + i * 23} y={53} width="16" height="20" fill={ink} />
          ))}
        </Surface>
        <Surface y={83} z={29} face="left">
          {series(8, (i) => (
            <path d={`M${12 + i * 11} 7v13`} strokeWidth="4" />
          ))}
        </Surface>
      </g>
      <path d="M128 18H161L137 52H163L104 112L118 72H96Z" fill={green} />
      <path d="M120 14H153L129 48H155L96 108L110 68H88Z" fill="white" strokeWidth="3" />
    </>
  ),
  volume: (
    <g transform="translate(98 85)">
      <Shadow w={119} d={76} />
      <Box w={119} d={76} h={38} />
      <Surface z={38}>
        <circle cx="40" cy="38" r="33" fill={mint} />
        <circle cx="40" cy="38" r="9" fill="white" />
        <path d="M49 27L96 47L83 63Z" fill={side} />
        <circle cx="93" cy="56" r="12" fill={ink} />
        <Dots x={85} y={13} />
      </Surface>
      <Surface y={76} z={38} face="left">
        <rect x="12" y="10" width="66" height="18" rx="2" fill={ink} />
        <Dots x={87} y={20} />
      </Surface>
    </g>
  ),
  backup: (
    <>
      <g transform="translate(0 19) scale(.85)">
        <Database />
      </g>
      <circle cx="166" cy="120" r="49" fill="white" />
      <circle cx="166" cy="120" r="40" fill={mint} />
      <path d="M147 137a26 26 0 1 0-5-26l-4-13m4 13 13-3M166 105v16l12 6" fill="none" strokeWidth="4" />
    </>
  ),
};

function Envelope() {
  return (
    <>
      <rect width="62" height="42" rx="4" fill="white" />
      <path d="M1 4l30 21L61 4M2 39l19-20m20 0 19 20" fill="none" />
    </>
  );
}
export const delivery = {
  queue: (
    <g transform="translate(157 84)">
      <Shadow w={64} d={141} />
      <Box w={64} d={141} h={16} top={ink} />
      {series(4, (i) => (
        <g>
          <Box x={1} y={7 + i * 33} z={16} w={62} d={9} h={46} top={mint} right={green} />
          <Surface face="left" x={1} y={16 + i * 33} z={62}>
            <Envelope />
          </Surface>
        </g>
      ))}
      <Surface x={64} y={141} z={16} face="right">
        <path d="M110 8H30l6-4m-6 4 6 4" fill="none" strokeWidth="3" />
      </Surface>
    </g>
  ),
  topic: (
    <>
      <BaseShadow />
      <Wire d="M120 64V148M53 114V98L120 71L187 98V114" />
      <g transform="translate(120 43)">
        <Disc r={41} h={29} lid={mint} />
        <circle r="6" fill={ink} />
        <path d="M-21-15Q0-33 21-15M-13-9Q0-20 13-9" fill="none" strokeWidth="3" />
      </g>
      {[
        [55, 112],
        [185, 112],
        [120, 144],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x - 27} ${y - 15}) scale(.88)`}>
          <Envelope />
        </g>
      ))}
    </>
  ),
  scheduler: (
    <>
      <Panel flip>
        <rect x="1" y="1" width="142" height="26" fill={mint} />
        {series(2, (i) => (
          <rect x={27 + i * 79} y="-10" width="8" height="22" rx="4" fill={ink} />
        ))}
        {series(3, (i) =>
          series(5, (j) => (
            <rect
              x={13 + j * 25}
              y={36 + i * 18}
              width="14"
              height="9"
              rx="1"
              fill={i === 1 && j === 1 ? green : side}
              stroke="none"
            />
          )),
        )}
      </Panel>
      <circle cx="172" cy="122" r="44" fill="white" />
      <circle cx="172" cy="122" r="36" fill={mint} />
      <path d="M172 99v23l18 10" strokeWidth="4" fill="none" />
    </>
  ),
  stream: (
    <Ground>
      <Surface>
        {series(3, (i) => (
          <path d={`M4 ${17 + i * 35}H100l-8-8m8 8-8 8`} fill="none" strokeWidth="4" />
        ))}
      </Surface>
      {[
        [10, 8],
        [27, 43],
        [6, 78],
        [68, 8],
        [62, 78],
      ].map(([x, y]) => (
        <Tile key={x} x={x} y={y} w={17} h={14} top={x < 50 ? 'white' : mint} />
      ))}
      <Box x={47} w={12} d={11} h={58} />
      <Box x={47} y={94} w={12} d={11} h={58} />
      <Box x={47} z={55} w={12} d={105} h={17} right={green} top={mint} />
    </Ground>
  ),
  repository: (
    <Panel dark flip>
      <Dots fill={side} />
      <path d="M26 31V79M26 67C26 47 61 65 61 34" stroke={mint} fill="none" strokeWidth="5" />
      {[
        [26, 31],
        [61, 33],
        [26, 79],
      ].map(([x, y]) => (
        <circle key={y} cx={x} cy={y} r="7" fill="white" />
      ))}
      <Lines x={85} y={34} w={41} step={15} stroke="white" />
    </Panel>
  ),
  build: (
    <g transform="translate(77 91)">
      <Shadow w={139} d={48} />
      <Box w={139} d={48} h={21} top={ink} />
      <Surface y={48} z={21} face="left">
        {series(6, (i) => (
          <circle cx={13 + i * 22} cy="10.5" r="6" fill={side} />
        ))}
      </Surface>
      <Box x={8} y={8} z={21} w={29} d={30} h={14} top={mint} />
      <Box x={53} z={21} w={29} d={10} h={66} />
      <Box x={53} y={38} z={21} w={29} d={10} h={66} />
      <Box x={49} z={87} w={37} d={48} h={9} top={mint} />
      <Box x={98} y={6} z={21} w={33} d={33} h={34} top={mint} front={green} />
    </g>
  ),
  registry: (
    <g transform="translate(91 100)">
      <Shadow w={115} d={49} />
      <Box w={115} d={49} h={89} />
      <Surface face="left" y={49} z={89}>
        {series(2, (i) => (
          <g transform={`translate(5 ${6 + i * 41})`}>
            <rect width="105" height="36" fill={ink} />
            {series(3, (j) => (
              <g transform={`translate(${4 + j * 33} 6)`}>
                <rect width="29" height="29" fill={i === j ? mint : 'white'} />
                <rect x="10" width="9" height="12" fill={green} />
              </g>
            ))}
          </g>
        ))}
      </Surface>
    </g>
  ),
  plan: (
    <Panel flip>
      <Dots />
      <rect x="10" y="23" width="124" height="29" rx="4" fill={mint} />
      <rect x="10" y="58" width="124" height="28" rx="4" fill={side} />
      <path d="M19 37h17m-8-8v16m-9 27h17M49 37h65M49 72h48" strokeWidth="4" />
    </Panel>
  ),
};
