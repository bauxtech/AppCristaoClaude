import { Redirect, Stack, useSegments } from 'expo-router'
import { OnboardingProvider } from '../../features/onboarding/OnboardingContext'
import { useSession } from '../../state/session'
import { useTheme } from '../../theme/ThemeProvider'

// Telas que continuam acessíveis depois do cadastro (textos legais).
const ALWAYS_OPEN = ['termos-completos', 'dados-de-fe']

export default function OnboardingLayout() {
  const { colors } = useTheme()
  const { onboarded } = useSession()
  const segments = useSegments()
  const current = segments[segments.length - 1] ?? ''
  if (onboarded && !ALWAYS_OPEN.includes(current)) return <Redirect href="/" />
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </OnboardingProvider>
  )
}
