import { newCell, sampleCell, type Cell } from '../src/features/cell/data'
import { cellDiffOps, createCellOps, withIds } from '../src/features/cell/sync'
import { uuid } from '../src/lib/uuid'

const now = new Date(2026, 9, 6, 12, 0, 0)
const BETO = uuid()
const CAIO = uuid()
const FABI = uuid()

/** Célula do banco: id uuid, a pessoa como líder ('me') e dois membros. */
function base(): Cell {
  const c = newCell({ name: 'Jovens', type: 'Jovens', day: 3, time: '20:00', address: 'Rua A, 1', reference: '', neighborhood: 'Centro' }, 'Ana')
  return withIds(null, {
    ...c,
    id: uuid(),
    members: [
      ...c.members,
      { id: BETO, name: 'Beto', role: 'membro', phone: '', since: '', active: true, lastAttendance: [] },
      { id: CAIO, name: 'Caio', role: 'auxiliar', phone: '', since: '', active: true, lastAttendance: [] },
    ],
    pendingJoins: [{ id: FABI, name: 'Fabi', phone: '', requestedAt: '' }],
  })
}

test('célula de exemplo (id provisório) nunca vai para o banco', () => {
  const c = sampleCell('lider', 'Ana')
  expect(cellDiffOps(c, { ...c, name: 'Outro nome' })).toEqual([])
})

test('líder muda dados, roteiro e tamanho máximo numa chamada só', () => {
  const a = base()
  const b = { ...a, name: 'Jovens da Central', planTitle: 'Propósito', planRef: 'João 15', plan: [{ id: 'p1', title: 'Louvor', content: '', minutes: 10 }], maxSize: 15 }
  expect(cellDiffOps(a, b)).toEqual([
    { kind: 'update', table: 'cells', values: { name: 'Jovens da Central', max_size: 15, plan: { title: 'Propósito', ref: 'João 15', sections: b.plan } }, match: { id: a.id } },
  ])
})

test('aprovar entrada vira membro aprovado; recusar marca como recusado', () => {
  const a = base()
  const approved = { ...a, pendingJoins: [], members: [...a.members, { id: FABI, name: 'Fabi', role: 'membro' as const, phone: '', since: '', active: true, lastAttendance: [] }] }
  expect(cellDiffOps(a, approved, now)).toEqual([
    { kind: 'update', table: 'cell_members', values: { status: 'approved', role: 'membro', joined_at: now.toISOString() }, match: { cell_id: a.id, user_id: FABI } },
  ])
  expect(cellDiffOps(a, { ...a, pendingJoins: [] })).toEqual([{ kind: 'update', table: 'cell_members', values: { status: 'rejected' }, match: { cell_id: a.id, user_id: FABI } }])
})

test('passar a liderança vai pela função do banco; mudar papel de outro é update', () => {
  const a = base()
  const transfer = { ...a, myRole: 'membro' as const, members: a.members.map((m) => (m.isMe ? { ...m, role: 'membro' as const } : m.id === BETO ? { ...m, role: 'lider' as const } : m)) }
  expect(cellDiffOps(a, transfer)).toEqual([{ kind: 'rpc', fn: 'transfer_leadership', args: { p_cell: a.id, p_new_leader: BETO } }])
  const promote = { ...a, members: a.members.map((m) => (m.id === BETO ? { ...m, role: 'anfitriao' as const } : m)) }
  expect(cellDiffOps(a, promote)).toEqual([{ kind: 'update', table: 'cell_members', values: { role: 'anfitriao' }, match: { cell_id: a.id, user_id: BETO } }])
})

test('presença vai pela função do banco, com a pessoa como $uid', () => {
  const a = base()
  const b = {
    ...a,
    history: { ...a.history, meetings: a.history.meetings + 1 },
    members: a.members.map((m) => ({ ...m, lastAttendance: [...m.lastAttendance, m.id !== CAIO] })),
  }
  const ops = cellDiffOps(a, b, now)
  expect(ops).toHaveLength(1)
  expect(ops[0]).toMatchObject({ kind: 'rpc', fn: 'mark_attendance', args: { p_cell: a.id, p_present: { $uid: true, [BETO]: true, [CAIO]: false } } })
})

