import {
  BaseShadow,
  Box,
  Dots,
  Ground,
  Rack,
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

function Globe() {
  return (
    <g transform="rotate(-21)">
      <circle r="61" fill={mint} />
      <ellipse rx="29" ry="61" fill="none" />
      <path d="M-61 0H61M0-61V61M-51-33Q0-13 51-33M-51 33Q0 13 51 33" fill="none" />
    </g>
  );
}
export const network = {
  router: (
    <g transform="translate(113 91)">
      <Shadow w={105} d={92} />
      <Box w={105} d={92} h={47} />
      <Surface z={47}>
        <rect x="6" y="6" width="93" height="80" rx="10" fill={mint} />
        <g transform="translate(52 46)" fill="none" strokeWidth="5">
          <path d="M-35 0h26l-9-9m9 9-9 9M35 0H9l9-9m-9 9 9 9M0-6v-26l-9 9m9-9 9 9M0 6v26l-9-9m9 9 9-9" />
        </g>
      </Surface>
      <Surface face="left" y={92} z={47}>
        {series(4, (i) => (
          <g transform={`translate(${10 + i * 22} 15)`}>
            <rect width="17" height="15" rx="2" fill={ink} />
            <path d="M4 3h9" stroke={mint} />
          </g>
        ))}
      </Surface>
      <Surface face="right" x={105} y={92} z={47}>
        <Dots x={58} y={19} />
      </Surface>
    </g>
  ),
  firewall: (
    <g transform="translate(59 96)">
      <Shadow w={148} d={26} />
      {series(4, (i) =>
        (i % 2 ? [0, 18, 55, 92, 129, 148] : [0, 37, 74, 111, 148]).map(
          (x, j, arr) =>
            j > 0 && (
              <Box
                key={x}
                x={arr[j - 1]}
                z={i * 21}
                w={x - arr[j - 1]}
                d={26}
                h={21}
                front={i === 2 ? mint : 'white'}
              />
            ),
        ),
      )}
      <Surface face="left" x={45} y={34} z={62}>
        <path d="M0 0Q28 1 34-10Q46 0 68 0V25Q68 50 34 66Q0 50 0 25Z" fill={ink} />
        <path d="M34 2C36 18 54 20 51 36C47 55 20 55 17 38Q14 30 23 21Q24 32 28 30Q35 18 34 2Z" fill={mint} />
      </Surface>
    </g>
  ),
  'load-balancer': (
    <>
      <BaseShadow rx={103} ry={20} />
      <Wire d="M120 58V119M45 120V97L120 77L195 97V120" />
      <g transform="translate(117 37)">
        <Box w={48} d={41} h={24} top={mint} right={green} />
        <Surface y={41} z={24} face="left">
          <Dots x={16} y={12} />
        </Surface>
      </g>
      {series(3, (i) => (
        <g transform={`translate(${43 + i * 75} ${i === 1 ? 146 : 132})`}>
          <Rack w={34} d={30} h={31} />
        </g>
      ))}
    </>
  ),
  dns: (
    <>
      <BaseShadow />
      <g transform="translate(94 82)">
        <Globe />
      </g>
      <g transform="matrix(1 -.4 0 1 111 116)">
        <rect x="-7" y="-6" width="96" height="57" rx="6" fill={side} />
        <rect width="96" height="57" rx="6" fill="white" />
        <path d="M12 19h30m-30 19h23M57 28h25l-9-9m9 9-9 9" fill="none" strokeWidth="4" />
      </g>
    </>
  ),
  cdn: (
    <>
      <BaseShadow />
      <g transform="translate(120 100)">
        <Globe />
      </g>
      {[
        [120, 39],
        [48, 128],
        [192, 128],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <Tile w={30} h={24} top="white" />
          <Surface y={30} z={24} face="left">
            <path d="M9 5l13 7-13 7Z" fill={green} />
          </Surface>
        </g>
      ))}
      <path d="M43 90Q51 52 84 39M155 39Q191 55 197 90" fill="none" strokeDasharray="5 5" strokeWidth="3" />
    </>
  ),
  nat: (
    <Ground>
      <Surface>
        <path d="M20 18H51V86H20M20 52H96l-12-12m12 12L84 64" fill="none" strokeWidth="5" />
      </Surface>
      {series(3, (i) => (
        <Tile x={5} y={5 + 34 * i} w={23} h={18} top="white" />
      ))}
      <Box x={39} y={31} w={26} d={43} h={62} front={mint} top={mint} />
      <Surface face="right" x={65} y={74} z={62}>
        <rect x="6" y="8" width="31" height="43" rx="4" fill={ink} />
        <path d="M11 22h20l-7-7m7 21H11l7 7" fill="none" stroke={mint} strokeWidth="3" />
      </Surface>
    </Ground>
  ),
  vpn: (
    <>
      <BaseShadow />
      <g transform="matrix(1 -.44 0 1 43 126)">
        <path d="M0 30V0Q0-35 26-35H139Q158-35 158 0V31Z" fill={mint} />
        <path d="M0 30V-2Q0-39 24-34Q56-26 56 13V58Z" fill="white" />
        <path d="M8 27V0Q8-28 24-22Q48-14 48 14V44Z" fill={ink} />
        <path d="M56 58H162V10H56Z" fill={green} />
        <Wire d="M-19 26h58" />
        <path d="M92 8V-4a13 13 0 0 1 26 0V8" fill="none" strokeWidth="6" />
        <rect x="84" y="6" width="42" height="35" rx="5" fill="white" />
        <circle cx="105" cy="20" r="4" fill={ink} />
        <path d="M105 20v10" strokeWidth="4" />
      </g>
    </>
  ),
  interconnect: (
    <g transform="translate(67 83)">
      <Shadow w={142} d={34} />
      <Surface y={17} z={18} face="left">
        <Wire d="M-32 0H178" />
      </Surface>
      <Box w={65} d={34} h={37} front={mint} top={mint} />
      <Box x={65} y={3} z={4} w={13} d={28} h={29} top={ink} front={ink} />
      <Box x={78} w={64} d={34} h={37} />
      <Surface z={37}>
        <path d="M44 9l9 8-9 8M99 9l-9 8 9 8" fill="none" strokeWidth="4" />
      </Surface>
      <Surface y={34} z={37} face="left">
        <path d="M11 8v21M19 8v21M27 8v21M115 8v21M123 8v21M131 8v21" strokeWidth="3" />
        <path d="M62-42l4 13M81-44l-5 15M67 49l-4 12M78 49l5 12" stroke={green} strokeWidth="5" />
      </Surface>
      <Surface x={142} y={17} z={18} face="left">
        <Wire d="M0 0h36" />
      </Surface>
    </g>
  ),
};

