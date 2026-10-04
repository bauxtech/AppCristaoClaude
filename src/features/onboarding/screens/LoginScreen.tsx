import { router } from 'expo-router'
import { Pressable, View } from 'react-native'
import { AppText, Button, Icon, MIN_TOUCH } from '../../../components'
import { AppleIcon, GoogleIcon } from '../../../components/BrandIcon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useOnboarding } from '../OnboardingContext'
import { useSession } from '../../../state/session'
import { OnboardingScaffold } from '../OnboardingScaffold'

function LoginOption({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
        <LoginOption label="Entrar com Google" icon={<GoogleIcon />} onPress={social} />
        <LoginOption label="Entrar com Apple" icon={<AppleIcon color={colors.text} />} onPress={social} />
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
