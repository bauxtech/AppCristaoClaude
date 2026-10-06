import NetInfo from '@react-native-community/netinfo'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { getItem, setItem } from './storage'
import { supabase } from './supabase'

// Sincronização com o banco. O app continua funcionando sem internet: cada mudança é gravada no
// aparelho na hora e entra numa fila. A fila vai para o servidor quando há login e internet.
// Quem garante que ninguém grava dado de outra pessoa são as regras de acesso do banco.
// Nas operações, '$uid' é trocado pelo id de quem está logado no momento do envio.

export type SyncOp = (
  | { kind: 'upsert'; table: string; row: Record<string, unknown> | Record<string, unknown>[]; onConflict?: string }
  | { kind: 'update'; table: string; values: Record<string, unknown>; match: Record<string, unknown> }
  | { kind: 'delete'; table: string; match: Record<string, unknown> }
  /** Função do banco que confere a permissão antes de gravar (ex.: create_cell, mark_attendance). */
  | { kind: 'rpc'; fn: string; args: Record<string, unknown>; table?: undefined }
) & {
  /** Conta logada quando a operação entrou na fila. Sem dono: feita antes do primeiro login (cadastro). */
  owner?: string
}

const KEY = 'syncOutbox'
const DROPPED = 'syncDropped'
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
  // Cada operação leva a conta logada agora. Se outra conta entrar depois, ela não recebe o que não é dela.
  const owner = userId ?? undefined
  save([...load(), ...ops.map((op) => (owner ? { ...op, owner } : op))])
  void flush()
}

/** Operações recusadas de vez pelo servidor (regra de acesso, dado inválido). Guardadas para poder avisar a pessoa. */
export function droppedOps(): SyncOp[] {
  return getItem<SyncOp[]>(DROPPED, [])
}

/** Tira da fila o que pertence a outra conta. */
function dropOtherOwners(uid: string) {
  const q = load()
  const kept = q.filter((op) => !op.owner || op.owner === uid)
  if (kept.length !== q.length) save(kept)
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

type RunResult = { error: { message?: string; code?: string } | null; status?: number }

/**
 * Falha passageira: a operação fica na fila. Sem internet, sessão vencida (401), demora (408),
 * muitas chamadas (429) ou servidor fora do ar (5xx).
 * Recusa definitiva (400, 403, regra de acesso 42501, restrição 23xxx) tira a operação da fila.
 */
export function isTransient(r: RunResult) {
  const s = r.status ?? 0
  if (s === 0 || s === 401 || s === 408 || s === 429 || s >= 500) return true
  if (r.error?.code === 'PGRST301' || r.error?.code === 'PGRST303') return true
  return /fetch|network|timeout|offline|jwt/i.test(r.error?.message ?? '')
}

async function run(c: SupabaseClient, op: SyncOp, uid: string): Promise<RunResult> {
  if (op.kind === 'upsert') return await c.from(op.table).upsert(fill(op.row, uid), op.onConflict ? { onConflict: op.onConflict } : undefined)
  if (op.kind === 'update') return await c.from(op.table).update(fill(op.values, uid)).match(fill(op.match, uid))
  if (op.kind === 'rpc') return await c.rpc(op.fn, fill(op.args, uid))
  return await c.from(op.table).delete().match(fill(op.match, uid))
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
      dropOtherOwners(uid)
      while (load().length) {
        const op = load()[0]
        let r: RunResult
        try {
          r = await run(c, op, uid)
        } catch (e) {
          r = { error: { message: String((e as Error)?.message ?? e) }, status: 0 }
        }
        if (r.error && isTransient(r)) break
        if (r.error) {
          console.warn('Sincronização: operação recusada pelo servidor', op.kind === 'rpc' ? op.fn : op.table, r.error.message)
          setItem(DROPPED, [...droppedOps(), op].slice(-50))
        }
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
    if (next) dropOtherOwners(next)
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
