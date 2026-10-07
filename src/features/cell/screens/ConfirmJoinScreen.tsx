import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { AppText, Button, Page, SectionLabel } from '../../../components'
import { IS_REMOTE } from '../../../lib/supabase'
import { useTheme } from '../../../theme/ThemeProvider'
import { demoCell } from '../../onboarding/data'
import { useCell } from '../CellContext'
import { findCellByCode, type FoundCell } from '../sync'
import { InfoRow } from './parts'

/** Antes de pedir para entrar. O endereço completo só aparece depois da aprovação. */
export function ConfirmJoinScreen() {
  const { colors } = useTheme()
  const { requestJoin, cells } = useCell()
  const { codigo } = useLocalSearchParams<{ codigo?: string }>()
  // Com servidor, a tela busca a célula pelo código: o que aparece é sempre a célula em que a pessoa vai pedir para entrar.
  const [found, setFound] = useState<FoundCell | null>(IS_REMOTE ? null : demoCell)
  const already = cells.some((c) => c.id === 'c-central' || (!!codigo && c.code === codigo))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!IS_REMOTE || !codigo) return
    let alive = true
    findCellByCode(codigo).then((r) => {
      if (!alive) return
      if (r === 'invalid') setError('Código não encontrado. Confira com o líder.')
      else if (r === 'failed') setError('Não foi possível conferir o código. Confira a internet e tente de novo.')
      else setFound(r)
    })
    return () => {
      alive = false
    }
  }, [codigo])

  // O erro também é falado no iPhone, onde a região ao vivo não funciona.
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error)
  }, [error])

  return (
    <Page title="Confirmar entrada">
      {found ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 20, gap: 4 }}>
          <SectionLabel>Célula encontrada</SectionLabel>
          <AppText variant="title">{found.name}</AppText>
          {found.leader ? <InfoRow label="Líder" value={found.leader} /> : null}
          <InfoRow label="Dia e horário" value={found.when} />
          <InfoRow label="Bairro" value={found.neighborhood} />
        </View>
      ) : !error ? (
        <AppText variant="body" tone="secondary" accessibilityLiveRegion="polite">
          Procurando a célula
        </AppText>
      ) : null}
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
        disabled={already || !found}
        busy={busy}
        label={busy ? 'Enviando pedido' : 'Pedir para entrar'}
        onPress={async () => {
          setBusy(true)
          const r = await requestJoin(codigo)
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
