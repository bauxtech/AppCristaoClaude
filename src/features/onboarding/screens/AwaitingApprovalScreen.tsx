import { router } from 'expo-router'
import { AppText, Button, Card, Icon } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { demoCell } from '../data'
import { HeroIcon, OnboardingScaffold } from '../OnboardingScaffold'

/** Depois de pedir para entrar: a entrada depende do líder (regra decidida). */
export function AwaitingApprovalScreen() {
  const { colors } = useTheme()
  const { finishOnboarding } = useSession()
  return (
    <OnboardingScaffold
      title="Aguardando aprovação do líder"
      subtitle={`Seu pedido para entrar em ${demoCell.name} foi enviado para ${demoCell.leader}. Avisamos quando ele aprovar.`}
      hero={
        <HeroIcon>
          <Icon name="clock" size={28} color={colors.primary} />
        </HeroIcon>
      }
      footer={
        <Button
          label="Ir para o app"
          onPress={() => {
            finishOnboarding()
            router.replace('/celula')
          }}
        />
      }
    >
      <Card style={{ gap: 6 }}>
        <AppText variant="bodyStrong">Enquanto isso</AppText>
        <AppText variant="body" tone="secondary">
          Você já pode ler a Bíblia, orar e gravar cultos. Quando for aprovado, a célula aparece na aba Célula.
        </AppText>
      </Card>
    </OnboardingScaffold>
  )
}
