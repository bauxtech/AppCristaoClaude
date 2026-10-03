import { View, type ViewProps } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

/** Cartão do protótipo: canto 16, borda fina, fundo de cartão, respiro de 20. */
export function Card({ style, children, ...rest }: ViewProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 20 },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
