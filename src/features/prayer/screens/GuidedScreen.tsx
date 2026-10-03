import * as Speech from 'expo-speech'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { AppText, MIN_TOUCH } from '../../../components'
import { Icon } from '../../../components/Icon'
import { formatDuration } from '../../../lib/date'
import { palettes } from '../../../theme/colors'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts, size } from '../../../theme/typography'
import { guidedSteps, themeById, type ThemeId } from '../data'

const ON_DARK = '#FFFFFF'
const ON_DARK_SOFT = 'rgba(255,255,255,0.78)'
const R = 58
const CIRC = 2 * Math.PI * R

/** Momento guiado em tela escura, com cronômetro e passos. No formato áudio, o app lê cada passo. */
export function GuidedScreen() {
  // A tela é sempre escura, então usa a paleta escura (ou a de alto contraste escura).
  const theme0 = useTheme()
  const colors = { ...palettes[theme0.highContrast ? 'highContrastDark' : 'dark'], darkSurface: theme0.colors.darkSurface }
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tema: string; min: string; formato: string }>()
  const theme = themeById(String(params.tema)) ?? themeById('gratidao')!
  const minutes = Number(params.min) || 5
  const audio = params.formato === 'audio'
  const total = minutes * 60
  const steps = guidedSteps(theme.id as ThemeId)

  const [elapsed, setElapsed] = useState(0)
  const [active, setActive] = useState(false)
  const spoken = useRef(-1)

  useEffect(() => {
    if (!active || elapsed >= total) return
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, total)), 1000)
    return () => clearInterval(t)
  }, [active, elapsed, total])

  const progress = total > 0 ? elapsed / total : 0
  const step = Math.min(Math.floor(progress * steps.length), steps.length - 1)

  useEffect(() => {
    if (!audio || !active || spoken.current === step) return
    spoken.current = step
    Speech.stop()
    Speech.speak(steps[step], { language: 'pt-BR' })
  }, [audio, active, step, steps])

  useEffect(() => {
    if (!active) Speech.stop()
  }, [active])

  useEffect(() => () => void Speech.stop(), [])

  useEffect(() => {
    if (elapsed < total) return
    const t = setTimeout(() => router.replace({ pathname: '/oracao/fim', params: { min: String(minutes) } }), 800)
    return () => clearTimeout(t)
  }, [elapsed, total, minutes])

  return (
    <View style={{ flex: 1, backgroundColor: colors.darkSurface, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Sair do momento"
          style={{ width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={22} color={ON_DARK} strokeWidth={2.5} />
        </Pressable>
        <AppText accessibilityRole="header" style={{ flex: 1, textAlign: 'center', color: ON_DARK_SOFT, fontFamily: fonts.medium, fontSize: size.small }}>
          {`${theme.label}, ${minutes} min`}
        </AppText>
        <View style={{ width: MIN_TOUCH }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 32 }}>
        <View
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`${formatDuration(elapsed)} de ${formatDuration(total)}`}
          style={{ width: 128, height: 128, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={128} height={128} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={64} cy={64} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
            <Circle cx={64} cy={64} r={R} fill="none" stroke={colors.primary} strokeWidth={4} strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - progress)} strokeLinecap="round" />
          </Svg>
          <AppText style={{ color: ON_DARK, fontFamily: fonts.semibold, fontSize: 24 }}>{formatDuration(elapsed)}</AppText>
          <AppText style={{ color: ON_DARK_SOFT, fontSize: size.label }}>{`de ${formatDuration(total)}`}</AppText>
        </View>

        <AppText accessibilityLiveRegion="polite" style={{ color: ON_DARK, fontFamily: fonts.bible, fontSize: size.bible, lineHeight: 30, textAlign: 'center' }}>
          {steps[step]}
        </AppText>

        <View style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={`Passo ${step + 1} de ${steps.length}`}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i <= step ? colors.primary : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() => setActive((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
          style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={active ? 'pause' : 'play'} size={24} color={colors.primaryText} />
        </Pressable>
        {audio ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="volume" size={14} color={ON_DARK_SOFT} />
            <AppText style={{ color: ON_DARK_SOFT, fontSize: size.label }}>Áudio ligado</AppText>
          </View>
        ) : null}
      </View>
    </View>
  )
}
