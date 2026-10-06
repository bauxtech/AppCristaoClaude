import type { SyncOp } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { isUuid, uuid } from '../../lib/uuid'
import type { HighlightColor } from './BibleContext'
import type { PlanDef, PlanProgress } from './plans'

// Sincronização das marcações da Bíblia com o banco.
// Em vez de cada ação montar sua chamada, o app compara o estado antes e depois e manda só a diferença.

export interface SyncedBible {
  readChapters: string[]
  highlights: Record<string, HighlightColor>
  favorites: string[]
  notes: Record<string, string>
  activePlanId: string | null
  customPlans: PlanDef[]
  progress: Record<string, PlanProgress>
}

/** Id de plano próprio: uuid, porque é a chave da tabela reading_plans. */
export const newPlanId = uuid

function splitChapter(k: string) {
  const i = k.lastIndexOf(':')
  return { book: k.slice(0, i), chapter: Number(k.slice(i + 1)) }
}

function progressRow(id: string, p: PlanProgress, active: boolean) {
  return { user_id: '$uid', plan_id: id, started_at: p.startedAt, done_days: p.doneDays, active }
}

export function bibleDiffOps(prev: SyncedBible, next: SyncedBible, now = new Date()): SyncOp[] {
  const ops: SyncOp[] = []

  const prevRead = new Set(prev.readChapters)
  const added = next.readChapters.filter((k) => !prevRead.has(k))
  if (added.length) ops.push({ kind: 'upsert', table: 'bible_reads', row: added.map((k) => ({ user_id: '$uid', ...splitChapter(k) })), onConflict: 'user_id,book,chapter' })
  const nextRead = new Set(next.readChapters)
  for (const k of prev.readChapters) if (!nextRead.has(k)) ops.push({ kind: 'delete', table: 'bible_reads', match: { user_id: '$uid', ...splitChapter(k) } })

  for (const [k, c] of Object.entries(next.highlights)) {
    if (prev.highlights[k] !== c) ops.push({ kind: 'upsert', table: 'bible_highlights', row: { user_id: '$uid', verse_key: k, color: c }, onConflict: 'user_id,verse_key' })
  }
  for (const k of Object.keys(prev.highlights)) if (!(k in next.highlights)) ops.push({ kind: 'delete', table: 'bible_highlights', match: { user_id: '$uid', verse_key: k } })

  const prevFav = new Set(prev.favorites)
  const nextFav = new Set(next.favorites)
  for (const k of next.favorites) if (!prevFav.has(k)) ops.push({ kind: 'upsert', table: 'bible_favorites', row: { user_id: '$uid', verse_key: k }, onConflict: 'user_id,verse_key' })
  for (const k of prev.favorites) if (!nextFav.has(k)) ops.push({ kind: 'delete', table: 'bible_favorites', match: { user_id: '$uid', verse_key: k } })

  for (const [k, t] of Object.entries(next.notes)) {
    if (prev.notes[k] !== t) ops.push({ kind: 'upsert', table: 'bible_notes', row: { user_id: '$uid', verse_key: k, text: t, updated_at: now.toISOString() }, onConflict: 'user_id,verse_key' })
  }
  for (const k of Object.keys(prev.notes)) if (!(k in next.notes)) ops.push({ kind: 'delete', table: 'bible_notes', match: { user_id: '$uid', verse_key: k } })

  // Planos próprios: só os de id uuid vão para o banco (os antigos, de antes do servidor, ficam no aparelho).
  const prevPlans = new Map(prev.customPlans.map((p) => [p.id, p]))
  const nextPlans = new Map(next.customPlans.map((p) => [p.id, p]))
  for (const p of next.customPlans) {
    if (isUuid(p.id) && prevPlans.get(p.id) !== p) ops.push({ kind: 'upsert', table: 'reading_plans', row: { id: p.id, user_id: '$uid', name: p.name, books: p.books, days: p.total } })
  }

  // Progresso: linha nova, mudada ou com o plano ativo trocado.
  for (const [id, p] of Object.entries(next.progress)) {
    const active = next.activePlanId === id
    if (prev.progress[id] !== p || (prev.activePlanId === id) !== active) ops.push({ kind: 'upsert', table: 'plan_progress', row: progressRow(id, p, active), onConflict: 'user_id,plan_id' })
  }
  for (const id of Object.keys(prev.progress)) if (!(id in next.progress)) ops.push({ kind: 'delete', table: 'plan_progress', match: { user_id: '$uid', plan_id: id } })

  // Plano apagado sai depois do progresso dele.
  for (const p of prev.customPlans) if (!nextPlans.has(p.id) && isUuid(p.id)) ops.push({ kind: 'delete', table: 'reading_plans', match: { id: p.id, user_id: '$uid' } })

  return ops
}

/** Lê do banco tudo o que a pessoa marcou na Bíblia. Devolve null se não há servidor ou a leitura falhou. */
export async function pullBible(uid: string): Promise<SyncedBible | null> {
  if (!supabase) return null
  const [reads, highlights, favorites, notes, plans, progress] = await Promise.all([
    supabase.from('bible_reads').select('book, chapter').eq('user_id', uid),
    supabase.from('bible_highlights').select('verse_key, color').eq('user_id', uid),
    supabase.from('bible_favorites').select('verse_key').eq('user_id', uid),
    supabase.from('bible_notes').select('verse_key, text').eq('user_id', uid),
    supabase.from('reading_plans').select('id, name, books, days').eq('user_id', uid),
    supabase.from('plan_progress').select('plan_id, started_at, done_days, active').eq('user_id', uid),
  ])
  if ([reads, highlights, favorites, notes, plans, progress].some((r) => r.error)) return null
  const prog = progress.data ?? []
  return {
    readChapters: (reads.data ?? []).map((r) => `${r.book}:${r.chapter}`),
    highlights: Object.fromEntries((highlights.data ?? []).map((h) => [h.verse_key, h.color as HighlightColor])),
    favorites: (favorites.data ?? []).map((f) => f.verse_key),
    notes: Object.fromEntries((notes.data ?? []).map((n) => [n.verse_key, n.text])),
    customPlans: (plans.data ?? []).map((p) => ({ id: p.id, name: p.name, books: p.books, total: p.days, custom: true })),
    progress: Object.fromEntries(prog.map((p) => [p.plan_id, { startedAt: p.started_at, doneDays: p.done_days ?? [] }])),
    activePlanId: prog.find((p) => p.active)?.plan_id ?? null,
  }
}
