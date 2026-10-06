import { router } from 'expo-router'
import { Button, Icon } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { IS_REMOTE } from '../../../lib/supabase'
import { DEMO_EXISTING_PHONE } from '../data'
import { HeroIcon, OnboardingScaffold } from '../OnboardingScaffold'

/** Quem já tem conta entra e vai direto para o Hoje, sem refazer o cadastro. */
export function WelcomeBackScreen() {
  const { colors } = useTheme()
  const { finishOnboarding, updateProfile, profile } = useSession()
  // Com o servidor, o nome já veio do banco na tela do código. Na prévia, usa o nome de exemplo.
  const name = IS_REMOTE ? profile.name : DEMO_EXISTING_PHONE.name
  return (
    <OnboardingScaffold
      title={name ? `Bem-vindo de volta, ${name.split(' ')[0]}` : 'Bem-vindo de volta'}
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
            if (!IS_REMOTE) updateProfile({ name: DEMO_EXISTING_PHONE.name })
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
