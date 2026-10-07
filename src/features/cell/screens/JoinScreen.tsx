import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { AppText, Button, Page, TextField } from '../../../components'
import { normalizeInvite } from '../../onboarding/validation'
import { IS_REMOTE } from '../../../lib/supabase'
import { checkInviteCode } from '../join'
import { findCellByCode } from '../sync'

export function JoinScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>()
  const [code, setCode] = useState(codigo ?? '')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error)
  }, [error])
  const clean = normalizeInvite(code)

  async function submit() {
    if (IS_REMOTE) {
      // O banco devolve só nome, líder, dia e bairro. O endereço aparece depois da aprovação.
      setBusy(true)
      const found = await findCellByCode(clean)
      setBusy(false)
      if (found === 'invalid') return setError('Código não encontrado. Confira com o líder.')
      if (found === 'failed') return setError('Não foi possível conferir o código. Confira a internet e tente de novo.')
      router.push({ pathname: '/celula/confirmar', params: { codigo: clean } })
      return
    }
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
      <Button label={busy ? 'Conferindo o código' : 'Continuar'} disabled={clean.length < 6} busy={busy} onPress={submit} />
      <Button label="Ler QR code" icon="qr" variant="outline" onPress={() => router.push('/celula/ler-qr')} />
    </Page>
  )
}
