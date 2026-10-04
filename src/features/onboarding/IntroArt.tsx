import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

// Ilustrações de cena da apresentação (provisórias): formas arredondadas, cores chapadas da paleta,
// sem contorno, pessoas simples e sem rosto detalhado. O Thiago troca pelas finais depois.
// A descrição para o leitor de tela fica em INTRO_STEPS.

const VB_W = 360
const VB_H = 300

function useSceneColors() {
  const { colors: c, isDark } = useTheme()
  // No escuro, papel e luz ficam claros e o cabelo fica escuro, para a cena não se inverter.
  return {
    sky: c.primarySoft,
    ground: c.line,
    cloth: c.primary,
    cloth2: c.lineStrong,
    skin: c.accent,
    hair: isDark ? c.bg : c.text,
    paper: isDark ? c.text : c.card,
    light: isDark ? c.lineStrong : c.bg,
  }
}

/** Pessoa sentada de frente, sem rosto. x, y: centro da cabeça. */
function Seated({ x, y, s = 1, cloth, skin, hair, eyesClosed, lines }: { x: number; y: number; s?: number; cloth: string; skin: string; hair: string; eyesClosed?: boolean; lines?: string }) {
  const k = (n: number) => n * s
  return (
    <>
      <Path d={`M${x - k(34)} ${y + k(92)} Q${x - k(36)} ${y + k(28)} ${x} ${y + k(24)} Q${x + k(36)} ${y + k(28)} ${x + k(34)} ${y + k(92)} Z`} fill={cloth} />
      <Ellipse cx={x} cy={y + k(92)} rx={k(52)} ry={k(14)} fill={cloth} />
      <Circle cx={x} cy={y} r={k(20)} fill={skin} />
      <Path
        d={`M${x - k(20)} ${y - k(2)} Q${x - k(18)} ${y - k(24)} ${x} ${y - k(23)} Q${x + k(18)} ${y - k(24)} ${x + k(20)} ${y - k(2)} Q${x + k(8)} ${y - k(12)} ${x - k(20)} ${y - k(2)} Z`}
        fill={hair}
      />
      {eyesClosed && lines ? (
        <>
          <Path d={`M${x - k(10)} ${y + k(2)} Q${x - k(6)} ${y + k(6)} ${x - k(2)} ${y + k(2)}`} stroke={lines} strokeWidth={k(2.4)} fill="none" strokeLinecap="round" />
          <Path d={`M${x + k(2)} ${y + k(2)} Q${x + k(6)} ${y + k(6)} ${x + k(10)} ${y + k(2)}`} stroke={lines} strokeWidth={k(2.4)} fill="none" strokeLinecap="round" />
        </>
      ) : null}
    </>
  )
}

/** Pessoa vista de costas (cabelo e ombros). */
function Back({ x, y, s = 1, cloth, hair }: { x: number; y: number; s?: number; cloth: string; hair: string }) {
  const k = (n: number) => n * s
  return (
    <>
      <Path d={`M${x - k(30)} ${y + k(60)} Q${x - k(30)} ${y + k(20)} ${x} ${y + k(18)} Q${x + k(30)} ${y + k(20)} ${x + k(30)} ${y + k(60)} Z`} fill={cloth} />
      <Circle cx={x} cy={y} r={k(17)} fill={hair} />
    </>
  )
}

