import type { SupabaseClient } from '@supabase/supabase-js'
import { pushConsents, pushFaithConsent, pushProfile } from '../src/lib/account'
import { clearOutbox, enqueue, flush, pendingOps, setSyncClient } from '../src/lib/sync'

type Call = { table: string; op: string; payload?: unknown; match?: unknown; onConflict?: string }

/** Cliente falso do Supabase: guarda as chamadas e devolve o erro que o teste mandar. */
function fakeClient(errors: ({ message: string; status?: number } | null)[] = []) {
  const calls: Call[] = []
  const next = () => Promise.resolve({ error: errors.length ? errors.shift()! : null })
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
