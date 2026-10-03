import { router } from 'expo-router'
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
  const already = cells.some((c) => c.id === 'c-central')
  return (
    <Page title="Confirmar entrada">
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 20, gap: 4 }}>
        <SectionLabel>Célula encontrada</SectionLabel>
        <AppText variant="title">{demoCell.name}</AppText>
        <InfoRow label="Líder" value={demoCell.leader} />
        <InfoRow label="Dia e horário" value={demoCell.when} />
        <InfoRow label="Bairro" value={demoCell.neighborhood} />
      </View>
      <AppText variant="body" tone="secondary">
        O líder recebe o seu pedido e aprova a entrada. O endereço aparece depois da aprovação.
      </AppText>
      {already ? (
        <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
          Você já participa desta célula.
        </AppText>
      ) : null}
      <Button
        disabled={already}
        label="Pedir para entrar"
        onPress={() => {
          requestJoin()
          router.dismissTo('/celula')
        }}
      />
      <Button label="Cancelar" variant="outline" onPress={() => router.back()} />
    </Page>
  )
}