function Campus() {
  return (
    <g transform="translate(99 100)">
      <Shadow w={108} d={62} />
      <Box w={108} d={62} h={78} />
      <Box x={16} y={10} z={78} w={52} d={35} h={10} top={mint} />
      <Surface face="left" y={62} z={78}>
        {series(3, (i) => (
          <rect x="7" y={8 + i * 14} width="94" height="8" fill={i === 0 ? mint : ink} />
        ))}
        <rect x="38" y="54" width="30" height="24" fill={mint} />
        <path d="M53 54v24" />
      </Surface>
      <Surface x={108} y={62} z={78} face="right">
        {series(5, (i) => (
          <path d={`M${10 + i * 10} 13v52`} strokeWidth="4" />
        ))}
      </Surface>
    </g>
  );
}
function Pin() {
  return (
    <>
      <path d="M0 38Q-26 11-26-6a26 26 0 0 1 52 0Q26 11 0 38Z" fill={mint} />
      <circle cy="-6" r="10" fill="white" />
    </>
  );
}
export const compute = {
  vpc: (
    <Ground>
      <Surface>
        <rect x="4" y="4" width="97" height="97" rx="8" fill={mint} strokeDasharray="6 4" strokeWidth="3" />
        <path d="M27 75V26H78V78H27" fill="none" strokeWidth="3" />
      </Surface>
      <Rack x={11} y={10} w={34} d={26} />
      <Tile x={65} y={10} top="white" />
      <Tile x={10} y={62} top="white" />
      <Tile x={64} y={63} top={ink} />
    </Ground>
  ),
  zone: (
    <>
      <Ground>
        <Surface>
          <rect x="8" y="8" width="89" height="89" fill={side} />
        </Surface>
        <Rack x={31} y={31} h={43} />
      </Ground>
      <g transform="translate(120 42)">
        <Pin />
      </g>
    </>
  ),
  region: (
    <>
      <Ground>
        <Surface>
          <rect x="4" y="4" width="97" height="97" fill={mint} />
        </Surface>
        {[
          [7, 30],
          [58, 7],
          [57, 58],
        ].map(([x, y]) => (
          <Rack key={x} x={x} y={y} w={38} d={38} h={33} />
        ))}
      </Ground>
      <g transform="translate(120 40) scale(.88)">
        <Pin />
      </g>
    </>
  ),
  datacenter: <Campus />,
  vm: (
    <g transform="translate(111 103)">
      <Shadow w={86} d={64} />
      <Rack w={86} d={64} h={87} />
      <Surface face="right" x={101} y={73} z={85}>
        <rect x="-6" y="-5" width="86" height="61" rx="5" fill={side} />
        <rect width="86" height="61" rx="5" fill={mint} />
        <Dots />
        <rect x="5" y="17" width="76" height="38" rx="2" fill={ink} />
        <path d="M16 26l10 10-10 10m18 0h18" stroke="white" strokeWidth="3" fill="none" />
      </Surface>
    </g>
  ),
  cluster: (
    <Ground>
      <Surface>
        <path d="M24 24H80V80H24Z" fill="none" strokeWidth="5" />
      </Surface>
      {[
        [6, 6],
        [62, 6],
        [6, 62],
        [62, 62],
      ].map(([x, y], i) => (
        <Rack key={i} x={x} y={y} w={36} d={36} h={i === 0 ? 59 : 38} top={mint} />
      ))}
    </Ground>
  ),
  pod: (
    <g transform="translate(106 100)">
      <Shadow w={100} d={70} />
      <Box w={100} d={70} h={19} top={ink} />
      {series(2, (i) => (
        <g>
          <Box x={6 + i * 47} y={10} z={19} w={40} d={49} h={49} top={mint} right={green} />
          <Surface x={6 + i * 47} y={59} z={68} face="left">
            {series(4, (j) => (
              <path d={`M${9 + j * 7} 8v29`} />
            ))}
          </Surface>
        </g>
      ))}
      <Surface z={83}>
        <rect width="100" height="70" rx="5" strokeDasharray="6 5" strokeWidth="3" fill="none" />
      </Surface>
    </g>
  ),
  gpu: (
    <g transform="translate(70 91)">
      <Shadow w={140} d={32} />
      <Box w={140} d={32} h={72} front={ink} top={mint} />
      <Surface y={32} z={72} face="left">
        {series(2, (i) => (
          <g transform={`translate(${37 + i * 66} 34)`}>
            <circle r="30" fill={side} />
            {series(7, (j) => (
              <path d="M0-4Q-7-26 5-25L14-19Q4-18 5 0Z" transform={`rotate(${(j * 360) / 7})`} fill={ink} />
            ))}
            <circle r="8" fill={mint} />
          </g>
        ))}
        <rect x="14" y="72" width="62" height="8" fill={mint} />
      </Surface>
    </g>
  ),
};
