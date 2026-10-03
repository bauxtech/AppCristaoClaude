import { router } from 'expo-router'
import { Button, Icon } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { DEMO_EXISTING_PHONE } from '../data'
import { HeroIcon, OnboardingScaffold } from '../OnboardingScaffold'

/** Quem já tem conta entra e vai direto para o Hoje, sem refazer o cadastro. */
export function WelcomeBackScreen() {
  const { colors } = useTheme()
  const { finishOnboarding, updateProfile } = useSession()
  return (
    <OnboardingScaffold
      title={`Bem-vindo de volta, ${DEMO_EXISTING_PHONE.name}`}
      subtitle="Que bom ter você aqui de novo. Continue de onde parou."
      hero={
        <HeroIcon>
          <Icon name="heart" size={28} color={colors.primary} />
        </HeroIcon>
      }
      footer={
        <Button
          label="Continuar"
          onPress={() => {
            updateProfile({ name: DEMO_EXISTING_PHONE.name })
            finishOnboarding()
            router.replace('/')
          }}
        />
      }
    >
      {null}
    </OnboardingScaffold>
  )
}
