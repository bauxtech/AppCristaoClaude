import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import { BOOKS, slugify } from './books'
import { CATALOG, readingsForDay, sampleProgress, type PlanDef, type PlanProgress } from './plans'

// Marcações da pessoa na Bíblia. Ficam no aparelho até o banco entrar, e funcionam sem internet.

export type HighlightColor = 'amarelo' | 'verde' | 'azul' | 'rosa'

export const HIGHLIGHTS: { id: HighlightColor; label: string; light: string; dark: string }[] = [
  { id: 'amarelo', label: 'Amarelo', light: '#FDE68A', dark: '#5C4A0E' },
  { id: 'verde', label: 'Verde', light: '#BBF7D0', dark: '#14482B' },
  { id: 'azul', label: 'Azul', light: '#BFDBFE', dark: '#1B3A66' },
  { id: 'rosa', label: 'Rosa', light: '#FBCFE8', dark: '#5E1F45' },
]

interface BibleState {
  readChapters: string[]
  highlights: Record<string, HighlightColor>
  favorites: string[]
  notes: Record<string, string>
  fontSize: number
  activePlanId: string | null
  customPlans: PlanDef[]
  progress: Record<string, PlanProgress>
  /** Último capítulo aberto, para continuar de onde parou. */
  lastPosition: { book: string; chapter: number } | null
}

