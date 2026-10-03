import { View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts } from '../theme/typography'
import { AppText } from './AppText'

/** Inicial do nome num círculo. Decorativo: o nome sempre aparece ao lado. */
export function Avatar({ name, size = 40, strong }: { name: string; size?: number; strong?: boolean }) {
  const { colors } = useTheme()
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: strong ? colors.primary : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText style={{ color: strong ? colors.primaryText : colors.primary, fontFamily: fonts.semibold, fontSize: size * 0.38 }}>{name.trim().charAt(0).toUpperCase()}</AppText>
    </View>
  )
}
