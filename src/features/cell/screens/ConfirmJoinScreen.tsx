import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Page, SectionLabel } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { demoCell } from '../../onboarding/data'
import { useCell } from '../CellContext'
import { InfoRow } from './parts'

/** Antes de pedir para entrar. O endereço completo só aparece depois da aprovação. */
export function ConfirmJoinScreen() {
  const { colors } = useTheme()
  const { requestJoin, cells } = useCell()
  const params = useLocalSearchParams<{ codigo?: string; name?: string; leader?: string; when?: string; neighborhood?: string }>()
  // Com servidor, os dados vêm da busca pelo código. Na prévia, da célula de exemplo.
  const found = params.name ? { name: params.name, leader: params.leader ?? '', when: params.when ?? '', neighborhood: params.neighborhood ?? '' } : demoCell
  const already = cells.some((c) => c.id === 'c-central' || (!!params.codigo && c.code === params.codigo))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Page title="Confirmar entrada">
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 20, gap: 4 }}>
        <SectionLabel>Célula encontrada</SectionLabel>
        <AppText variant="title">{found.name}</AppText>
        <InfoRow label="Líder" value={found.leader} />
        <InfoRow label="Dia e horário" value={found.when} />
        <InfoRow label="Bairro" value={found.neighborhood} />
      </View>
      <AppText variant="body" tone="secondary">
        O líder recebe o seu pedido e aprova a entrada. O endereço aparece depois da aprovação.
      </AppText>
      {already ? (
        <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
          Você já participa desta célula.
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="body" accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button
        disabled={already || busy}
        label={busy ? 'Enviando pedido' : 'Pedir para entrar'}
        onPress={async () => {
          setBusy(true)
          const r = await requestJoin(params.codigo)
          setBusy(false)
          if (r === 'invalid') return setError('Este código não vale mais. Peça um novo ao líder.')
          if (r === 'failed') return setError('Não foi possível enviar o pedido. Confira a internet e tente de novo.')
          router.dismissTo('/celula')
        }}
      />
      <Button label="Cancelar" variant="outline" onPress={() => router.back()} />
    </Page>
  )
}
