import { router } from 'expo-router'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Icon, MIN_TOUCH, useToast } from '../../../components'
import { AppleIcon, GoogleIcon } from '../../../components/BrandIcon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useOnboarding } from '../OnboardingContext'
import { useSession } from '../../../state/session'
import { IS_REMOTE, signOutRemote } from '../../../lib/supabase'
import { GOOGLE_READY, signInWithGoogle, signOutGoogle, type SocialResult } from '../../../lib/google'
import { APPLE_READY, signInWithApple } from '../../../lib/apple'
import { configureStore } from '../../../lib/store'
import { useAccountLoader } from '../useAccountLoader'
import { useState } from 'react'
import { OnboardingScaffold } from '../OnboardingScaffold'

type Provider = 'google' | 'apple'

const PROVIDER: Record<Provider, { with: string; noAccount: string; create: string }> = {
  google: { with: 'o Google', noAccount: 'Não achamos conta com esse Google', create: 'Criar conta com este Google' },
  apple: { with: 'a Apple', noAccount: 'Não achamos conta com essa Apple ID', create: 'Criar conta com esta Apple ID' },
}

function LoginOption({ label, icon, onPress, busy }: { label: string; icon: React.ReactNode; onPress: () => void; busy?: boolean }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        backgroundColor: colors.card,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon}
      <AppText variant="body" style={{ fontFamily: fonts.semibold, flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  )
}

export function LoginScreen() {
  const { colors } = useTheme()
  const { draft, setDraft } = useOnboarding()

  const login = draft.mode === 'login'
  const { finishOnboarding } = useSession()
  const accounts = useAccountLoader()
  const toast = useToast()
  const [busy, setBusy] = useState<Provider | null>(null)
  const [noAccount, setNoAccount] = useState<Provider | null>(null)

  /** Google ou Apple de verdade: o serviço confirma a pessoa e o banco abre ou cria a conta. */
  async function socialLogin(p: Provider) {
    if (busy) return
    setBusy(p)
    const r: SocialResult = p === 'google' ? await signInWithGoogle() : await signInWithApple()
    if (r === 'cancelled') return setBusy(null)
    if (r === 'failed') {
      setBusy(null)
      toast(`Não foi possível entrar com ${PROVIDER[p].with}. Tente de novo.`)
      return
    }
    setDraft({ social: true })
    configureStore(r.uid)
    const res = await accounts.load(r.uid, { ...(r.name ? { name: r.name } : {}), ...(r.email ? { email: r.email } : {}) })
    setBusy(null)
    if (res === 'no_account') {
      // Criar conta: segue o cadastro. Entrar: avisa antes, porque a pessoa pode ter conta pelo celular.
      if (login) return setNoAccount(p)
      setDraft({ mode: 'create', social: true })
      router.push('/termos')
    }
    if (res === 'failed') toast('Não foi possível carregar sua conta. Confira a internet e tente de novo.')
  }

  function createWithSocial() {
    setNoAccount(null)
    setDraft({ mode: 'create', social: true })
    router.push('/termos')
  }

  /** Desiste da conta nova: desfaz o login do Google ou da Apple para não ficar meio entrado. */
  function cancelSocial() {
    if (noAccount === 'google') void signOutGoogle()
    setNoAccount(null)
    setDraft({ social: false })
    void signOutRemote()
  }

  function social() {
    setDraft({ social: true })
    // Na prévia, quem entra com Google ou Apple já tem conta. Com o servidor, isso vem do login.
    if (login) {
      finishOnboarding()
      router.replace('/')
      return
    }
    router.push('/termos')
  }

  return (
    <OnboardingScaffold title={login ? 'Entrar' : 'Criar conta'} subtitle={login ? 'Como você quer acessar sua conta?' : 'Como você quer criar sua conta?'} onBack={() => router.back()}>
      <View style={{ gap: 12 }}>
        <LoginOption
          label="Número de celular, por SMS ou WhatsApp"
          icon={<Icon name="phone" size={22} color={colors.primary} />}
          onPress={() => {
            if (noAccount) cancelSocial()
            setDraft({ social: false })
            router.push('/celular')
          }}
        />
        {APPLE_READY ? (
          <LoginOption label={busy === 'apple' ? 'Entrando com Apple' : 'Entrar com Apple'} icon={<AppleIcon color={colors.text} />} busy={busy === 'apple'} onPress={() => void socialLogin('apple')} />
        ) : null}
        {GOOGLE_READY ? <LoginOption label={busy === 'google' ? 'Entrando com Google' : 'Entrar com Google'} icon={<GoogleIcon />} busy={busy === 'google'} onPress={() => void socialLogin('google')} /> : null}
        {/* Na prévia, sem servidor, Google e Apple só mostram o caminho. */}
        {IS_REMOTE ? null : (
          <>
            <LoginOption label="Entrar com Google" icon={<GoogleIcon />} onPress={social} />
            <LoginOption label="Entrar com Apple" icon={<AppleIcon color={colors.text} />} onPress={social} />
          </>
        )}
      </View>
      {noAccount ? (
        <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">{PROVIDER[noAccount].noAccount}</AppText>
          <AppText variant="small" tone="secondary">
            Se você se cadastrou pelo celular, entre pelo celular.
          </AppText>
          <Button label={PROVIDER[noAccount].create} size="sm" onPress={createWithSocial} />
          <Button label="Não criar conta" variant="text" size="sm" onPress={cancelSocial} />
        </Card>
      ) : null}
      <View style={{ gap: 4, alignItems: 'center' }}>
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          {login ? 'Ao entrar, você concorda com os documentos abaixo.' : 'Ao criar a conta, você concorda com os documentos abaixo.'}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <Button label="Termos de Uso" variant="text" size="sm" onPress={() => router.push('/termos-completos')} />
          <Button label="Dados de fé" variant="text" size="sm" onPress={() => router.push('/dados-de-fe')} />
        </View>
        <Button label="Perdi acesso ao meu número" variant="text" size="sm" onPress={() => router.push('/recuperar-conta')} />
      </View>
      {draft.viaInvite ? (
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          Depois de entrar, você pede para entrar na célula do convite.
        </AppText>
      ) : null}
    </OnboardingScaffold>
  )
}
