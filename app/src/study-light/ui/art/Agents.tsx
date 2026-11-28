import {
  BaseShadow,
  Box,
  CheckMark,
  FileFace,
  Ground,
  Lines,
  Shadow,
  Surface,
  Panel,
  Wire,
  ink,
  mint,
  green,
  side,
  series,
} from './geometry';
import { Glass } from './Data';
import { Clipboard } from './Operations';

function Robot({ color = mint }) {
  return (
    <g transform="translate(104 100)">
      <Shadow w={94} d={66} />
      <Box x={11} y={11} w={72} d={44} h={17} front={side} right={ink} />
      <Box z={14} w={94} d={66} h={70} top={color} />
      <Surface face="left" y={66} z={84}>
        <rect x="7" y="10" width="80" height="47" rx="13" fill={ink} />
        <path d="M28 27v10m38-10v10" stroke={color} strokeWidth="9" />
        <path d="M42 43q5 7 10 0" fill="none" stroke="white" />
      </Surface>
      <Surface face="right" x={94} y={66} z={84}>
        <circle cx="34" cy="37" r="19" fill={color} />
        <circle cx="34" cy="37" r="9" fill="white" />
      </Surface>
      <path d="M13-52V-75" strokeWidth="5" />
      <circle cx="13" cy="-79" r="9" fill="white" />
    </g>
  );
}
function Brain() {
  return (
    <g fill={mint}>
      <path d="M0-30Q-17-45-28-26Q-46-24-43-5Q-55 13-38 23Q-33 40-18 35Q-9 44 0 35Q10 42 19 35Q36 39 38 23Q55 13 43-5Q47-24 28-26Q19-44 0-30Z" />
      <path
        d="M0-30V35M-28-26q10 1 9 11M-43-5q11-5 19 2l13-5M-38 23q2-13 14-13M-18 35q-4-12 7-15M28-26q-10 1-9 11M43-5q-10-5-18 2L10-8M38 23q-1-14-13-14M19 35q3-14-8-16"
        fill="none"
      />
    </g>
  );
}
function Bubble({ fill = 'white' }) {
  return (
    <>
      <path d="M0 7Q0 0 7 0H103Q110 0 110 7V45Q110 52 103 52H38L17 69V52H7Q0 52 0 45Z" fill={fill} />
      <path d="M15 19H91M15 32H70" strokeWidth="3" />
    </>
  );
}
export const agents = {
  agent: <Robot />,
  model: (
    <g transform="translate(120 91)">
      <Shadow w={97} d={97} />
      <Box w={97} d={97} h={24} top={ink} />
      <Surface z={24}>
        {series(7, (i) => (
          <path stroke={mint} strokeWidth="4" d={`M5 ${15 + i * 11}h87M${15 + i * 11} 5v87`} />
        ))}
      </Surface>
      <Box x={14} y={14} z={24} w={69} d={69} h={13} />
      <g transform="translate(0 -26) scale(1.27)">
        <Brain />
      </g>
    </g>
  ),
  workflow: (
    <Panel flip>
      <path d="M26 48H63M63 28v-9h49M63 68v9h49" fill="none" strokeWidth="4" />
      <circle cx="22" cy="48" r="12" fill={ink} />
      <path d="M41 48l22-22 22 22-22 22Z" fill={mint} />
      <rect x="95" y="6" width="36" height="27" rx="5" fill={mint} />
      <rect x="95" y="63" width="36" height="27" rx="5" fill={side} />
      <g transform="translate(113 19) scale(.83)">
        <CheckMark x={0} y={0} />
      </g>
      <path d="M106 77h14" strokeWidth="3" />
    </Panel>
  ),
  tool: (
    <g transform="translate(93 101)">
      <Shadow w={115} d={56} />
      <Box w={115} d={56} h={48} front={green} right={ink} />
      <Box w={115} d={56} z={48} h={17} top={mint} />
      <Surface y={56} z={65} face="left">
        <rect x="46" y="8" width="20" height="24" rx="3" fill={ink} />
        <path d="M52 16h8" stroke="white" />
      </Surface>
      <Surface x={24} y={30} z={65} face="left">
        <path d="M0 0v-23q0-4 5-4h54q5 0 5 5V0H54v-17H10V0Z" fill={ink} />
      </Surface>
      <g transform="translate(91 -8) rotate(28)">
        <path
          d="M-13-39L-12-21L0-15L12-21L13-39Q36-19 10-2V66a10 10 0 0 1-20 0V-2Q-36-19-13-39Z"
          fill="white"
        />
        <circle cy="65" r="4" fill={mint} />
      </g>
    </g>
  ),
  mcp: (
    <g transform="translate(108 83)">
      <Shadow w={98} d={70} />
      <Wire d="M19 1C48-13 105-21 69-39L22-60" />
      <Box w={98} d={70} h={36} top={mint} />
      <Surface face="left" y={70} z={36}>
        {series(3, (i) => (
          <rect x={7 + i * 31} y="10" width="23" height="15" rx="4" fill={ink} />
        ))}
      </Surface>
      <Surface z={36}>
        <path d="M19 50H80M19 50v12M80 50v12M49 62V17" fill="none" strokeWidth="4" />
        <circle cx="49" cy="16" r="7" fill="white" />
      </Surface>
      {series(2, (i) => (
        <g transform={`translate(${i * 58} ${26 * i})`}>
          <Wire d="M-52 26l-37 17q-12 5 0 12l23 10" fill={i ? side : green} />
          <Box x={8} y={70} z={8} w={21} d={22} h={17} />
        </g>
      ))}
    </g>
  ),
  handoff: (
    <>
      <g transform="translate(-7 29) scale(.6)" strokeWidth="2.8">
        <Robot />
      </g>
      <g transform="translate(250 74) scale(-.6 .6)" strokeWidth="2.8">
        <Robot color={side} />
      </g>
      <path d="M101 33Q153 17 173 53L181 46L180 70L156 64L164 60Q150 35 101 42Z" fill={mint} />
    </>
  ),
  session: (
    <>
      <BaseShadow />
      <g transform="matrix(1 .38 0 1 41 25)">
        <Bubble />
      </g>
      <g transform="matrix(-1 .38 0 1 202 79)">
        <Bubble fill={mint} />
      </g>
    </>
  ),
  memory: (
    <g transform="translate(112 97)">
      <Shadow w={88} d={66} />
      <Box w={88} d={66} h={56} top={ink} />
      <Surface x={4} y={42} z={105} face="left">
        <path d="M0 51V0H28L38 9H80V51Z" fill={mint} />
        <path d="M14 19h10v19l-5-4-5 4Z" fill={ink} />
        <path d="M35 23h34M35 32h21" strokeWidth="3" />
      </Surface>
      <Surface y={66} z={56} face="left">
        <rect x="6" y="5" width="76" height="46" rx="3" fill="white" />
        <rect x="30" y="21" width="28" height="9" rx="4" fill={ink} />
      </Surface>
      <Surface face="right" x={88} y={66} z={56}>
        <g transform="translate(33 27) scale(.56)" strokeWidth="3">
          <Brain />
        </g>
      </Surface>
    </g>
  ),
};

