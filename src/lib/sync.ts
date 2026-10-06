import NetInfo from '@react-native-community/netinfo'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { getItem, setItem } from './storage'
import { supabase } from './supabase'

// Sincronização com o banco. O app continua funcionando sem internet: cada mudança é gravada no
// aparelho na hora e entra numa fila. A fila vai para o servidor quando há login e internet.
// Quem garante que ninguém grava dado de outra pessoa são as regras de acesso do banco.
// Nas operações, '$uid' é trocado pelo id de quem está logado no momento do envio.

export type SyncOp =
  | { kind: 'upsert'; table: string; row: Record<string, unknown>; onConflict?: string }
  | { kind: 'update'; table: string; values: Record<string, unknown>; match: Record<string, unknown> }
  | { kind: 'delete'; table: string; match: Record<string, unknown> }

const KEY = 'syncOutbox'
const UID = '$uid'

let client: SupabaseClient | null = supabase
let userId: string | null = null
let flushing: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

/** Só nos testes: troca o cliente do Supabase e o id de quem está logado. */
export function setSyncClient(c: SupabaseClient | null, uid: string | null) {
  client = c
  userId = uid
  emit()
}

export function currentUserId() {
  return userId
}

/** Id de quem está logado no servidor, ou null (sem login ou sem servidor). */
export function useUserId() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => userId,
    () => userId,
  )
}

/** Avisa quando alguém entra ou sai. Devolve a função para parar de ouvir. */
export function onUserChange(fn: (uid: string | null) => void) {
  const l = () => fn(userId)
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Há servidor configurado: as mudanças vão para a fila. Sem servidor (prévia), ficam só no aparelho. */
export function syncEnabled() {
  return !!client
}

// A fila fica na memória e é copiada para o aparelho a cada mudança, para sobreviver ao app fechado.
let queue: SyncOp[] | null = null
function load() {
  if (!queue) queue = getItem<SyncOp[]>(KEY, [])
  return queue
}
function save(next: SyncOp[]) {
  queue = next
  setItem(KEY, next)
}

export function pendingOps(): SyncOp[] {
  return load()
}

export function enqueue(...ops: SyncOp[]) {
  if (!syncEnabled() || !ops.length) return
  save([...load(), ...ops])
  void flush()
}

/** Ao sair da conta: o que estava na fila era da conta que saiu. */
export function clearOutbox() {
  save([])
}

function fill<T>(v: T, uid: string): T {
  if (v === UID) return uid as T
  if (Array.isArray(v)) return v.map((x) => fill(x, uid)) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, uid)])) as T
  return v
}

/** Erro de rede: a operação fica na fila para a próxima tentativa. Outros erros (regra de acesso, dado inválido) descartam a operação. */
function isNetworkError(e: { message?: string; status?: number; code?: string } | null) {
  if (!e) return false
  return e.status === 0 || /fetch|network|timeout|offline/i.test(e.message ?? '')
}

async function run(c: SupabaseClient, op: SyncOp, uid: string) {
  if (op.kind === 'upsert') return (await c.from(op.table).upsert(fill(op.row, uid), op.onConflict ? { onConflict: op.onConflict } : undefined)).error
  if (op.kind === 'update') return (await c.from(op.table).update(fill(op.values, uid)).match(fill(op.match, uid))).error
  return (await c.from(op.table).delete().match(fill(op.match, uid))).error
}

/** Envia a fila em ordem. Para no primeiro erro de rede. */
export function flush(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    // Espera um ciclo: assim `flushing` já está atribuído quando o finally o limpa.
    await Promise.resolve()
    try {
      const c = client
      const uid = userId
      if (!c || !uid) return
      while (load().length) {
        const op = load()[0]
        let err: Awaited<ReturnType<typeof run>> | Error | null = null
        try {
          err = await run(c, op, uid)
        } catch (e) {
          err = e as Error
        }
        if (err && isNetworkError(err as { message?: string })) break
        if (err) console.warn('Sincronização: operação recusada pelo servidor', op.table, (err as { message?: string }).message)
        // Tira a operação enviada. O que entrou na fila durante o envio continua lá.
        save(load().filter((x) => x !== op))
      }
    } finally {
      flushing = null
    }
  })()
  return flushing
}

let started = false
/** Liga a sincronização: acompanha o login e a volta da internet. Chamado uma vez no início do app. */
export function startSync() {
  if (started || !supabase) return () => {}
  started = true
  supabase.auth.getSession().then(({ data }) => {
    userId = data.session?.user.id ?? null
    emit()
    void flush()
  })
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    const next = session?.user.id ?? null
    if (next === userId) return
    userId = next
    emit()
    void flush()
  })
  const unsubNet = NetInfo.addEventListener((s) => {
    if (s.isConnected) void flush()
  })
  return () => {
    data.subscription.unsubscribe()
    unsubNet()
    started = false
  }
}
