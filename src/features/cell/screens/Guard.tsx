import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { AppText, Button, Icon, Page } from '../../../components'
import { useSubscription } from '../../subscription/SubscriptionContext'
import { useTheme } from '../../../theme/ThemeProvider'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { can, type CellAction } from '../permissions'

/** Texto do cadeado de quem está na célula sem plano e sem vaga. */
export const SEATLESS_LINE = 'Peça uma vaga ao líder ou assine o plano Essencial'

/**
 * Mostra a tela só para quem tem a permissão. Quem não tem vê o motivo.
 * needsSeat: pedidos, escala e avisos. Membro sem plano e sem vaga vê o cadeado.
 */
export function CellGuard({ title, action, needsSeat, children }: { title: string; action?: CellAction; needsSeat?: boolean; children: (cell: Cell) => ReactNode }) {
  const { cell } = useCell()
  const sub = useSubscription()
  if (!cell) {
    return (
      <Page title={title}>
        <AppText variant="body">Você não participa de nenhuma célula.</AppText>
      </Page>
    )
  }
  if (action && !can(cell.myRole, action)) {
    return (
      <Page title={title}>
        <AppText variant="body">{NO_ACCESS[action] ?? 'Você não tem acesso a esta parte da célula.'}</AppText>
      </Page>
    )
  }
  if (needsSeat && sub.cellSeatless(cell.id)) return <SeatLocked title={title} />
  return <>{children(cell)}</>
}

function SeatLocked({ title }: { title: string }) {
  const { colors } = useTheme()
  return (
    <Page title={title}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={30} color={colors.primary} />
        </View>
        <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {`${SEATLESS_LINE}.`}
        </AppText>
      </View>
      <Button label="Ver plano Essencial" onPress={() => router.push('/assinatura?plano=essencial' as '/assinatura')} />
      <Button label="Voltar" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/celula'))} />
    </Page>
  )
}

const NO_ACCESS: Partial<Record<CellAction, string>> = {
  participate: 'Como visitante, você vê a reunião, o endereço e o roteiro.',
  seePrayers: 'Os pedidos de oração da célula aparecem só para os membros.',
  markAttendance: 'Só o líder e o auxiliar marcam presença.',
  editSchedule: 'Só o líder e o auxiliar editam a escala.',
  editCell: 'Só o líder edita a célula.',
  seeHistory: 'Só o líder vê o histórico da célula.',
}
