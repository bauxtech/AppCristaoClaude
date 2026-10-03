import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Card, Icon } from '../../../components'
import type { IconName } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { demoCell } from '../data'
import { useOnboarding } from '../OnboardingContext'
import { HeroIcon, OnboardingScaffold } from '../OnboardingScaffold'

/** Quem abre o app por um link de convite. Depois de entrar e aceitar os termos, pede para entrar na célula. */
export function InviteScreen() {
  const { colors } = useTheme()
  const { setDraft } = useOnboarding()

  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: 'user', label: 'Líder', value: demoCell.leader },
    { icon: 'calendarCheck', label: 'Encontros', value: demoCell.when },
    { icon: 'home', label: 'Bairro', value: demoCell.neighborhood },
  ]

  return (
    <OnboardingScaffold
      title={demoCell.name}
      hero={
        <View style={{ gap: 12 }}>
          <HeroIcon>
            <Icon name="people" size={28} color={colors.primary} />
          </HeroIcon>
          <AppText variant="body" tone="brand" style={{ fontFamily: fonts.semibold }}>
            Convite para célula
          </AppText>
        </View>
      }
      footer={
        <Button
          label="Entrar na célula"
          onPress={() => {
            setDraft({ viaInvite: true })
            router.push('/entrar')
          }}
        />
      }
    >
      <Card style={{ gap: 14 }}>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={r.icon} size={16} color={colors.primary} />
            </View>
            <View>
              <AppText variant="small" tone="secondary">
                {r.label}
              </AppText>
              <AppText variant="bodyStrong">{r.value}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="body" tone="secondary">
        Você foi convidado para participar desta célula. O líder aprova cada pessoa que entra.
      </AppText>
      <AppText variant="small" tone="secondary">
        7 dias grátis. Depois, R$ 00,00 por mês.
      </AppText>
    </OnboardingScaffold>
  )
}
