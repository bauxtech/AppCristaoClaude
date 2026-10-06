import { bibleDiffOps, newPlanId, type SyncedBible } from '../src/features/bible/sync'

const empty: SyncedBible = { readChapters: [], highlights: {}, favorites: [], notes: {}, activePlanId: null, customPlans: [], progress: {} }
const now = new Date('2026-10-06T12:00:00Z')

test('sem mudança, nada vai para o banco', () => {
  expect(bibleDiffOps(empty, { ...empty })).toEqual([])
})

test('capítulos lidos vão juntos numa chamada, com livro e capítulo separados', () => {
  const ops = bibleDiffOps(empty, { ...empty, readChapters: ['joao:3', '1-pedro:2'] })
  expect(ops).toEqual([
    { kind: 'upsert', table: 'bible_reads', row: [{ user_id: '$uid', book: 'joao', chapter: 3 }, { user_id: '$uid', book: '1-pedro', chapter: 2 }], onConflict: 'user_id,book,chapter' },
  ])
})

test('grifo, favorito e nota: criar, mudar e apagar', () => {
  const a = { ...empty, highlights: { 'joao:3:16': 'amarelo' as const }, favorites: ['joao:3:16'], notes: { 'joao:3:16': 'Amor de Deus' } }
  expect(bibleDiffOps(empty, a, now)).toEqual([
    { kind: 'upsert', table: 'bible_highlights', row: { user_id: '$uid', verse_key: 'joao:3:16', color: 'amarelo' }, onConflict: 'user_id,verse_key' },
    { kind: 'upsert', table: 'bible_favorites', row: { user_id: '$uid', verse_key: 'joao:3:16' }, onConflict: 'user_id,verse_key' },
    { kind: 'upsert', table: 'bible_notes', row: { user_id: '$uid', verse_key: 'joao:3:16', text: 'Amor de Deus', updated_at: now.toISOString() }, onConflict: 'user_id,verse_key' },
  ])
  const b = { ...a, highlights: { 'joao:3:16': 'verde' as const } }
  expect(bibleDiffOps(a, b)).toEqual([{ kind: 'upsert', table: 'bible_highlights', row: { user_id: '$uid', verse_key: 'joao:3:16', color: 'verde' }, onConflict: 'user_id,verse_key' }])
  expect(bibleDiffOps(a, empty)).toEqual([
    { kind: 'delete', table: 'bible_highlights', match: { user_id: '$uid', verse_key: 'joao:3:16' } },
    { kind: 'delete', table: 'bible_favorites', match: { user_id: '$uid', verse_key: 'joao:3:16' } },
    { kind: 'delete', table: 'bible_notes', match: { user_id: '$uid', verse_key: 'joao:3:16' } },
  ])
})

test('trocar o plano ativo atualiza as duas linhas de progresso', () => {
  const p1 = { startedAt: '2026-10-01', doneDays: [1, 2] }
  const p2 = { startedAt: '2026-10-05', doneDays: [] }
  const a = { ...empty, progress: { 'nt-90': p1, 'salmos-30': p2 }, activePlanId: 'nt-90' }
  const ops = bibleDiffOps(a, { ...a, activePlanId: 'salmos-30' })
  expect(ops).toEqual([
    { kind: 'upsert', table: 'plan_progress', row: { user_id: '$uid', plan_id: 'nt-90', started_at: '2026-10-01', done_days: [1, 2], active: false }, onConflict: 'user_id,plan_id' },
    { kind: 'upsert', table: 'plan_progress', row: { user_id: '$uid', plan_id: 'salmos-30', started_at: '2026-10-05', done_days: [], active: true }, onConflict: 'user_id,plan_id' },
  ])
})

test('plano próprio: criado antes do progresso, apagado depois dele', () => {
  const id = newPlanId()
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  const plan = { id, name: 'Evangelhos', books: ['Mateus', 'Marcos'], total: 30, custom: true }
  const a = { ...empty, customPlans: [plan], progress: { [id]: { startedAt: '2026-10-06', doneDays: [] } }, activePlanId: id }
  const create = bibleDiffOps(empty, a)
  expect(create.map((o) => o.table)).toEqual(['reading_plans', 'plan_progress'])
  expect(create[0]).toEqual({ kind: 'upsert', table: 'reading_plans', row: { id, user_id: '$uid', name: 'Evangelhos', books: ['Mateus', 'Marcos'], days: 30 } })
  const remove = bibleDiffOps(a, empty)
  expect(remove.map((o) => `${o.kind}:${o.table}`)).toEqual(['delete:plan_progress', 'delete:reading_plans'])
})

test('plano antigo, de antes do servidor (id que não é uuid), fica só no aparelho', () => {
  const old = { id: 'meu-abc', name: 'Antigo', books: ['Rute'], total: 4, custom: true }
  expect(bibleDiffOps(empty, { ...empty, customPlans: [old] })).toEqual([])
})
