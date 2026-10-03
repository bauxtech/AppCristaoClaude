import type { ReactNode } from 'react'
import { AppText, Page } from '../../../components'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { can, type CellAction } from '../permissions'

/** Mostra a tela só para quem tem a permissão. Quem não tem vê o motivo. */
export function CellGuard({ title, action, children }: { title: string; action?: CellAction; children: (cell: Cell) => ReactNode }) {
  const { cell } = useCell()
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
  return <>{children(cell)}</>
}

const NO_ACCESS: Partial<Record<CellAction, string>> = {
  participate: 'Como visitante, você vê a reunião, o endereço e o roteiro.',
  seePrayers: 'Os pedidos de oração da célula aparecem só para os membros.',
  markAttendance: 'Só o líder e o auxiliar marcam presença.',
  editSchedule: 'Só o líder e o auxiliar editam a escala.',
  editCell: 'Só o líder edita a célula.',
  seeHistory: 'Só o líder vê o histórico da célula.',
}
