import { Stack } from 'expo-router'
import { useTheme } from '../../theme/ThemeProvider'

export default function OracaoLayout() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
