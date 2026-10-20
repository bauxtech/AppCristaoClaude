import { View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

interface Props {
  value: number
  max: number
  /** Texto falado, por exemplo "Dia 34 de 90". */
  label: string
}

export function ProgressBar({ value, max, label }: Props) {
  const { colors, highContrast } = useTheme()
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value, text: label }}
      // No alto contraste o trilho fica claro com borda, para a parte cheia se destacar dele.
      style={{ height: highContrast ? 8 : 6, borderRadius: 4, backgroundColor: highContrast ? colors.card : colors.line, borderWidth: highContrast ? 1 : 0, borderColor: colors.lineStrong, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: colors.primary }} />
    </View>
  )
}
