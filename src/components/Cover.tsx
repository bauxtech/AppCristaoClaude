import type { ReactNode } from 'react'
import { Image, Pressable, View, useWindowDimensions } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'
import type { Palette } from '../theme/colors'
import { fonts } from '../theme/typography'
import { AppText } from './AppText'
import { ProgressBar } from './ProgressBar'

/**
 * Cinco fundos tirados da paleta, cada um com a cor do texto que passa de 4,5 para 1
 * em todos os modos (claro, escuro e alto contraste). Testado em __tests__/contrast.test.ts.
 */
export const COVER_TONES: [keyof Palette, keyof Palette][] = [
  ['primary', 'primaryText'],
  ['accent', 'accentText'],
  ['primarySoft', 'text'],
  ['text', 'bg'],
  ['dangerSoft', 'text'],
]

export type CoverGraphic = 'rays' | 'arcs' | 'waves'
const GRAPHICS: CoverGraphic[] = ['rays', 'arcs', 'waves']

/** Mesma capa sempre para o mesmo item: tom e grafismo saem do id. */
export function coverStyle(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const n = Math.abs(h)
  return { tone: n % COVER_TONES.length, graphic: GRAPHICS[Math.floor(n / COVER_TONES.length) % GRAPHICS.length] }
}

function Graphic({ kind, color }: { kind: CoverGraphic; color: string }) {
  // Grafismo decorativo, desenhado numa caixa 4 por 3.
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }} accessible={false}>
      {kind === 'rays'
        ? [0, 1, 2, 3, 4, 5, 6].map((i) => {
            const a = (Math.PI / 2) * (i / 6)
            return <Line key={i} x1={120} y1={0} x2={120 - Math.cos(a) * 110} y2={Math.sin(a) * 110} stroke={color} strokeWidth={5} strokeLinecap="round" />
          })
        : null}
      {kind === 'arcs' ? [22, 40, 58, 76].map((r) => <Circle key={r} cx={120} cy={0} r={r} stroke={color} strokeWidth={6} fill="none" />) : null}
      {kind === 'waves'
        ? [14, 28, 42].map((y) => <Path key={y} d={`M0 ${y} Q15 ${y - 8} 30 ${y} T60 ${y} T90 ${y} T120 ${y}`} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />)
        : null}
    </Svg>
  )
}

interface ArtProps {
  /** Texto grande em Literata sobre a arte. */
  title: string
  tone: number
  graphic?: CoverGraphic
  /** Etiqueta no canto, como "Hoje". */
  tag?: string
  /** Quando houver imagem de capa, ela substitui a arte tipográfica. */
  imageUri?: string
  large?: boolean
}

/** A arte da capa, na proporção 4 por 3. */
export function CoverArt({ title, tone, graphic = 'rays', tag, imageUri, large }: ArtProps) {
  const colors = useTheme().colors
  const [bgKey, fgKey] = COVER_TONES[tone % COVER_TONES.length]
  const bg = colors[bgKey]
  const fg = colors[fgKey]
  return (
    <View style={{ aspectRatio: 4 / 3, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: bg, justifyContent: 'flex-end' }} accessible={false} importantForAccessibility="no-hide-descendants">
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      ) : (
        <>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.22 }}>
            <Graphic kind={graphic} color={fg} />
          </View>
          <AppText style={{ fontFamily: fonts.bibleMedium, fontSize: large ? 32 : 22, lineHeight: large ? 40 : 28, color: fg, padding: large ? 20 : 14 }} numberOfLines={3}>
            {title}
          </AppText>
        </>
      )}
      {tag ? (
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: fg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <AppText variant="label" style={{ color: bg, fontFamily: fonts.bold }}>
            {tag}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

interface CoverProps extends ArtProps {
  /** Nome falado pelo leitor de tela: a capa inteira é um botão só. */
  label: string
  onPress: () => void
  /** Título embaixo da arte, em até 2 linhas. Quando não vier, usa o da arte. */
  caption?: string
  info?: string
  progress?: { value: number; max: number }
  width?: number
}

export function Cover({ label, onPress, caption, info, progress, width, ...art }: CoverProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width, gap: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <CoverArt {...art} />
      <View style={{ gap: 2 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {caption ?? art.title}
        </AppText>
        {info ? (
          <AppText variant="small" tone="secondary" numberOfLines={1}>
            {info}
          </AppText>
        ) : null}
        {progress ? (
          <View style={{ marginTop: 4 }}>
            <ProgressBar value={progress.value} max={progress.max} label="" />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

/** Capa tracejada para estado vazio, como "Escolher um plano". */
export function CoverEmpty({ label, onPress, width, hint }: { label: string; onPress: () => void; width?: number; hint?: string }) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} style={({ pressed }) => ({ width, gap: 8, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ aspectRatio: 4 / 3, width: '100%', borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <AppText variant="bodyStrong" style={{ color: colors.primary, textAlign: 'center' }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  )
}

/** Largura que deixa a próxima capa aparecendo pela metade na borda. */
export function useCarouselItemWidth(gutter = 16, gap = 12) {
  const { width } = useWindowDimensions()
  return Math.round((width - gutter - gap) / 1.5)
}

/** Largura de cada capa numa grade de 2 colunas. */
export function useGridItemWidth(gutter = 16, gap = 12) {
  const { width } = useWindowDimensions()
  return Math.floor((width - gutter * 2 - gap) / 2)
}

export function CoverGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 20 }}>{children}</View>
}
