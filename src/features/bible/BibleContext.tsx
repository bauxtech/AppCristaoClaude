import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'

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
}

interface BibleValue extends BibleState {
  markRead: (chapterKey: string) => void
  setHighlight: (verseKey: string, color: HighlightColor | null) => void
  toggleFavorite: (verseKey: string) => void
  saveNote: (verseKey: string, text: string) => void
  setFontSize: (n: number) => void
  setActivePlan: (id: string | null) => void
}

const initial: BibleState = { readChapters: [], highlights: {}, favorites: [], notes: {}, fontSize: 19, activePlanId: 'nt-90' }

const BibleContext = createContext<BibleValue | null>(null)

export const FONT_MIN = 16
export const FONT_MAX = 28

export function BibleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BibleState>(() => getItem('bible', initial))

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
      markRead: (k) => update((s) => (s.readChapters.includes(k) ? s : { ...s, readChapters: [...s.readChapters, k] })),
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
    }),
    [state, update],
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
