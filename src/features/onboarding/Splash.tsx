import { useEffect } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { AppText } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'

export const SPLASH_MS = 2000

/** Primeira tela ao abrir: fundo na cor primária e o nome do app. Logo provisório, só tipografia. */
export function Splash({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme()
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.('App Cristão')
    const t = setTimeout(onDone, SPLASH_MS)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }} accessibilityViewIsModal>
      <AppText accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 34, color: colors.primaryText, letterSpacing: -0.5 }}>
        App Cristão
      </AppText>
    </View>
  )
}
