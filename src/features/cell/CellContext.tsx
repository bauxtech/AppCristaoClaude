import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { enqueue, flush, pendingOps, syncEnabled, useUserId } from '../../lib/sync'
import { isUuid, uuid } from '../../lib/uuid'
import { setMemberNameLookup } from '../prayer/sync'
import { setCurrentCellId } from './current'
import { cellDiffOps, createCellOps, pullCells, requestJoinRemote, withIds } from './sync'
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
  /** Pede para entrar com um código. A entrada depende do líder. Com servidor, devolve o resultado do pedido. */
  requestJoin: (code?: string) => Promise<'ok' | 'invalid' | 'failed'>
  /** Traz a célula de novo do banco (ao abrir a aba). Sem servidor, não faz nada. */
  refresh: () => Promise<void>
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
  const { cellStatus, setCellStatus, profile, sampleData } = useSession()
  const [state, setState] = useState<CellState>(() => initial ?? getItem<CellState>('cells', { cells: [], currentId: null }))
  // Com servidor: a célula vem do banco e cada mudança vai para lá. Dados de exemplo não vão.
  const remote = syncEnabled() && !initial
  const current = useRef(state)
  current.current = state
  const sample = useRef(sampleData)
  sample.current = sampleData

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

  // Prévia sem servidor: quem já tem célula (primeiro acesso ou estado salvo) recebe a célula de exemplo.
  useEffect(() => {
    if (remote) return
    if ((cellStatus === 'member' || cellStatus === 'leader') && state.cells.length === 0) {
      const c = sampleCell(cellStatus === 'leader' ? 'lider' : 'membro', profile.name)
      setState({ cells: [c], currentId: c.id })
    }
    if (cellStatus === 'none' && state.cells.length > 0) setState({ cells: [], currentId: null })
  }, [cellStatus, state.cells.length, profile.name])

  const cell = state.cells.find((c) => c.id === state.currentId) ?? state.cells[0] ?? null
  useEffect(() => setCurrentCellId(cell && isUuid(cell.id) ? cell.id : null), [cell?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Nomes dos colegas, para "quem orou por você" nos pedidos.
  useEffect(() => setMemberNameLookup((id) => state.cells.flatMap((c) => c.members).find((m) => m.id === id)?.name ?? null), [state.cells])

  const update = useCallback(
    (fn: (c: Cell) => Cell) => {
      const s = current.current
      const id = s.currentId ?? s.cells[0]?.id
      const prev = s.cells.find((c) => c.id === id)
      if (!prev) return
      const next = withIds(prev, fn(prev))
      if (next === prev) return
      const nextState = { ...s, cells: s.cells.map((c) => (c.id === id ? next : c)) }
      current.current = nextState
      setState(nextState)
      if (remote && !sample.current) enqueue(...cellDiffOps(prev, next))
    },
    [remote],
  )

  // Traz do banco as células de quem está logado. Se há mudança esperando envio, o aparelho fica à frente.
  const uid = useUserId()
  const refresh = useCallback(async () => {
    if (!remote || !uid || sample.current) return
    await flush().catch(() => {})
    if (pendingOps().length) return
    const res = await pullCells(uid, current.current.cells).catch(() => null)
    if (!res || pendingOps().length) return
    const keep = current.current.currentId
    const nextState = { cells: res.cells, currentId: res.cells.some((c) => c.id === keep) ? keep : (res.cells[0]?.id ?? null) }
    current.current = nextState
    setState(nextState)
    const open = res.cells.find((c) => c.id === nextState.currentId) ?? null
    setCellStatus(open ? statusFor(open) : res.pending ? 'pending' : 'none')
  }, [remote, uid, setCellStatus])
  useEffect(() => {
    void refresh()
  }, [refresh, sampleData])

  const value = useMemo<CellValue>(
    () => ({
      cells: state.cells,
      cell,
      update,
      createCell: (input) => {
        const base = newCell(input, profile.name)
        // Com servidor: id em uuid, criado pela função do banco; a escala padrão vai junto.
        const c = remote ? withIds(null, { ...base, id: uuid() }) : base
        const nextState = { cells: [c, ...current.current.cells], currentId: c.id }
        current.current = nextState
        setState(nextState)
        setCellStatus('leader')
        if (remote && !sample.current) {
          enqueue(...createCellOps(c))
          // O código de convite é criado pelo banco: traz de volta depois de enviar.
          void flush().then(refresh)
        }
        return c
      },
      requestJoin: async (code) => {
        if (remote && code) {
          const r = await requestJoinRemote(code)
          if (r === 'ok' && state.cells.length === 0) setCellStatus('pending')
          return r
        }
        if (state.cells.length === 0) setCellStatus('pending')
        return 'ok'
      },
      refresh,
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
        if (remote && cell && isUuid(cell.id) && !sample.current) enqueue({ kind: 'delete', table: 'cell_members', match: { cell_id: cell.id, user_id: '$uid' } })
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
    [state, cell, update, profile.name, setCellStatus, remote, refresh],
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
