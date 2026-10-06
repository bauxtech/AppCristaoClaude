import type { SupabaseClient } from '@supabase/supabase-js'
import { pushConsents, pushFaithConsent, pushProfile } from '../src/lib/account'
import { clearOutbox, droppedOps, enqueue, flush, isTransient, pendingOps, setSyncClient } from '../src/lib/sync'

type Call = { table: string; op: string; payload?: unknown; match?: unknown; onConflict?: string }

/** Cliente falso do Supabase: guarda as chamadas e devolve o erro que o teste mandar. */
function fakeClient(errors: ({ message: string; status?: number } | null)[] = []) {
  const calls: Call[] = []
  const next = () => {
    const e = errors.length ? errors.shift()! : null
    return Promise.resolve({ error: e, status: e ? (e.status ?? 0) : 200 })
  }
  const client = {
    from: (table: string) => ({
      upsert: (payload: unknown, opts?: { onConflict?: string }) => {
        calls.push({ table, op: 'upsert', payload, onConflict: opts?.onConflict })
        return next()
      },
      update: (payload: unknown) => ({
        match: (match: unknown) => {
          calls.push({ table, op: 'update', payload, match })
          return next()
        },
      }),
      delete: () => ({
        match: (match: unknown) => {
          calls.push({ table, op: 'delete', match })
          return next()
        },
      }),
    }),
  }
  return { client: client as unknown as SupabaseClient, calls }
}

beforeEach(() => {
  setSyncClient({} as SupabaseClient, null)
  clearOutbox()
  setSyncClient(null, null)
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

test('sem servidor (prévia), nada entra na fila', () => {
  pushProfile({ name: 'Ana' })
  expect(pendingOps()).toEqual([])
})

test('sem login, a mudança espera na fila; com login, vai com o id de quem entrou', async () => {
  const { client, calls } = fakeClient()
  setSyncClient(client, null)
  pushProfile({ name: 'Ana', time: '07:00', church: 'Igreja X' })
  await flush()
  expect(calls).toEqual([])
  expect(pendingOps()).toHaveLength(1)
  setSyncClient(client, 'u1')
  await flush()
  expect(calls).toEqual([{ table: 'profiles', op: 'update', payload: { name: 'Ana', reminder_time: '07:00' }, match: { id: 'u1' } }])
  expect(pendingOps()).toEqual([])
})

test('erro de rede mantém a operação para a próxima tentativa, em ordem', async () => {
  const { client, calls } = fakeClient([{ message: 'TypeError: Network request failed' }])
  setSyncClient(client, 'u1')
  enqueue({ kind: 'upsert', table: 'bible_reads', row: { user_id: '$uid', book: 'joao', chapter: 3 } }, { kind: 'delete', table: 'bible_favorites', match: { user_id: '$uid', verse_key: 'joao:3:16' } })
  await flush()
  expect(pendingOps()).toHaveLength(2)
  await flush()
  expect(pendingOps()).toEqual([])
  expect(calls.map((c) => c.op)).toEqual(['upsert', 'upsert', 'delete'])
  expect(calls[2].match).toEqual({ user_id: 'u1', verse_key: 'joao:3:16' })
})

test('operação recusada pelo servidor (regra de acesso) sai da fila e não trava as outras', async () => {
  const { client, calls } = fakeClient([{ message: 'new row violates row-level security policy', status: 403 }])
  setSyncClient(client, 'u1')
  enqueue({ kind: 'upsert', table: 'x', row: { a: 1 } }, { kind: 'upsert', table: 'y', row: { b: 2 } })
  await flush()
  expect(calls.map((c) => c.table)).toEqual(['x', 'y'])
  expect(pendingOps()).toEqual([])
})

test('termos, idade e consentimento de fé vão com a data do aceite', async () => {
  const { client, calls } = fakeClient()
  setSyncClient(client, 'u1')
  const now = new Date('2026-10-06T12:00:00Z')
  pushConsents({ terms: true, adult: true, faith: true }, now)
  pushFaithConsent(false, now)
  await flush()
  expect(calls[0].payload).toEqual({ terms_accepted_at: now.toISOString(), adult_confirmed: true, faith_consent: true, faith_consent_at: now.toISOString() })
  expect(calls[1].payload).toEqual({ faith_consent: false, faith_consent_at: null })
  expect(calls.every((c) => (c.match as { id: string }).id === 'u1')).toBe(true)
})

test('sair da conta limpa a fila', () => {
  const { client } = fakeClient()
  setSyncClient(client, null)
  pushProfile({ name: 'Ana' })
  clearOutbox()
  expect(pendingOps()).toEqual([])
})

test('servidor fora do ar, sessão vencida ou limite de chamadas: a operação espera na fila', async () => {
  for (const status of [500, 503, 401, 429, 408]) {
    const { client } = fakeClient([{ message: 'erro', status }])
    setSyncClient(client, 'u1')
    clearOutbox()
    enqueue({ kind: 'upsert', table: 'prayer_diary', row: { id: 'x', user_id: '$uid', text: 'Agradeci' } })
    await flush()
    expect(pendingOps()).toHaveLength(1)
  }
  expect(isTransient({ error: { message: 'new row violates row-level security policy', code: '42501' }, status: 403 })).toBe(false)
  expect(isTransient({ error: { message: 'duplicate key', code: '23505' }, status: 409 })).toBe(false)
})

test('recusa definitiva fica registrada para poder avisar a pessoa', async () => {
  const before = droppedOps().length
  const { client } = fakeClient([{ message: 'violates check constraint', status: 400 }])
  setSyncClient(client, 'u1')
  enqueue({ kind: 'upsert', table: 'prayer_requests', row: { id: 'y', user_id: '$uid', text: '' } })
  await flush()
  expect(pendingOps()).toEqual([])
  expect(droppedOps().length).toBe(Math.min(before + 1, 50))
})

test('o que a conta A fez sem internet não vai para a conta B que entrou depois', async () => {
  const offline = fakeClient([{ message: 'Network request failed' }])
  setSyncClient(offline.client, 'conta-a')
  enqueue({ kind: 'upsert', table: 'prayer_diary', row: { id: 'z', user_id: '$uid', text: 'Diário da A' } })
  await flush()
  expect(pendingOps()).toHaveLength(1)
  const online = fakeClient()
  setSyncClient(online.client, 'conta-b')
  await flush()
  expect(online.calls).toEqual([])
  expect(pendingOps()).toEqual([])
})

test('o que foi feito antes do primeiro login (cadastro) vai para quem entrar', async () => {
  const { client, calls } = fakeClient()
  setSyncClient(client, null)
  pushProfile({ name: 'Ana' })
  setSyncClient(client, 'u1')
  await flush()
  expect(calls).toHaveLength(1)
  expect(calls[0].match).toEqual({ id: 'u1' })
})
