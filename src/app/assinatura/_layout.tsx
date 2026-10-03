import { Stack } from 'expo-router'
import { useTheme } from '../../theme/ThemeProvider'
import { AccessGuard } from '../../features/subscription/AccessGuard'

export default function Layout() {
  const { colors } = useTheme()
  return (
    <AccessGuard openWhenBlocked={'all'}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </AccessGuard>
  )
}