test('escala: trocar quem faz a função atualiza a linha pelo id', () => {
  const a = base()
  const row = a.schedule[0]
  const b = { ...a, schedule: a.schedule.map((s, i) => (i === 0 ? { ...s, memberId: 'me' } : s)) }
  expect(cellDiffOps(a, b)).toEqual([{ kind: 'upsert', table: 'cell_schedule', row: { id: row.id, cell_id: a.id, role_name: row.role, member_id: '$uid' } }])
})

test('mural, carona, pedido de carona e "orei por você" saem com o id de quem está logado', () => {
  const a = { ...base(), prayers: [{ id: uuid(), memberId: BETO, text: 'Saúde', prayedCount: 0, at: '2026-10-06' }] }
  const rideId = uuid()
  const withRide = { ...a, rides: [{ id: rideId, driverId: BETO, from: 'Centro', seats: 3, requests: [] }] }
  const b = withIds(withRide, {
    ...withRide,
    board: [{ id: 'b123', authorId: 'me', text: 'Retiro dia 22', at: '2026-10-06' }],
    rides: [{ ...withRide.rides[0], requests: [{ memberId: 'me', status: 'pending' as const }] }],
    prayers: a.prayers.map((p) => ({ ...p, iPrayed: true })),
  })
  const ops = cellDiffOps(withRide, b)
  expect(ops.map((o) => (o.kind === 'rpc' ? o.fn : `${o.kind}:${o.table}`))).toEqual(['upsert:cell_board', 'upsert:ride_requests', 'upsert:prayer_prayed'])
  expect(ops[0]).toMatchObject({ row: { author_id: '$uid', text: 'Retiro dia 22' } })
  expect((ops[0] as unknown as { row: { id: string } }).row.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(ops[1]).toMatchObject({ row: { ride_id: rideId, user_id: '$uid', status: 'pending' } })
})

test('motorista aceita o pedido; troca de escala pedida e aprovada', () => {
  const a = base()
  const rideId = uuid()
  const r1 = { ...a, rides: [{ id: rideId, driverId: 'me', from: 'Centro', seats: 2, requests: [{ memberId: BETO, status: 'pending' as const }] }] }
  const r2 = { ...r1, rides: [{ ...r1.rides[0], requests: [{ memberId: BETO, status: 'accepted' as const }] }] }
  expect(cellDiffOps(r1, r2)).toEqual([{ kind: 'update', table: 'ride_requests', values: { status: 'accepted' }, match: { ride_id: rideId, user_id: BETO } }])

  const swapId = uuid()
  const s1 = { ...a, swaps: [{ id: swapId, fromId: 'me', toId: BETO, role: a.schedule[2].role, date: '', status: 'pending' as const }] }
  expect(cellDiffOps(a, s1)[0]).toMatchObject({ kind: 'upsert', table: 'cell_swaps', row: { schedule_id: a.schedule[2].id, from_id: '$uid', to_id: BETO } })
  const s2 = { ...s1, swaps: [{ ...s1.swaps[0], status: 'approved' as const }] }
  expect(cellDiffOps(s1, s2)).toEqual([{ kind: 'update', table: 'cell_swaps', values: { status: 'accepted' }, match: { id: swapId } }])
})

test('denunciar esconde o conteúdo também no banco', () => {
  const a = { ...base(), prayers: [{ id: uuid(), memberId: BETO, text: 'x', prayedCount: 0, at: '' }] }
  const b = { ...a, hidden: [a.prayers[0].id] }
  expect(cellDiffOps(a, b)).toEqual([{ kind: 'upsert', table: 'hidden_content', row: { user_id: '$uid', target_type: 'prayer', target_id: a.prayers[0].id } }])
})

test('criar célula: primeiro a função do banco, depois a escala padrão', () => {
  const c = base()
  const ops = createCellOps(c)
  expect(ops[0]).toMatchObject({ kind: 'rpc', fn: 'create_cell', args: { p_id: c.id, p_name: 'Jovens' } })
  expect(ops[1]).toEqual({ kind: 'update', table: 'cells', values: { max_size: c.maxSize }, match: { id: c.id } })
  expect(ops.slice(2).every((o) => o.kind === 'upsert' && o.table === 'cell_schedule')).toBe(true)
  expect(ops).toHaveLength(2 + c.schedule.length)
})
