import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Card, Icon, SelectCard } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { IS_REMOTE } from '../../../lib/supabase'

/** "Perdi acesso ao meu número": recuperar pelo e-mail ou pela conta Google ou Apple vinculada. */
export function RecoveryScreen() {
  const { colors } = useTheme()
  const [sent, setSent] = useState(false)

  return (
    <OnboardingScaffold title="Recuperar acesso" subtitle="Escolha como quer recuperar sua conta." onBack={() => router.back()}>
      <View style={{ gap: 12 }}>
        <SelectCard kind="radio" icon="mail" label="Recuperar por e-mail" description="Enviamos um link de acesso para o e-mail cadastrado." selected={sent} onPress={() => setSent(true)} />
        {/* Google e Apple ainda não estão ligados ao servidor: só aparecem na prévia. */}
        {IS_REMOTE ? null : (
          <>
            <SelectCard kind="radio" icon="user" label="Usar a conta Google" description="Entre com o Google vinculado à sua conta." selected={false} onPress={() => router.push('/bem-vindo-de-volta')} />
            <SelectCard kind="radio" icon="lock" label="Usar a conta Apple" description="Entre com o Apple ID vinculado à sua conta." selected={false} onPress={() => router.push('/bem-vindo-de-volta')} />
          </>
        )}
      </View>
      {sent ? (
        <Card style={{ flexDirection: 'row', gap: 10 }} accessibilityLiveRegion="polite">
          <Icon name="check" size={20} color={colors.primary} />
          <AppText variant="body" style={{ flex: 1 }}>
            Enviamos um link para o e-mail cadastrado. Abra no celular para entrar.
          </AppText>
        </Card>
      ) : null}
    </OnboardingScaffold>
  )
}