function Docs() {
  return (
    <>
      <BaseShadow />
      {series(3, (i) => (
        <g transform={`matrix(1 .4 0 1 ${107 - i * 29} ${12 + i * 13})`}>
          <FileFace fill={i === 1 ? mint : 'white'}>
            <rect x="13" y="20" width="31" height="22" rx="2" fill={mint} />
            <Lines x={13} y={56} w={52} step={13} />
          </FileFace>
        </g>
      ))}
    </>
  );
}
export const knowledge = {
  documents: <Docs />,
  chunk: (
    <>
      <BaseShadow />
      {series(3, (i) => (
        <g transform={`matrix(1 .38 0 1 ${52 + (i === 1 ? 17 : 0)} ${12 + i * 48 + (i === 1 ? 6.46 : 0)})`}>
          <rect width="112" height="30" fill={i === 1 ? mint : 'white'} />
          <path d="M14 10h81M14 20h58" strokeWidth="3" />
          {i < 2 && <path d="M-21 40H137" strokeDasharray="6 5" />}
        </g>
      ))}
    </>
  ),
  embedding: (
    <>
      <BaseShadow />
      <g transform="matrix(.8 .32 0 .83 36 35)">
        <FileFace>
          <Lines x={12} y={40} w={56} step={14} />
        </FileFace>
      </g>
      <g transform="matrix(1 -.4 0 1 148 46)">
        <rect x="-7" y="-5" width="60" height="125" rx="4" fill={side} />
        <rect width="60" height="125" rx="4" fill={ink} />
        {[31, 14, 39, 22, 33].map((w, i) => (
          <rect key={w} x="11" y={12 + i * 22} width={w} height="12" fill={mint} stroke="none" />
        ))}
      </g>
      <path d="M89 91H120V79L141 99L120 119V107H89Z" fill={mint} />
    </>
  ),
  'vector-index': (
    <Ground>
      <Surface>
        <path d="M10 96V10H96M10 10L69 75" fill="none" strokeWidth="3" />
      </Surface>
      <path d="M0 9V-62M-5-54l5-8 5 8" strokeWidth="3" fill="none" />
      <path d="M0 8L-48-13M0 8L56-10M0 8L-3 40" strokeDasharray="5 4" />
      {[
        [-48, -13],
        [-29, -33],
        [-65, 5],
        [56, -10],
        [38, -28],
        [74, -20],
        [-3, 40],
        [20, 30],
        [2, 60],
      ].map(([x, y], i) => (
        <circle key={x} cx={x} cy={y} r={i % 3 === 0 ? 10 : 7} fill={i < 3 ? mint : i < 6 ? 'white' : ink} />
      ))}
    </Ground>
  ),
  retrieval: (
    <>
      <g transform="translate(-7 13) scale(.91)">
        <Docs />
      </g>
      <g transform="translate(154 99)">
        <Glass />
        <path d="M-9 2h23m-23 9h15" strokeWidth="3" />
      </g>
    </>
  ),
  rerank: (
    <>
      <BaseShadow />
      <g transform="matrix(1 -.33 0 1 68 62)">
        {series(3, (i) => (
          <g transform={`translate(${i === 0 ? 7 : 0} ${37 * i})`}>
            <rect x="-5" y="-5" width="124" height="28" rx="4" fill={side} />
            <rect width="124" height="28" rx="4" fill={i === 0 ? mint : 'white'} />
            <circle cx="17" cy="14" r="7" fill={ink} />
            <path d={`M35 14h${73 - 18 * i}`} strokeWidth="4" />
          </g>
        ))}
        <path d="M-12 88H-27Q-36 88-36 79V23Q-36 14-27 14H-11l-8-9m8 9-8 9" strokeWidth="4" fill="none" />
      </g>
    </>
  ),
  grounding: (
    <>
      <BaseShadow />
      <g transform="matrix(1 .35 0 1 41 35)">
        <FileFace>
          <Lines x={12} y={38} w={57} step={15} />
          <rect x="11" y="78" width="59" height="15" fill={mint} />
        </FileFace>
      </g>
      <g transform="matrix(.94 -.36 0 .98 104 59)">
        <Bubble fill={mint} />
      </g>
      <g transform="translate(137 134) rotate(-32)" fill="white" strokeWidth="4">
        <rect x="-36" y="-14" width="35" height="28" rx="13" />
        <rect x="1" y="-14" width="35" height="28" rx="13" />
        <path d="M-15 0H15" />
      </g>
    </>
  ),
  evaluation: (
    <>
      <BaseShadow />
      <Clipboard score />
      <g transform="matrix(.9 -.36 0 .88 140 118)">
        <rect width="72" height="64" rx="5" fill={ink} />
        {[21, 41, 31].map((h, i) => (
          <rect
            key={h}
            width="11"
            height={h}
            x={12 + i * 18}
            y={54 - h}
            fill={i === 2 ? 'white' : mint}
            stroke="none"
          />
        ))}
      </g>
    </>
  ),
};
