import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { useSession } from '../../state/session'
import { DIRECTORY, sampleCourses, sampleMinistries, type Church, type Course, type Ministry } from './data'

interface ChurchState {
  churches: { church: Church; relation: 'frequento' | 'visito' }[]
  mainId: string | null
  savedEvents: string[]
  ministries: Ministry[]
  courses: Course[]
}

interface ChurchValue extends ChurchState {
  main: Church | null
  addChurch: (c: Church, relation: 'frequento' | 'visito') => void
  removeChurch: (id: string) => void
  setMain: (id: string) => void
  updateChurch: (id: string, fn: (c: Church) => Church) => void
  toggleEvent: (id: string) => void
  setMinistries: (fn: (m: Ministry[]) => Ministry[]) => void
  setCourses: (fn: (c: Course[]) => Course[]) => void
  updateCourse: (id: string, fn: (c: Course) => Course) => void
}

const ChurchContext = createContext<ChurchValue | null>(null)

function initialState(churchName: string | null): ChurchState {
  const now = new Date()
  const known = churchName ? DIRECTORY.find((c) => c.name === churchName) : undefined
  const fromOnboarding: Church | null = known ?? (churchName ? { id: 'manual-1', name: churchName, city: '', neighborhood: '', address: '', source: 'manual', services: [], accessibility: {}, events: [] } : null)
  return {
    churches: fromOnboarding ? [{ church: fromOnboarding, relation: 'frequento' }] : [],
    mainId: fromOnboarding?.id ?? null,
    savedEvents: [],
    ministries: sampleMinistries(now),
    courses: sampleCourses(now),
  }
}

export function ChurchProvider({ children, initial }: { children: ReactNode; initial?: Partial<ChurchState> }) {
  const { profile } = useSession()
  const [state, setState] = useState<ChurchState>(() => (initial ? { ...initialState(null), ...initial } : getItem<ChurchState | null>('church', null) ?? initialState(profile.church)))

  useEffect(() => {
    if (!initial) setItem('church', state)
  }, [state, initial])

  // A igreja escolhida no primeiro acesso entra como a que a pessoa frequenta.
  useEffect(() => {
    if (initial || !profile.church || state.churches.some((x) => x.church.name === profile.church)) return
    if (state.churches.length === 0) setState((s) => ({ ...s, ...initialState(profile.church), ministries: s.ministries, courses: s.courses }))
  }, [profile.church, state.churches, initial])

  const main = state.churches.find((x) => x.church.id === state.mainId)?.church ?? state.churches[0]?.church ?? null

  const value = useMemo<ChurchValue>(
    () => ({
      ...state,
      main,
      addChurch: (c, relation) =>
        setState((s) => {
          const rest = s.churches.filter((x) => x.church.id !== c.id).map((x) => (relation === 'frequento' && x.relation === 'frequento' ? { ...x, relation: 'visito' as const } : x))
          return { ...s, churches: [...rest, { church: c, relation }], mainId: relation === 'frequento' || !s.mainId ? c.id : s.mainId }
        }),
      removeChurch: (id) =>
        setState((s) => {
          const rest = s.churches.filter((x) => x.church.id !== id)
          return { ...s, churches: rest, mainId: s.mainId === id ? (rest[0]?.church.id ?? null) : s.mainId }
        }),
      setMain: (id) => setState((s) => ({ ...s, mainId: id, churches: s.churches.map((x) => ({ ...x, relation: x.church.id === id ? 'frequento' : 'visito' })) })),
      updateChurch: (id, fn) => setState((s) => ({ ...s, churches: s.churches.map((x) => (x.church.id === id ? { ...x, church: fn(x.church) } : x)) })),
      toggleEvent: (id) => setState((s) => ({ ...s, savedEvents: s.savedEvents.includes(id) ? s.savedEvents.filter((e) => e !== id) : [...s.savedEvents, id] })),
      setMinistries: (fn) => setState((s) => ({ ...s, ministries: fn(s.ministries) })),
      setCourses: (fn) => setState((s) => ({ ...s, courses: fn(s.courses) })),
      updateCourse: (id, fn) => setState((s) => ({ ...s, courses: s.courses.map((c) => (c.id === id ? fn(c) : c)) })),
    }),
    [state, main],
  )

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>
}

export function useChurch() {
  const v = useContext(ChurchContext)
  if (!v) throw new Error('useChurch fora do ChurchProvider')
  return v
}

/**
 * Quem pode editar horários de culto: EM ABERTO (CLAUDE.md). Por enquanto qualquer pessoa edita na prévia.
 * Nome e endereço de igreja vinda do CNPJ não são editáveis.
 */
export function canEditServices() {
  return true
}
