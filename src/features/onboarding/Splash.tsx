import { useEffect } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { Logo } from '../../components/Logo'
import { useTheme } from '../../theme/ThemeProvider'

export const SPLASH_MS = 2000

/** Primeira tela ao abrir: fundo na cor primária e o logotipo do site (21/10), em off-white. */
export function Splash({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme()
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.('acasa')
    const t = setTimeout(onDone, SPLASH_MS)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }} accessibilityViewIsModal>
      <View accessible accessibilityRole="header" accessibilityLabel="acasa">
        <Logo width={180} color={colors.primaryText} />
      </View>
    </View>
  )
}
