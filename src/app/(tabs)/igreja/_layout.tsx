import { Stack } from 'expo-router'
import { useTheme } from '../../../theme/ThemeProvider'

export default function IgrejaLayout() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
