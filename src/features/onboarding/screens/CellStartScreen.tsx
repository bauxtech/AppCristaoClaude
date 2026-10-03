import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, SelectCard, TextField } from '../../../components'
import { useSession } from '../../../state/session'
import { DEMO_INVITE_CODE } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { normalizeInvite } from '../validation'

type Choice = 'join' | 'create' | 'later'

export function CellStartScreen() {
  const { finishOnboarding, setCellStatus } = useSession()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function start() {
    if (choice === 'join') {
      if (normalizeInvite(code) !== DEMO_INVITE_CODE) {
        setError('Código inválido ou vencido. Confira com quem te convidou.')
        return
      }
      setCellStatus('pending')
      router.replace('/aguardando-aprovacao')
      return
    }
    finishOnboarding()
    router.replace(choice === 'create' ? '/celula' : '/')
  }

  return (
    <OnboardingScaffold
      title="Célula"
      subtitle="A célula é o pequeno grupo que se reúne toda semana. Você pode entrar, criar ou deixar para depois."
      step="celula"
      onBack={() => router.back()}
      footer={<Button label="Começar" onPress={start} disabled={!choice} accessibilityHint={choice ? undefined : 'Escolha uma opção para começar'} />}
    >
      <View style={{ gap: 12 }}>
        <SelectCard kind="radio" label="Entrar por convite" description="Tenho um código ou link de convite." selected={choice === 'join'} onPress={() => setChoice('join')} />
        {choice === 'join' ? (
          <TextField
            label="Código do convite"
            value={code}
            onChangeText={(v) => {
              setCode(normalizeInvite(v))
              setError('')
            }}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            error={error || undefined}
            hint={`Na prévia, use ${DEMO_INVITE_CODE}.`}
          />
        ) : null}
        <SelectCard kind="radio" label="Criar uma célula" description="Quero liderar meu próprio grupo." selected={choice === 'create'} onPress={() => setChoice('create')} />
        <SelectCard kind="radio" label="Fazer isso depois" description="Entrar ou criar uma célula mais tarde." selected={choice === 'later'} onPress={() => setChoice('later')} />
      </View>
    </OnboardingScaffold>
  )
}
