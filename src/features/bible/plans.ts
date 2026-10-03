// Planos de leitura: o catálogo do app, os planos criados pela pessoa e o progresso de cada um.
// A leitura de cada dia é calculada dividindo os capítulos dos livros escolhidos pelos dias do plano.

import { BOOKS } from './books'

export interface Reading {
  book: string
  from: number
  to: number
}

export interface PlanDef {
  id: string
  name: string
  /** Livros na ordem de leitura. */
  books: string[]
  total: number
  custom?: boolean
}

export interface PlanProgress {
  startedAt: string
  /** Dias já marcados como lidos (1 = primeiro dia). */
  doneDays: number[]
}

const NT = BOOKS.filter((b) => b.testament === 'NT').map((b) => b.name)
const ALL = BOOKS.map((b) => b.name)

export const CATALOG: PlanDef[] = [
  { id: 'nt-90', name: 'Novo Testamento em 90 dias', books: NT, total: 90 },
  { id: 'biblia-1-ano', name: 'Bíblia em 1 ano', books: ALL, total: 365 },
  { id: 'sl-pv-30', name: 'Salmos e Provérbios em 30 dias', books: ['Salmos', 'Provérbios'], total: 30 },
  { id: 'vida-jesus', name: 'Vida de Jesus nos 4 Evangelhos', books: ['Mateus', 'Marcos', 'Lucas', 'João'], total: 40 },
]

/** Todos os capítulos dos livros, em ordem. */
function chapterList(books: string[]) {
  return books.flatMap((name) => {
    const b = BOOKS.find((x) => x.name === name)
    return b ? Array.from({ length: b.chapters }, (_, i) => ({ book: name, chapter: i + 1 })) : []
  })
}

export function totalChapters(books: string[]) {
  return chapterList(books).length
}

/** Leitura do dia n (1 a total), agrupada por livro. */
export function readingsForDay(plan: Pick<PlanDef, 'books' | 'total'>, day: number): Reading[] {
  const list = chapterList(plan.books)
  const start = Math.floor(((day - 1) * list.length) / plan.total)
  const end = Math.floor((day * list.length) / plan.total)
  const slice = list.slice(start, Math.max(end, start + (day <= list.length ? 1 : 0)))
  const out: Reading[] = []
  for (const c of slice) {
    const last = out[out.length - 1]
    if (last && last.book === c.book && last.to === c.chapter - 1) last.to = c.chapter
    else out.push({ book: c.book, from: c.chapter, to: c.chapter })
  }
  return out
}

/** "Romanos 1 a 4" ou "Salmos 150 e Provérbios 1" */
export function readingLabel(r: Reading[]) {
  const parts = r.map((x) => (x.from === x.to ? `${x.book} ${x.from}` : x.to === x.from + 1 ? `${x.book} ${x.from} e ${x.to}` : `${x.book} ${x.from} a ${x.to}`))
  return parts.join(', ').replace(/, ([^,]*)$/, ' e $1')
}

const DAY = 86400000
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export type PlanStatus = 'notStarted' | 'active' | 'behind' | 'done'

export function planState(plan: PlanDef, progress: PlanProgress | undefined, now = new Date()) {
  if (!progress) {
    const today = readingsForDay(plan, 1)
    return { status: 'notStarted' as PlanStatus, day: 1, done: 0, behind: 0, total: plan.total, today, todayLabel: readingLabel(today) }
  }
  const done = progress.doneDays.length
  const elapsed = Math.round((startOfDay(now).getTime() - parse(progress.startedAt).getTime()) / DAY)
  const day = Math.min(done + 1, plan.total)
  const behind = Math.max(0, elapsed - done)
  const status: PlanStatus = done >= plan.total ? 'done' : behind > 0 ? 'behind' : 'active'
  const today = readingsForDay(plan, day)
  return { status, day, done, behind, total: plan.total, today, todayLabel: readingLabel(today) }
}

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoDaysAgo(n: number, now = new Date()) {
  return iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n))
}

/** Progresso de exemplo do protótipo: Novo Testamento no dia 34 com 3 de atraso, Vida de Jesus concluído. */
export function sampleProgress(now = new Date()): Record<string, PlanProgress> {
  return {
    'nt-90': { startedAt: isoDaysAgo(36, now), doneDays: Array.from({ length: 33 }, (_, i) => i + 1) },
    'vida-jesus': { startedAt: isoDaysAgo(60, now), doneDays: Array.from({ length: 40 }, (_, i) => i + 1) },
  }
}