export function IntroArt({ step, width, height }: { step: number; width: number; height: number }) {
  const c = useSceneColors()
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" accessible={false}>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill={c.sky} />
      {step === 0 ? (
        <>
          {/* Manhã: sol nascendo, pessoa sentada lendo */}
          <Circle cx={278} cy={92} r={58} fill={c.light} />
          <Circle cx={278} cy={92} r={34} fill={c.skin} />
          <Path d="M0 236 Q90 214 180 228 T360 220 L360 300 L0 300 Z" fill={c.ground} />
          <Path d="M54 236 Q40 196 64 168 Q70 204 60 236 Z" fill={c.cloth2} />
          <Path d="M66 236 Q78 190 100 176 Q88 210 76 236 Z" fill={c.cloth2} />
          <Seated x={170} y={130} cloth={c.cloth} skin={c.skin} hair={c.hair} />
          <Path d="M136 186 Q153 176 170 186 L170 210 Q153 200 136 210 Z" fill={c.paper} />
          <Path d="M204 186 Q187 176 170 186 L170 210 Q187 200 204 210 Z" fill={c.paper} />
          <Ellipse cx={134} cy={204} rx={9} ry={7} fill={c.skin} />
          <Ellipse cx={206} cy={204} rx={9} ry={7} fill={c.skin} />
        </>
      ) : null}
      {step === 1 ? (
        <>
          {/* Pessoa com o celular e balões saindo de um livro */}
          <Path d="M0 244 Q120 226 220 240 T360 236 L360 300 L0 300 Z" fill={c.ground} />
          <Path d="M40 236 Q80 222 116 236 L116 262 Q80 248 40 262 Z" fill={c.paper} />
          <Path d="M192 236 Q152 222 116 236 L116 262 Q152 248 192 262 Z" fill={c.paper} />
          <Rect x={58} y={150} width={92} height={40} rx={20} fill={c.paper} />
          <Circle cx={92} cy={200} r={6} fill={c.paper} />
          <Circle cx={104} cy={216} r={4} fill={c.paper} />
          <Rect x={74} y={164} width={48} height={6} rx={3} fill={c.cloth2} />
          <Rect x={74} y={176} width={30} height={6} rx={3} fill={c.cloth2} />
          <Rect x={110} y={88} width={104} height={44} rx={22} fill={c.cloth} />
          <Rect x={128} y={104} width={60} height={6} rx={3} fill={c.light} />
          <Rect x={128} y={116} width={40} height={6} rx={3} fill={c.skin} />
          <Circle cx={150} cy={142} r={5} fill={c.cloth} />
          {/* pessoa em pé à direita */}
          <Path d="M250 244 Q246 170 272 160 Q300 170 296 244 Z" fill={c.cloth2} />
          <Circle cx={273} cy={138} r={20} fill={c.skin} />
          <Path d="M253 136 Q255 112 274 114 Q293 116 293 136 Q280 124 253 136 Z" fill={c.hair} />
          <Rect x={240} y={176} width={18} height={30} rx={5} fill={c.hair} />
          <Ellipse cx={252} cy={204} rx={9} ry={7} fill={c.skin} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          {/* Culto: pessoas de costas, ondas de som que viram linhas de texto */}
          <Path d="M64 70 Q80 54 64 38" stroke={c.cloth} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d="M92 84 Q118 54 92 24" stroke={c.cloth} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d="M120 98 Q156 54 120 10" stroke={c.cloth} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Rect x={160} y={30} width={150} height={9} rx={4.5} fill={c.cloth} />
          <Rect x={160} y={50} width={120} height={9} rx={4.5} fill={c.skin} />
          <Rect x={160} y={70} width={140} height={9} rx={4.5} fill={c.cloth2} />
          <Rect x={0} y={150} width={VB_W} height={150} fill={c.ground} />
          <Back x={70} y={150} s={0.9} cloth={c.cloth2} hair={c.hair} />
          <Back x={150} y={150} s={0.9} cloth={c.cloth} hair={c.hair} />
          <Back x={230} y={150} s={0.9} cloth={c.skin} hair={c.hair} />
          <Back x={310} y={150} s={0.9} cloth={c.cloth2} hair={c.hair} />
          <Rect x={0} y={202} width={VB_W} height={12} rx={6} fill={c.cloth2} />
          <Back x={110} y={226} s={1.2} cloth={c.cloth} hair={c.hair} />
          <Back x={250} y={226} s={1.2} cloth={c.cloth2} hair={c.hair} />
        </>
      ) : null}
      {step === 3 ? (
        <>
          {/* Oração: olhos fechados, mãos juntas, lugar tranquilo */}
          <Circle cx={88} cy={78} r={30} fill={c.light} />
          <Path d="M0 210 Q70 170 150 196 Q230 220 360 180 L360 300 L0 300 Z" fill={c.cloth2} opacity={0.35} />
          <Path d="M0 240 Q100 218 190 232 T360 226 L360 300 L0 300 Z" fill={c.ground} />
          <Path d="M300 236 Q292 176 316 140 Q326 190 312 236 Z" fill={c.cloth2} />
          <Path d="M316 236 Q330 186 352 170 Q338 210 324 236 Z" fill={c.cloth2} />
          <Seated x={180} y={128} cloth={c.cloth} skin={c.skin} hair={c.hair} eyesClosed lines={c.hair} />
          <Path d="M180 166 Q170 182 174 198 Q180 204 186 198 Q190 182 180 166 Z" fill={c.skin} />
        </>
      ) : null}
      {step === 4 ? (
        <>
          {/* Célula: grupo pequeno em roda numa sala */}
          <Rect x={36} y={30} width={84} height={70} rx={10} fill={c.light} />
          <Rect x={76} y={30} width={4} height={70} fill={c.sky} />
          <Rect x={36} y={63} width={84} height={4} fill={c.sky} />
          <Rect x={292} y={60} width={6} height={110} rx={3} fill={c.cloth2} />
          <Path d="M272 70 Q295 34 318 70 Z" fill={c.skin} />
          <Rect x={0} y={170} width={VB_W} height={130} fill={c.ground} />
          <Ellipse cx={180} cy={232} rx={150} ry={46} fill={c.paper} />
          <Seated x={110} y={150} s={0.62} cloth={c.cloth2} skin={c.skin} hair={c.hair} />
          <Seated x={180} y={136} s={0.62} cloth={c.cloth} skin={c.skin} hair={c.hair} />
          <Seated x={250} y={150} s={0.62} cloth={c.skin} skin={c.skin} hair={c.hair} />
          <Ellipse cx={180} cy={226} rx={34} ry={14} fill={c.skin} />
          <Back x={130} y={226} s={1} cloth={c.cloth} hair={c.hair} />
          <Back x={230} y={226} s={1} cloth={c.cloth2} hair={c.hair} />
        </>
      ) : null}
    </Svg>
  )
}
