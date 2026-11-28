import {
  BaseShadow,
  Box,
  CheckMark,
  Disc,
  Dots,
  FileFace,
  Ground,
  Lines,
  Panel,
  Shadow,
  Surface,
  Tile,
  ink,
  mint,
  green,
  side,
  series,
} from './geometry';

function Shield({ filter = false }) {
  const d = 'M0 8Q31 8 50-7Q75 8 100 8V47Q100 88 50 113Q0 88 0 47Z';
  return (
    <g>
      <path d={d} transform="translate(10 -7)" fill={green} />
      <path d={d} fill={mint} />
      <path d={d} transform="translate(9 9) scale(.82)" fill="white" />
      {filter ? (
        <path d="M23 31H77L56 55V69L44 78V55Z" fill={ink} />
      ) : (
        <g transform="translate(50 50) scale(1.95)">
          <CheckMark x={0} y={0} />
        </g>
      )}
    </g>
  );
}
export function Clipboard({ score = false }) {
  return (
    <g transform="matrix(1 .36 0 1 60 17)">
      <rect x="9" y="-6" width="108" height="125" rx="7" fill={side} />
      <rect width="108" height="125" rx="7" fill={ink} />
      <rect x="6" y="7" width="96" height="111" rx="3" fill="white" />
      <path d="M28 15V-3H43a11 11 0 0 1 22 0H80V15Z" fill={mint} />
      <circle cx="54" cy="-3" r="4" fill="white" />
      {series(3, (i) => (
        <g transform={`translate(24 ${37 + i * 29})`}>
          <rect x="-9" y="-9" width="18" height="18" rx="3" fill={i === 2 && score ? side : mint} />
          {i === 2 && score ? (
            <path d="M-4-4l8 8m0-8-8 8" />
          ) : (
            <g transform="scale(.5)">
              <CheckMark x={0} y={0} />
            </g>
          )}
          <path d="M20-3H64M20 4H52" strokeWidth="3" />
        </g>
      ))}
    </g>
  );
}
export const operations = {
  key: (
    <>
      <BaseShadow y={145} />
      <g transform="translate(77 72) rotate(29)">
        {series(2, (i) => (
          <path
            transform={i === 0 ? 'translate(5 8)' : undefined}
            fill={i === 0 ? green : mint}
            fillRule="evenodd"
            d="M39-15H141L156 0L142 14H125V30H108V14H95V27H79V14H39A45 45 0 1 1 39-15ZM2 0a14 14 0 1 0-28 0 14 14 0 0 0 28 0"
          />
        ))}
        <path d="M48-5h86" strokeWidth="3" />
      </g>
    </>
  ),
  secret: (
    <g transform="translate(107 108)">
      <Shadow w={89} d={63} />
      <Box w={89} d={63} h={93} front={ink} />
      <Surface face="left" y={63} z={93}>
        <rect x="5" y="6" width="77" height="81" rx="5" fill="white" />
        <circle cx="34" cy="46" r="24" fill={mint} />
        <circle cx="34" cy="46" r="7" fill={ink} />
        {series(5, (i) => (
          <path transform={`rotate(${i * 72} 34 46)`} d="M34 40V29" strokeWidth="4" />
        ))}
        <rect x="66" y="31" width="7" height="30" rx="3" fill={side} />
      </Surface>
      <Surface x={89} y={63} z={93} face="right">
        <rect x="7" y="22" width="48" height="20" rx="3" fill={ink} />
        <Dots x={22} y={32} fill={mint} />
      </Surface>
    </g>
  ),
  policy: (
    <>
      <BaseShadow />
      <g transform="matrix(1.13 .4 0 1.1 49 15)">
        <FileFace>
          <Lines x={12} y={34} w={55} step={13} />
          <path d="M12 80h23" strokeWidth="4" />
        </FileFace>
      </g>
      <g transform="matrix(.84 -.32 0 .8 113 91)">
        <Shield />
      </g>
    </>
  ),
  audit: (
    <>
      <BaseShadow />
      <g transform="matrix(1 .4 0 1 68 17)">
        <path d="M0 11Q0-1 13-1H103V103H0Z" fill="white" />
        <path d="M90 13Q90-1 104-1T118 13V30H90Z" fill={mint} />
        <path d="M90 11v95q0 19-14 19H-7Q2 119 0 102" fill="white" />
        <path d="M-22 105H63Q63 125 77 125H-8Q-22 125-22 105Z" fill={side} />
        <path d="M17 19V87" />
        {series(3, (i) => (
          <g transform={`translate(17 ${24 + i * 27})`}>
            <circle r="5" fill={mint} />
            <path d="M14-3H59M14 4H47" strokeWidth="3" />
          </g>
        ))}
      </g>
    </>
  ),
  metrics: (
    <Panel dark>
      <Dots fill={mint} />
      <path d="M12 27v55h121M12 45h121M12 64h121" stroke={side} strokeWidth="1" fill="none" />
      <path
        d="M13 65l18-8 11 11 16-21 12 9 14-29 20 40 16-22 13-4"
        fill="none"
        stroke={mint}
        strokeWidth="5"
      />
      <circle cx="84" cy="27" r="6" fill="white" />
    </Panel>
  ),
  alert: (
    <>
      <BaseShadow rx={70} ry={21} />
      <g transform="rotate(17 120 95)">
        <circle cx="120" cy="33" r="13" fill={mint} />
        <path d="M53 127Q70 110 72 80Q75 34 120 33T168 80Q170 110 187 127Z" fill="white" />
        <path d="M128 35Q166 41 168 80Q170 110 187 127H154Q148 45 128 35" fill={side} stroke="none" />
        <ellipse cx="120" cy="126" rx="66" ry="21" fill={mint} />
        <ellipse cx="120" cy="135" rx="66" ry="21" fill={ink} />
        <circle cx="120" cy="135" r="16" fill={mint} />
        <path
          d="M43 81q0-20 9-32M59 77q0-11 5-20M197 81q0-20-9-32M181 77q0-11-5-20"
          fill="none"
          strokeWidth="4"
        />
      </g>
    </>
  ),
  trace: (
    <Panel flip>
      <Dots />
      <path d="M17 28v49h80M17 44H31V61H52" fill="none" strokeWidth="2.5" />
      {[
        [12, 120],
        [31, 57],
        [52, 22],
        [93, 35],
      ].map(([x, w], i) => (
        <rect key={x} x={x} y={22 + i * 16} width={w} height="11" rx="2" fill={[ink, mint, green, side][i]} />
      ))}
    </Panel>
  ),
  billing: (
    <>
      <BaseShadow />
      <g transform="matrix(1 .4 0 1 55 18)">
        <path d="M0 0H98V120L84 113L70 120L56 113L42 120L28 113L14 120L0 113Z" fill="white" />
        <rect x="10" y="11" width="78" height="24" fill={mint} />
        <Lines x={11} y={51} w={38} />
        <Lines x={67} y={51} w={20} />
        <path d="M11 88h74m-26 11h26" strokeWidth="3" />
      </g>
      <g transform="translate(161 143)">
        {series(4, (i) => (
          <g transform={`translate(${(i % 2) * 5} ${-13 * i})`}>
            <Disc r={41} h={12} lid={mint} rim={green} />
          </g>
        ))}
        <ellipse cx="5" cy="-39" rx="30" ry="10" fill="none" />
      </g>
    </>
  ),
};

