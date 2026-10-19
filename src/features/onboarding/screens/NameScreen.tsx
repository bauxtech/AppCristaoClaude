import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Button, Icon, SelectCard, Sheet, TextField, useToast } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { useSettings } from '../../settings/SettingsContext'
import { isValidEmail } from '../validation'

export function NameScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { profile, updateProfile } = useSession()
  const settings = useSettings()
  const [name, setName] = useState(profile.name)
  // Quem entrou pelo Google já vem com o e-mail.
  const [email, setEmail] = useState(profile.email ?? '')
  const [offers, setOffers] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)

  function next() {
    const mail = email.trim()
    if (mail && !isValidEmail(mail)) return setEmailError('Digite um e-mail válido, como nome@exemplo.com, ou deixe em branco.')
    updateProfile({ name: name.trim(), ...(mail ? { email: mail } : {}) })
    // Ofertas só com a autorização marcada. Por e-mail, só se a pessoa informou o e-mail.
    if (offers) settings.setOffers({ push: true, email: !!mail })
    router.push('/tradicao')
  }

  function photoAction(msg: string) {
    setSheet(false)
    toast(msg)
  }

  return (
    <OnboardingScaffold
      title="Como posso te chamar?"
      subtitle="Opcional. Você pode pular esta etapa."
      step="nome"
      onBack={() => router.back()}
      footer={
        <>
          <Button label="Continuar" onPress={next} />
          <Button label="Pular" variant="text" onPress={() => router.push('/tradicao')} style={{ alignSelf: 'center' }} />
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Pressable
          onPress={() => setSheet(true)}
          accessibilityRole="button"
          accessibilityLabel="Adicionar foto"
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.lineStrong,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="camera" size={28} color={colors.primary} />
        </Pressable>
        <Button label="Adicionar foto" variant="text" size="sm" onPress={() => setSheet(true)} />
      </View>
      <TextField label="Seu nome" value={name} onChangeText={setName} placeholder="Como você gosta de ser chamado" autoComplete="name" textContentType="name" />
      <TextField
        label="Seu e-mail (opcional)"
        value={email}
        onChangeText={(t) => (setEmail(t), setEmailError(null))}
        placeholder="nome@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={emailError ?? undefined}
      />
      <SelectCard
        kind="checkbox"
        label="Ofertas e novidades (opcional)"
        description="Aceito receber ofertas e novidades do acasa no celular e, se informei o e-mail, por e-mail. No máximo uma por semana. Desligo quando quiser em Configurações > Avisos."
        selected={offers}
        onPress={() => setOffers((v) => !v)}
      />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Foto de perfil">
        <Button label="Tirar foto" icon="camera" variant="soft" onPress={() => photoAction('A câmera entra quando o app estiver no celular')} />
        <Button label="Escolher da galeria" icon="image" variant="soft" onPress={() => photoAction('A galeria entra quando o app estiver no celular')} />
        <Button label="Remover foto" icon="trash" variant="outline" onPress={() => photoAction('Foto removida')} />
        <Button label="Cancelar" variant="text" onPress={() => setSheet(false)} style={{ alignSelf: 'center' }} />
      </Sheet>
    </OnboardingScaffold>
  )
}
