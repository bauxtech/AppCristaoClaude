import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { AppText, Button, Page, TextField } from '../../../components'
import { normalizeInvite } from '../../onboarding/validation'
import { checkInviteCode } from '../join'

export function JoinScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>()
  const [code, setCode] = useState(codigo ?? '')
  const [error, setError] = useState<string | undefined>()
  const clean = normalizeInvite(code)

  function submit() {
    const res = checkInviteCode(clean)
    if (res !== 'ok') return setError(res === 'expired' ? 'Este código venceu. Peça um novo ao líder.' : 'Código não encontrado. Confira com o líder.')
    router.push({ pathname: '/celula/confirmar', params: { codigo: clean } })
  }

  return (
    <Page title="Entrar com convite">
      <AppText variant="body" tone="secondary">
        Digite o código de 6 letras e números que o líder enviou para você.
      </AppText>
      <TextField
        label="Código da célula"
        value={clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean}
        onChangeText={(v) => {
          setCode(v)
          setError(undefined)
        }}
        placeholder="ABC-123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        error={error}
      />
      <Button label="Continuar" disabled={clean.length < 6} onPress={submit} />
      <Button label="Ler QR code" icon="qr" variant="outline" onPress={() => router.push('/celula/ler-qr')} />
    </Page>
  )
}
