import { Stack } from 'expo-router'
import { useTheme } from '../../theme/ThemeProvider'
import { AccessGuard } from '../../features/subscription/AccessGuard'

export default function OracaoLayout() {
  const { colors } = useTheme()
  return (
    <AccessGuard>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </AccessGuard>
  )
}
