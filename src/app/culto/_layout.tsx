import { Stack } from 'expo-router'
import { useTheme } from '../../theme/ThemeProvider'

export default function CultoLayout() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="ao-vivo" options={{ gestureEnabled: false }} />
    </Stack>
  )
}
