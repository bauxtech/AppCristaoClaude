import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { usePrayer } from '../PrayerContext'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Polyline } from 'react-native-svg'
import { AppText, MIN_TOUCH } from '../../../components'
import { palettes } from '../../../theme/colors'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts, size } from '../../../theme/typography'

const ON_DARK = '#FFFFFF'
const ON_DARK_SOFT = 'rgba(255,255,255,0.78)'

export function GuidedEndScreen() {
  const t = useTheme()
  const colors = { ...palettes[t.highContrast ? 'highContrastDark' : 'dark'], darkSurface: t.colors.darkSurface }
  const insets = useSafeAreaInsets()
  const { min } = useLocalSearchParams<{ min: string }>()
  const { markPrayedToday } = usePrayer()
  useEffect(() => markPrayedToday(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: colors.darkSurface, paddingTop: insets.top, paddingBottom: insets.bottom + 24, paddingHorizontal: 32, justifyContent: 'center', gap: 24 }}>
      <View style={{ alignItems: 'center' }}>
        <Svg width={96} height={96} viewBox="0 0 96 96" accessible={false}>
          <Circle cx={48} cy={48} r={44} fill={colors.primary} opacity={0.18} />
          <Circle cx={48} cy={48} r={32} fill={colors.primary} />
          <Polyline points="34 48 44 58 64 36" stroke={colors.primaryText} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <AppText accessibilityRole="header" style={{ color: ON_DARK, fontFamily: fonts.semibold, fontSize: size.screenTitle }}>
          Parabéns!
        </AppText>
        <AppText style={{ color: ON_DARK, textAlign: 'center' }}>{`Você completou ${min ?? 5} min de oração`}</AppText>
        <AppText style={{ color: ON_DARK_SOFT, fontSize: size.small, textAlign: 'center' }}>Que esse momento renove sua fé</AppText>
      </View>
      <View style={{ gap: 12, marginTop: 8 }}>
        <DarkButton label="Escrever no diário" bg={colors.primary} fg={colors.primaryText} onPress={() => router.replace({ pathname: '/oracao/diario', params: { novo: '1' } })} />
        <DarkButton label="Fechar" bg="rgba(255,255,255,0.14)" fg={ON_DARK} border="rgba(255,255,255,0.6)" onPress={() => router.dismissTo('/oracao')} />
      </View>
    </View>
  )
}

function DarkButton({ label, bg, fg, border, onPress }: { label: string; bg: string; fg: string; border?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: MIN_TOUCH + 4, borderRadius: 16, backgroundColor: bg, borderWidth: border ? 1 : 0, borderColor: border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <AppText style={{ color: fg, fontFamily: fonts.semibold }}>{label}</AppText>
    </Pressable>
  )
}
