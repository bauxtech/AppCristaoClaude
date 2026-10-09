import { router } from 'expo-router'
import { Pressable, View } from 'react-native'
import { AppText, Button, Icon, MIN_TOUCH, useToast } from '../../../components'
import { AppleIcon, GoogleIcon } from '../../../components/BrandIcon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useOnboarding } from '../OnboardingContext'
import { useSession } from '../../../state/session'
import { IS_REMOTE } from '../../../lib/supabase'
import { GOOGLE_READY, signInWithGoogle } from '../../../lib/google'
import { configureStore } from '../../../lib/store'
import { useAccountLoader } from '../useAccountLoader'
import { useState } from 'react'
import { OnboardingScaffold } from '../OnboardingScaffold'

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
  const [busy, setBusy] = useState(false)

  /** Google de verdade: o Google confirma a pessoa e o banco abre ou cria a conta. */
  async function google() {
    setBusy(true)
    const r = await signInWithGoogle()
    if (r === 'cancelled') return setBusy(false)
    if (r === 'failed') {
      setBusy(false)
      toast('Não foi possível entrar com o Google. Tente de novo.')
      return
    }
    setDraft({ social: true })
    configureStore(r.uid)
    const res = await accounts.load(r.uid, { ...(r.name ? { name: r.name } : {}), ...(r.email ? { email: r.email } : {}) })
    setBusy(false)
    // Entrou com Google sem ter conta: segue o cadastro, sem pedir de novo.
    if (res === 'no_account') {
      setDraft({ mode: 'create', social: true })
      router.push('/termos')
    }
    if (res === 'failed') toast('Não foi possível carregar sua conta. Confira a internet e tente de novo.')
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
            setDraft({ social: false })
            router.push('/celular')
          }}
        />
        {GOOGLE_READY ? <LoginOption label={busy ? 'Entrando com Google' : 'Entrar com Google'} icon={<GoogleIcon />} busy={busy} onPress={() => (busy ? undefined : void google())} /> : null}
        {/* Na prévia, sem servidor, Google e Apple só mostram o caminho. Apple chega com a versão do iPhone. */}
        {IS_REMOTE ? null : (
          <>
            <LoginOption label="Entrar com Google" icon={<GoogleIcon />} onPress={social} />
            <LoginOption label="Entrar com Apple" icon={<AppleIcon color={colors.text} />} onPress={social} />
          </>
        )}
      </View>
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
