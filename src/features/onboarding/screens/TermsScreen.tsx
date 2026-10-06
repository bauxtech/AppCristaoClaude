import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Icon, SelectCard } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { missingConsents, type TermsState } from '../validation'
import { pushConsents } from '../../../lib/account'
import { useSettings } from '../../settings/SettingsContext'

/** Termos, consentimento separado para dados de fé (LGPD art. 11) e confirmação de 18 anos. */
export function TermsScreen() {
  const { colors } = useTheme()
  const { draft } = useOnboarding()
  const { setCellStatus } = useSession()
  const settings = useSettings()
  const [state, setState] = useState<TermsState>({ terms: false, faith: false, adult: false })
  const [missing, setMissing] = useState<string[]>([])

  function toggle(k: keyof TermsState) {
    setState((s) => ({ ...s, [k]: !s[k] }))
    setMissing([])
  }

  function next() {
    const m = missingConsents(state)
    setMissing(m)
    if (m.length) return
    pushConsents(state)
    settings.update({ faithConsent: state.faith })
    if (draft.viaInvite) {
      setCellStatus('pending')
      router.replace('/aguardando-aprovacao')
    } else {
      router.push('/nome')
    }
  }

  const underAge = missing.includes('confirmar que tem 18 anos ou mais')

  return (
    <OnboardingScaffold
      title="Termos e privacidade"
      subtitle="Leia e aceite para continuar."
      step="termos"
      onBack={() => router.back()}
      footer={<Button label={draft.viaInvite ? 'Aceitar e pedir para entrar' : 'Aceitar e continuar'} onPress={next} />}
    >
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <SelectCard kind="checkbox" label="Termos de Uso" description="Li e aceito os Termos de Uso do aplicativo." selected={state.terms} onPress={() => toggle('terms')} />
          <Button label="Ler os Termos completos" variant="text" size="sm" onPress={() => router.push('/termos-completos')} style={{ alignSelf: 'flex-start' }} />
        </View>
        <View style={{ gap: 4 }}>
          <SelectCard
            kind="checkbox"
            label="Dados de fé"
            description="Autorizo o uso dos meus dados religiosos (tradição, hábitos de leitura e oração) para personalizar minha experiência. Esses dados nunca são vendidos."
            selected={state.faith}
            onPress={() => toggle('faith')}
          />
          <Button label="Ler sobre os dados de fé" variant="text" size="sm" onPress={() => router.push('/dados-de-fe')} style={{ alignSelf: 'flex-start' }} />
        </View>
        <SelectCard kind="checkbox" label="Tenho 18 anos ou mais" selected={state.adult} onPress={() => toggle('adult')} />
      </View>

      {missing.length ? (
        <Card style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft, gap: 6 }} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="alert" size={18} color={colors.danger} />
            <AppText variant="bodyStrong" tone="danger">
              {missing.length === 1 ? 'Falta um passo' : 'Faltam alguns passos'}
            </AppText>
          </View>
          <AppText variant="body">{`Para continuar, é preciso ${joinList(missing)}.`}</AppText>
          {underAge ? (
            <AppText variant="body">Por enquanto, o App Cristão é só para maiores de 18 anos.</AppText>
          ) : null}
        </Card>
      ) : null}
    </OnboardingScaffold>
  )
}

function joinList(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}
