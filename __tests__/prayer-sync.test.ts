import { uuid } from '../src/lib/uuid'
import { mergePrayer, prayerDiffOps, type SyncedPrayer } from '../src/features/prayer/sync'

const empty: SyncedPrayer = { diary: [], requests: [], campaigns: [] }
const now = new Date(2026, 9, 6, 15, 0, 0)

test('pedido novo vai com id, título, texto e data; o vídeo fica no aparelho', () => {
  const id = uuid()
  const r = { id, title: 'Viagem', text: 'Proteção na viagem', createdAt: '2026-10-06', shared: false, prayedBy: [], videoUri: 'file:///v.mp4' }
  const ops = prayerDiffOps(empty, { ...empty, requests: [r] }, now)
  expect(ops).toEqual([
    { kind: 'upsert', table: 'prayer_requests', row: { id, user_id: '$uid', title: 'Viagem', text: 'Proteção na viagem', answered_at: null, testimony: null, shared_cell_id: null, created_at: now.toISOString() } },
  ])
})

test('pedido compartilhado vai para a célula aberta; sem célula, fica só da pessoa', () => {
  const r = { id: uuid(), title: 'A', text: 'A', createdAt: '2026-10-06', shared: true, prayedBy: [] }
  const cell = uuid()
  const row = (c: string | null) => (prayerDiffOps(empty, { ...empty, requests: [r] }, now, c)[0] as { row: Record<string, unknown> }).row
  expect(row(cell).shared_cell_id).toBe(cell)
  expect(row(null).shared_cell_id).toBeNull()
})

test('marcar como respondido manda a data e o testemunho; apagar manda só o id da própria pessoa', () => {
  const id = uuid()
  const r = { id, title: 'Emprego', text: 'Emprego', createdAt: '2026-10-01', shared: false, prayedBy: [] }
  const a = { ...empty, requests: [r] }
  const b = { ...empty, requests: [{ ...r, answeredAt: '2026-10-06', testimony: 'Foi contratado' }] }
  const row = (prayerDiffOps(a, b, now)[0] as { row: Record<string, unknown> }).row
  expect(row).toMatchObject({ answered_at: '2026-10-06', testimony: 'Foi contratado' })
  expect(prayerDiffOps(a, empty)).toEqual([{ kind: 'delete', table: 'prayer_requests', match: { id, user_id: '$uid' } }])
})

test('diário e campanha também vão para o banco', () => {
  const d = { id: uuid(), date: '2026-10-06', text: 'Agradeci pelo dia' }
  const c = { id: uuid(), name: '21 dias', type: 'Oração' as const, start: '2026-10-01', end: '2026-10-21', doneDays: [1, 2] }
  const ops = prayerDiffOps(empty, { ...empty, diary: [d], campaigns: [c] }, now)
  expect(ops.map((o) => o.table)).toEqual(['prayer_diary', 'prayer_campaigns'])
  expect((ops[1] as { row: Record<string, unknown> }).row).toEqual({ id: c.id, user_id: '$uid', name: '21 dias', type: 'Oração', start_date: '2026-10-01', end_date: '2026-10-21', done_days: [1, 2] })
})

test('itens de exemplo ou de antes do servidor (id antigo) ficam só no aparelho', () => {
  expect(prayerDiffOps(empty, { ...empty, diary: [{ id: 'd1', date: '2026-10-06', text: 'x' }] })).toEqual([])
})

test('ao trazer do banco, o pedido mantém o vídeo do aparelho e usa o compartilhado do banco', () => {
  const id = uuid()
  const local = { ...empty, requests: [{ id, title: 'A', text: 'A', createdAt: '2026-10-06', shared: false, prayedBy: ['João'], videoUri: 'file:///v.mp4' }], diary: [{ id: 'd1', date: '2026-10-01', text: 'antigo' }] }
  const remote = { ...empty, requests: [{ id, title: 'A', text: 'A mudado em outro celular', createdAt: '2026-10-06', shared: true, prayedBy: [] }] }
  const merged = mergePrayer(local, remote)
  expect(merged.requests[0]).toMatchObject({ text: 'A mudado em outro celular', shared: true, prayedBy: ['João'], videoUri: 'file:///v.mp4' })
  expect(merged.diary.map((d) => d.id)).toEqual(['d1'])
})
