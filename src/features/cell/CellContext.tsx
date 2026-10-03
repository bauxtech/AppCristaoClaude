import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import { newCell, sampleCell, type Cell, type CellType } from './data'
import type { CellRole } from './permissions'

interface CellState {
  cells: Cell[]
  currentId: string | null
}

interface CellValue {
  cells: Cell[]
  /** Célula aberta na aba. Nulo quando a pessoa não tem célula. */
  cell: Cell | null
  /** Muda a célula aberta com uma função que recebe a célula e devolve a nova. */
  update: (fn: (c: Cell) => Cell) => void
  createCell: (input: { name: string; type: CellType | null; day: number; time: string; address: string; reference: string; neighborhood: string }) => Cell
  /** Pede para entrar com um código. A entrada depende do líder. */
  requestJoin: () => void
  /** Só na prévia: o líder aprovou. */
  simulateApproval: (role?: CellRole) => void
  switchCell: (id: string) => void
  leaveCell: () => void
  /** Só na prévia: troca o papel da pessoa na célula aberta. */
  setMyRole: (role: CellRole) => void
}

const CellContext = createContext<CellValue | null>(null)

const statusFor = (c: Cell | null) => (c ? (c.myRole === 'lider' ? 'leader' : 'member') : 'none')

export function CellProvider({ children, initial }: { children: ReactNode; initial?: CellState }) {
  const { cellStatus, setCellStatus, profile } = useSession()
  const [state, setState] = useState<CellState>(() => initial ?? getItem<CellState>('cells', { cells: [], currentId: null }))

  useEffect(() => {
    if (!initial) setItem('cells', state)
  }, [state, initial])

  useDataReset((sample) => {
    if (sample) {
      const c = sampleCell('lider', profile.name)
      setState({ cells: [c], currentId: c.id })
      setCellStatus('leader')
    } else {
      setState({ cells: [], currentId: null })
      setCellStatus('none')
    }
  })

  // Quem já tem célula (primeiro acesso ou estado salvo) recebe a célula de exemplo.
  useEffect(() => {
    if ((cellStatus === 'member' || cellStatus === 'leader') && state.cells.length === 0) {
      const c = sampleCell(cellStatus === 'leader' ? 'lider' : 'membro', profile.name)
      setState({ cells: [c], currentId: c.id })
    }
    if (cellStatus === 'none' && state.cells.length > 0) setState({ cells: [], currentId: null })
  }, [cellStatus, state.cells.length, profile.name])

  const cell = state.cells.find((c) => c.id === state.currentId) ?? state.cells[0] ?? null

  const update = useCallback(
    (fn: (c: Cell) => Cell) =>
      setState((s) => {
        const id = s.currentId ?? s.cells[0]?.id
        return { ...s, cells: s.cells.map((c) => (c.id === id ? fn(c) : c)) }
      }),
    [],
  )

  const value = useMemo<CellValue>(
    () => ({
      cells: state.cells,
      cell,
      update,
      createCell: (input) => {
        const c = newCell(input, profile.name)
        setState((s) => ({ cells: [c, ...s.cells], currentId: c.id }))
        setCellStatus('leader')
        return c
      },
      requestJoin: () => {
        if (state.cells.length === 0) setCellStatus('pending')
      },
      simulateApproval: (role = 'membro') => {
        const c = sampleCell(role, profile.name)
        setState((s) => ({ cells: [...s.cells.filter((x) => x.id !== c.id), c], currentId: c.id }))
        setCellStatus(statusFor(c))
      },
      switchCell: (id) => {
        const c = state.cells.find((x) => x.id === id) ?? null
        setState((s) => ({ ...s, currentId: id }))
        setCellStatus(statusFor(c))
      },
      leaveCell: () => {
        const rest = state.cells.filter((c) => c.id !== cell?.id)
        setState({ cells: rest, currentId: rest[0]?.id ?? null })
        setCellStatus(statusFor(rest[0] ?? null))
      },
      setMyRole: (role) => {
        if (!cell) return
        const c = sampleCell(role, profile.name)
        setState((s) => ({ ...s, cells: s.cells.map((x) => (x.id === cell.id ? { ...c, id: cell.id } : x)) }))
        setCellStatus(statusFor(c))
      },
    }),
    [state, cell, update, profile.name, setCellStatus],
  )

  return <CellContext.Provider value={value}>{children}</CellContext.Provider>
}

export function useCell() {
  const v = useContext(CellContext)
  if (!v) throw new Error('useCell fora do CellProvider')
  return v
}

export function memberName(cell: Cell, id: string | null | undefined) {
  if (!id) return null
  const m = cell.members.find((x) => x.id === id)
  if (!m) return null
  return m.isMe ? `${m.name} (você)` : m.name
}

export function me(cell: Cell) {
  return cell.members.find((m) => m.isMe)!
}