function Person({ coat = mint }) {
  return (
    <g>
      <path d="M-57 28V12Q-54-21 0-21T57 12V28C52 55-52 55-57 28Z" fill={coat} />
      <path d="M-36 38v-12M28 43V24M-34-12l26 28 25-32" fill="none" />
      <path d="M-27-57v28q0 29 26 29 23-2 26-29v-32Z" fill="white" />
      <path d="M-30-34Q-41-78-8-78Q26-87 29-59L24-27L11-32L6-49Q-18-43-27-50Z" fill={ink} />
      <path d="M14-27q16-10 6-15-6-1-7 6" fill="white" />
    </g>
  );
}
export const governance = {
  user: (
    <>
      <BaseShadow rx={76} />
      <g transform="translate(120 110) scale(1.13)">
        <Person />
      </g>
    </>
  ),
  team: (
    <>
      <BaseShadow />
      <g transform="translate(120 71) scale(.74)">
        <Person coat={side} />
      </g>
      <g transform="translate(66 120) scale(.74)">
        <Person coat="white" />
      </g>
      <g transform="translate(162 132) scale(.88)">
        <Person />
      </g>
    </>
  ),
  sandbox: (
    <Ground>
      <Box x={7} y={7} w={90} d={7} h={59} />
      <Box x={7} y={14} w={7} d={83} h={59} />
      <Tile x={28} y={28} w={50} h={64} top={mint} />
      <Surface x={28} y={78} z={64} face="left">
        <path d="M18 12l-9 9 9 9m14-18 9 9-9 9" fill="none" strokeWidth="4" />
      </Surface>
      <Box x={90} y={14} w={7} d={83} h={23} />
      <Box x={14} y={90} w={76} d={7} h={23} />
    </Ground>
  ),
  skills: (
    <g transform="translate(119 104)">
      <Shadow w={80} d={80} />
      {series(3, (i) => (
        <g>
          <Box
            x={i * 28}
            w={24}
            d={80}
            h={84}
            front={i === 1 ? mint : 'white'}
            right={i === 2 ? mint : side}
          />
          <Surface x={i * 28} y={80} z={84} face="left">
            <path d="M5 13h14M5 20h14M0 65h24" />
            <circle cx="12" cy="54" r="4" fill={ink} />
          </Surface>
        </g>
      ))}
      <Surface face="right" x={80} y={80} z={84}>
        <path d="M14 38h17V22H49V38H66V55H49Q50 42 40 43Q30 43 31 55H14Z" fill="white" />
      </Surface>
    </g>
  ),
  prompt: (
    <Panel flip>
      <Dots />
      <path d="M11 25H132V72H58L38 86V72H11Z" fill={mint} />
      <path d="M24 39H114M24 55H79M86 50v11" strokeWidth="4" />
    </Panel>
  ),
  gateway: (
    <Ground>
      <Surface>
        <path d="M12 52h81l-11-11m11 11-11 11" strokeWidth="6" fill="none" />
      </Surface>
      <Box x={42} y={7} w={22} d={18} h={68} />
      <Box x={42} y={80} w={22} d={18} h={68} />
      <Box x={41} y={5} w={24} d={95} z={65} h={20} top={mint} right={ink} />
      <Surface x={65} y={100} z={85} face="right">
        <Dots x={39} y={10} fill={mint} />
      </Surface>
    </Ground>
  ),
  guardrail: (
    <>
      <BaseShadow rx={72} />
      <g transform="matrix(1.2 .36 0 1.15 53 24)">
        <Shield filter />
      </g>
    </>
  ),
  approval: (
    <>
      <g transform="scale(.86) translate(5 23)">
        <Clipboard />
      </g>
      <g transform="translate(166 147)">
        <Disc r={44} h={12} lid={mint} fill={ink} />
        <path d="M-23-5Q-9-21-16-42Q-33-75 0-79Q33-76 16-42Q9-21 23-5Q0 8-23-5Z" fill={ink} />
        <path d="M-11-52Q-15-66-2-68" fill="none" stroke="white" strokeWidth="3" />
      </g>
    </>
  ),
};
