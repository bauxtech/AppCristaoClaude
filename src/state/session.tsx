import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../lib/storage'

// Estado da conta enquanto o login real (Supabase) não entra.
// Tudo aqui é de exemplo e fica só no aparelho.

export type CellStatus = 'none' | 'pending' | 'member' | 'leader'

export interface Profile {
  name: string
  phone: string
  tradition: string | null
  goal: string | null
  time: string | null
  church: string | null
}

interface SessionValue {
  onboarded: boolean
  profile: Profile
  cellStatus: CellStatus
  updateProfile: (p: Partial<Profile>) => void
  setCellStatus: (s: CellStatus) => void
  finishOnboarding: () => void
  signOut: () => void
  /** Conta com dados de exemplo (prévia) ou vazia (conta nova). */
  sampleData: boolean
  /** Muda a cada troca entre exemplo e vazio. Os outros estados se refazem quando muda. */
  dataEpoch: number
  /** Só na prévia: refaz todos os dados como exemplo ou vazios. */
  resetData: (sample: boolean) => void
  /** Dias (AAAA-MM-DD) com leitura ou oração. Não existe sequência, só o total. */
  activeDays: string[]
  markActiveToday: () => void
}

const empty: Profile = { name: '', phone: '', tradition: null, goal: null, time: null, church: null }

const SessionContext = createContext<SessionValue | null>(null)

function todayISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 48 dias de exemplo: os 3 primeiros do mês e 45 espalhados antes. */
export function sampleActiveDays(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const days: string[] = []
  for (let i = 1; i <= Math.min(3, now.getDate()); i++) days.push(iso(new Date(now.getFullYear(), now.getMonth(), i)))
  for (let i = 0; days.length < 48; i++) days.push(iso(new Date(now.getFullYear(), now.getMonth(), -i * 2)))
  return days
}

export function SessionProvider({
  children,
  initialOnboarded,
  initialCellStatus,
  initialSampleData,
}: {
  children: ReactNode
  initialOnboarded?: boolean
  initialCellStatus?: CellStatus
  initialSampleData?: boolean
}) {
  const [sampleData, setSampleData] = useState<boolean>(() => initialSampleData ?? getItem('sampleData', false))
  const [dataEpoch, setDataEpoch] = useState(0)
  const [activeDays, setActiveDays] = useState<string[]>(() => (initialSampleData !== undefined ? (initialSampleData ? sampleActiveDays() : []) : getItem('activeDays', [])))
  const [onboarded, setOnboarded] = useState<boolean>(() => initialOnboarded ?? getItem('onboarded', false))
  const [profile, setProfile] = useState<Profile>(() => getItem('profile', empty))
  const [cellStatus, setCellStatusState] = useState<CellStatus>(() => initialCellStatus ?? getItem('cellStatus', 'none'))

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...p }
      setItem('profile', next)
      return next
    })
  }, [])

  const setCellStatus = useCallback((s: CellStatus) => {
    setCellStatusState(s)
    setItem('cellStatus', s)
  }, [])

  const finishOnboarding = useCallback(() => {
    setOnboarded(true)
    setItem('onboarded', true)
  }, [])

  const resetData = useCallback((sample: boolean) => {
    setSampleData(sample)
    setItem('sampleData', sample)
    const days = sample ? sampleActiveDays() : []
    setActiveDays(days)
    setItem('activeDays', days)
    setDataEpoch((e) => e + 1)
  }, [])

  const markActiveToday = useCallback(() => {
    setActiveDays((prev) => {
      const t = todayISO()
      if (prev.includes(t)) return prev
      const next = [...prev, t]
      setItem('activeDays', next)
      return next
    })
  }, [])

  const signOut = useCallback(() => {
    setOnboarded(false)
    setItem('onboarded', false)
    setCellStatusState('none')
    setItem('cellStatus', 'none')
    setProfile(empty)
    setItem('profile', empty)
    resetData(false)
  }, [resetData])

  const value = useMemo(
    () => ({ onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut, sampleData, dataEpoch, resetData, activeDays, markActiveToday }),
    [onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut, sampleData, dataEpoch, resetData, activeDays, markActiveToday],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider')
  return ctx
}