interface BibleValue extends BibleState {
  markRead: (chapterKey: string) => void
  setHighlight: (verseKey: string, color: HighlightColor | null) => void
  toggleFavorite: (verseKey: string) => void
  saveNote: (verseKey: string, text: string) => void
  setFontSize: (n: number) => void
  setActivePlan: (id: string | null) => void
  /** Catálogo do app e planos criados pela pessoa. */
  plans: PlanDef[]
  planDef: (id: string) => PlanDef | undefined
  createPlan: (p: Omit<PlanDef, 'id' | 'custom'>, start: boolean) => PlanDef
  deletePlan: (id: string) => void
  startPlan: (id: string) => void
  stopPlan: (id: string) => void
  /** Marca o próximo dia do plano como lido, e os capítulos dele. */
  markPlanDay: (id: string) => void
  /** Recomeça a contagem a partir de hoje, sem perder o que já foi lido. */
  resumePlan: (id: string) => void
  setLastPosition: (book: string, chapter: number) => void
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Conta nova: nada lido, nenhum plano. Exemplo: o progresso do protótipo. */
export function bibleInitial(sample: boolean): BibleState {
  if (!sample) return { readChapters: [], highlights: {}, favorites: [], notes: {}, fontSize: 19, activePlanId: null, customPlans: [], progress: {}, lastPosition: null }
  const readChapters = BOOKS.flatMap((b) => Array.from({ length: b.read }, (_, i) => `${slugify(b.name)}:${i + 1}`))
  return { readChapters, highlights: {}, favorites: [], notes: {}, fontSize: 19, activePlanId: 'nt-90', customPlans: [], progress: sampleProgress(), lastPosition: { book: 'salmos', chapter: 23 } }
}

const BibleContext = createContext<BibleValue | null>(null)

export const FONT_MIN = 16
export const FONT_MAX = 28

export function BibleProvider({ children, initial }: { children: ReactNode; initial?: Partial<BibleState> }) {
  const { sampleData, markActiveToday } = useSession()
  const [state, setState] = useState<BibleState>(() => {
    const base = bibleInitial(sampleData)
    if (initial) return { ...base, ...initial }
    const saved = getItem<Partial<BibleState> | null>('bible', null)
    return saved ? { ...base, customPlans: [], progress: {}, lastPosition: null, ...saved } : base
  })
  useDataReset((sample) => {
    const next = bibleInitial(sample)
    setState(next)
    setItem('bible', next)
  })

  const update = useCallback((fn: (s: BibleState) => BibleState) => {
    setState((prev) => {
      const next = fn(prev)
      setItem('bible', next)
      return next
    })
  }, [])

  const value = useMemo<BibleValue>(
    () => ({
      ...state,
      markRead: (k) => {
        markActiveToday()
        update((s) => (s.readChapters.includes(k) ? s : { ...s, readChapters: [...s.readChapters, k] }))
      },
      setHighlight: (k, c) =>
        update((s) => {
          const h = { ...s.highlights }
          if (c) h[k] = c
          else delete h[k]
          return { ...s, highlights: h }
        }),
      toggleFavorite: (k) => update((s) => ({ ...s, favorites: s.favorites.includes(k) ? s.favorites.filter((x) => x !== k) : [...s.favorites, k] })),
      saveNote: (k, t) =>
        update((s) => {
          const n = { ...s.notes }
          if (t.trim()) n[k] = t.trim()
          else delete n[k]
          return { ...s, notes: n }
        }),
      setFontSize: (n) => update((s) => ({ ...s, fontSize: Math.max(FONT_MIN, Math.min(FONT_MAX, n)) })),
      setActivePlan: (id) => update((s) => ({ ...s, activePlanId: id })),
      plans: [...CATALOG, ...state.customPlans],
      planDef: (id) => [...CATALOG, ...state.customPlans].find((p) => p.id === id),
      createPlan: (p, start) => {
        const def: PlanDef = { ...p, id: `meu-${Date.now().toString(36)}`, custom: true }
        update((s) => ({
          ...s,
          customPlans: [...s.customPlans, def],
          progress: start ? { ...s.progress, [def.id]: { startedAt: today(), doneDays: [] } } : s.progress,
          activePlanId: start ? def.id : s.activePlanId,
        }))
        return def
      },
      deletePlan: (id) =>
        update((s) => {
          const progress = { ...s.progress }
          delete progress[id]
          return { ...s, customPlans: s.customPlans.filter((p) => p.id !== id), progress, activePlanId: s.activePlanId === id ? null : s.activePlanId }
        }),
      startPlan: (id) => update((s) => ({ ...s, activePlanId: id, progress: s.progress[id] ? s.progress : { ...s.progress, [id]: { startedAt: today(), doneDays: [] } } })),
      stopPlan: (id) =>
        update((s) => {
          const progress = { ...s.progress }
          delete progress[id]
          return { ...s, progress, activePlanId: s.activePlanId === id ? null : s.activePlanId }
        }),
      markPlanDay: (id) => {
        const def = [...CATALOG, ...state.customPlans].find((p) => p.id === id)
        if (!def) return
        markActiveToday()
        update((s) => {
          const prog = s.progress[id] ?? { startedAt: today(), doneDays: [] }
          const next = prog.doneDays.length + 1
          if (next > def.total) return s
          const keys = readingsForDay(def, next).flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => `${slugify(r.book)}:${r.from + i}`))
          return {
            ...s,
            readChapters: [...new Set([...s.readChapters, ...keys])],
            progress: { ...s.progress, [id]: { ...prog, doneDays: [...prog.doneDays, next] } },
          }
        })
      },
      setLastPosition: (book, chapter) => update((s) => (s.lastPosition?.book === book && s.lastPosition.chapter === chapter ? s : { ...s, lastPosition: { book, chapter } })),
      resumePlan: (id) =>
        update((s) => {
          const prog = s.progress[id]
          if (!prog) return s
          return { ...s, progress: { ...s.progress, [id]: { ...prog, startedAt: daysAgo(prog.doneDays.length) } } }
        }),
    }),
    [state, update, markActiveToday],
  )

  return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>
}

export function useBible() {
  const ctx = useContext(BibleContext)
  if (!ctx) throw new Error('useBible precisa estar dentro de BibleProvider')
  return ctx
}

/** "salmos:23:1" */
export function verseKey(bookSlug: string, chapter: number, verse: number) {
  return `${bookSlug}:${chapter}:${verse}`
}
