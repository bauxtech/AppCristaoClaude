import { useEffect, useRef, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, View } from 'react-native'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useConnection } from '../state/connection'
import { useTheme } from '../theme/ThemeProvider'
import { fonts } from '../theme/typography'
import { AppText } from './AppText'
import { Button } from './Button'
import { Card } from './Card'
import { Icon } from './Icon'

export const OFFLINE_TEXT = 'Sem internet. Bíblia, notas e plano de leitura continuam funcionando'

/**
 * Faixa no topo de todas as telas quando não há internet, e "Sincronizando" quando volta.
 * As telas de baixo recebem a margem do topo já descontada, para a faixa não cobrir nada.
 */
export function ConnectionFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { online, syncing } = useConnection()
  const show = !online || syncing
  const text = !online ? OFFLINE_TEXT : 'Sincronizando'

  useEffect(() => {
    if (show) AccessibilityInfo.announceForAccessibility?.(text)
  }, [show, text])

  return (
    <View style={{ flex: 1 }}>
      {show ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ paddingTop: insets.top + 6, paddingBottom: 6, paddingHorizontal: 16, backgroundColor: online ? colors.primary : colors.darkSurface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Icon name={online ? 'clock' : 'alert'} size={14} color="#FFFFFF" />
          <AppText variant="small" style={{ color: '#FFFFFF', fontFamily: fonts.medium, textAlign: 'center', flexShrink: 1 }}>
            {text}
          </AppText>
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={show ? { ...insets, top: 0 } : insets}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  )
}

/** Mensagem curta de erro com "Tentar de novo". */
export function ErrorState({ message = 'Não foi possível carregar.', onRetry }: { message?: string; onRetry: () => void }) {
  const { colors } = useTheme()
  return (
    <Card style={{ gap: 10, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Icon name="alert" size={18} color={colors.danger} />
        <AppText variant="bodyStrong">{message}</AppText>
      </View>
      <AppText variant="small" tone="secondary">
        Confira a internet e tente de novo.
      </AppText>
      <Button label="Tentar de novo" size="sm" onPress={onRetry} />
    </Card>
  )
}

/** Bloco cinza pulsando no lugar do conteúdo que está chegando. */
export function SkeletonBlock({ height = 16, width = '100%', radius = 8 }: { height?: number; width?: number | `${number}%`; radius?: number }) {
  const { colors } = useTheme()
  const op = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(op, { toValue: 0.5, duration: 700, useNativeDriver: true })]))
    loop.start()
    return () => loop.stop()
  }, [op])
  return <Animated.View style={{ height, width, borderRadius: radius, backgroundColor: colors.line, opacity: op }} />
}

/** Esqueleto de cartão, para listas e cartões que ainda estão carregando. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card style={{ gap: 10 }} accessible accessibilityLabel="Carregando">
      <SkeletonBlock height={12} width="40%" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </Card>
  )
}
