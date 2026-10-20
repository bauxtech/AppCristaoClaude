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
import { BASE_RATE } from '../../audio/AudioContext'

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
  // Voz: começa como a pessoa escolheu antes e pode ser ligada ou desligada aqui.
  const [audio, setAudio] = useState(params.formato === 'audio')
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
  // Cada passo tem o mesmo tempo. Avançar ou voltar leva o cronômetro para o começo do passo.
  const stepSecs = total / steps.length
  const goToStep = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i))
    spoken.current = -1
    setElapsed(Math.ceil(next * stepSecs))
    setActive(true)
  }

  useEffect(() => {
    if (!audio || !active || spoken.current === step) return
    spoken.current = step
    Speech.stop()
    Speech.speak(steps[step], { language: 'pt-BR', rate: BASE_RATE })
  }, [audio, active, step, steps])

  useEffect(() => {
    if (!active || !audio) Speech.stop()
    if (!audio) spoken.current = -1
  }, [active, audio])

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
        <AppText style={{ color: ON_DARK_SOFT, fontSize: size.small, textAlign: 'center', paddingHorizontal: 24 }}>
          {`Passo ${step + 1} de ${steps.length}. Ore em silêncio ou toque em Próximo quando quiser.`}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          <Pressable
            onPress={() => goToStep(step - 1)}
            disabled={step === 0}
            accessibilityRole="button"
            accessibilityLabel="Passo anterior"
            accessibilityState={{ disabled: step === 0 }}
            style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', opacity: step === 0 ? 0.4 : 1 }}
          >
            <Icon name="chevronLeft" size={22} color={ON_DARK} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            onPress={() => setActive((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={active ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={active ? 'pause' : 'play'} size={24} color={colors.primaryText} />
          </Pressable>
          <Pressable
            onPress={() => (step === steps.length - 1 ? setElapsed(total) : goToStep(step + 1))}
            accessibilityRole="button"
            accessibilityLabel={step === steps.length - 1 ? 'Concluir o momento' : 'Próximo passo'}
            style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevronRight" size={22} color={ON_DARK} strokeWidth={2.5} />
          </Pressable>
        </View>
        {/* Voz que lê cada passo: liga e desliga aqui, sem depender do que foi escolhido antes. */}
        <Pressable
          onPress={() => setAudio((v) => !v)}
          accessibilityRole="switch"
          accessibilityLabel="Ler cada passo em voz alta"
          accessibilityState={{ checked: audio }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: MIN_TOUCH, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}
        >
          <Icon name="volume" size={16} color={ON_DARK} />
          <AppText style={{ color: ON_DARK, fontSize: size.small, fontFamily: fonts.medium }}>{audio ? 'Voz ligada' : 'Voz desligada'}</AppText>
        </Pressable>
      </View>
    </View>
  )
}
