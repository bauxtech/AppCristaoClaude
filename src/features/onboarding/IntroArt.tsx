import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

// Ilustrações de exemplo da apresentação, em formas simples e nas cores da paleta.
// O Thiago troca pelas finais depois. A descrição para o leitor de tela fica em INTRO_STEPS.

const W = 240
const H = 180

export function IntroArt({ step }: { step: number }) {
  const { colors } = useTheme()
  const soft = colors.primarySoft
  const main = colors.primary
  const accent = colors.accent
  const card = colors.card
  const line = colors.lineStrong
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} accessible={false}>
      <Circle cx={120} cy={90} r={84} fill={soft} />
      {step === 0 ? (
        <>
          {/* Bíblia aberta e barra de progresso */}
          <Path d="M50 58 Q85 48 118 60 L118 132 Q85 120 50 130 Z" fill={card} stroke={main} strokeWidth={3} />
          <Path d="M190 58 Q155 48 122 60 L122 132 Q155 120 190 130 Z" fill={card} stroke={main} strokeWidth={3} />
          <Line x1={62} y1={76} x2={106} y2={72} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={62} y1={90} x2={106} y2={86} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={134} y1={72} x2={178} y2={76} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={134} y1={86} x2={178} y2={90} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Rect x={70} y={146} width={100} height={10} rx={5} fill={card} stroke={main} strokeWidth={2} />
          <Rect x={70} y={146} width={46} height={10} rx={5} fill={accent} />
        </>
      ) : null}
      {step === 1 ? (
        <>
          {/* Pergunta e resposta com versículo */}
          <Rect x={46} y={40} width={110} height={44} rx={16} fill={card} stroke={line} strokeWidth={2} />
          <Line x1={62} y1={56} x2={136} y2={56} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={62} y1={70} x2={112} y2={70} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Rect x={84} y={96} width={112} height={56} rx={16} fill={main} />
          <Line x1={100} y1={114} x2={180} y2={114} stroke={card} strokeWidth={3} strokeLinecap="round" />
          <Line x1={100} y1={128} x2={160} y2={128} stroke={card} strokeWidth={3} strokeLinecap="round" />
          <Rect x={100} y={138} width={36} height={8} rx={4} fill={accent} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          {/* Microfone e texto transcrito */}
          <Rect x={62} y={40} width={36} height={60} rx={18} fill={main} />
          <Path d="M52 84 Q52 116 80 116 Q108 116 108 84" fill="none" stroke={main} strokeWidth={4} strokeLinecap="round" />
          <Line x1={80} y1={116} x2={80} y2={136} stroke={main} strokeWidth={4} strokeLinecap="round" />
          <Line x1={64} y1={138} x2={96} y2={138} stroke={main} strokeWidth={4} strokeLinecap="round" />
          <Rect x={124} y={48} width={74} height={94} rx={12} fill={card} stroke={line} strokeWidth={2} />
          <Line x1={136} y1={68} x2={186} y2={68} stroke={accent} strokeWidth={4} strokeLinecap="round" />
          <Line x1={136} y1={86} x2={186} y2={86} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={136} y1={100} x2={176} y2={100} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={136} y1={114} x2={182} y2={114} stroke={line} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}
      {step === 3 ? (
        <>
          {/* Coração e lista de pedidos com marcação de respondido */}
          <Path d="M84 80 C64 58 34 74 46 98 C54 114 84 132 84 132 C84 132 114 114 122 98 C134 74 104 58 84 80 Z" fill={main} />
          <Rect x={136} y={46} width={66} height={96} rx={12} fill={card} stroke={line} strokeWidth={2} />
          <Circle cx={152} cy={68} r={7} fill={accent} />
          <Path d="M148 68 L151 71 L156 65" stroke={card} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Line x1={166} y1={68} x2={192} y2={68} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={152} cy={94} r={7} fill="none" stroke={line} strokeWidth={2} />
          <Line x1={166} y1={94} x2={192} y2={94} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={152} cy={120} r={7} fill="none" stroke={line} strokeWidth={2} />
          <Line x1={166} y1={120} x2={188} y2={120} stroke={line} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}
      {step === 4 ? (
        <>
          {/* Pessoas em volta de uma mesa */}
          <Circle cx={120} cy={100} r={30} fill={card} stroke={main} strokeWidth={3} />
          {[
            [120, 46],
            [170, 78],
            [160, 136],
            [80, 136],
            [70, 78],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={14} fill={i === 0 ? accent : main} />
          ))}
          <Line x1={106} y1={96} x2={134} y2={96} stroke={line} strokeWidth={3} strokeLinecap="round" />
          <Line x1={110} y1={108} x2={130} y2={108} stroke={line} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  )
}
