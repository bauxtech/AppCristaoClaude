import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../lib/storage'
import { enqueue, useUserId } from '../lib/sync'
import { supabase } from '../lib/supabase'
import { pushProfile } from '../lib/account'
import { registerPushToken } from '../lib/push'

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
  /** Opcional. Usado para enviar o arquivo de Meus dados. */
  email?: string
}

interface SessionValue {
  onboarded: boolean
  profile: Profile
  cellStatus: CellStatus
  /** Grava no aparelho e manda para o banco. Com fromServer, só grava no aparelho (veio do banco). */
  updateProfile: (p: Partial<Profile>, opts?: { fromServer?: boolean }) => void
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
  /** Minutos de leitura e oração por dia (AAAA-MM-DD). */
  minutes: Record<string, { reading: number; prayer: number }>
  addMinutes: (kind: 'reading' | 'prayer', mins: number) => void
}

const empty: Profile = { name: '', phone: '', tradition: null, goal: null, time: null, church: null }

const SessionContext = createContext<SessionValue | null>(null)

function todayISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Semana de exemplo do protótipo: leitura e oração por dia, de segunda a domingo. */
export function sampleMinutes(now = new Date()) {
  const reading = [40, 25, 55, 0, 30, 70, 44]
  const prayer = [15, 10, 20, 0, 15, 30, 22]
  const pad = (n: number) => String(n).padStart(2, '0')
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const out: Record<string, { reading: number; prayer: number }> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    if (d > now) break
    out[`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`] = { reading: reading[i], prayer: prayer[i] }
  }
  return out
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
  const [minutes, setMinutes] = useState<Record<string, { reading: number; prayer: number }>>(() =>
    initialSampleData !== undefined ? (initialSampleData ? sampleMinutes() : {}) : getItem('minutes', {}),
  )
  const activeDaysRef = useRef(activeDays)
  activeDaysRef.current = activeDays
  const [onboarded, setOnboarded] = useState<boolean>(() => initialOnboarded ?? getItem('onboarded', false))
  const [profile, setProfile] = useState<Profile>(() => getItem('profile', empty))
  const [cellStatus, setCellStatusState] = useState<CellStatus>(() => initialCellStatus ?? getItem('cellStatus', 'none'))

  const updateProfile = useCallback((p: Partial<Profile>, opts?: { fromServer?: boolean }) => {
    if (!opts?.fromServer) pushProfile(p)
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
    const mins = sample ? sampleMinutes() : {}
    setMinutes(mins)
    setItem('minutes', mins)
    setDataEpoch((e) => e + 1)
  }, [])

  // Dia com leitura ou oração e os minutos do dia vão para activity_days. Dados de exemplo não vão.
  const sample = useRef(sampleData)
  sample.current = sampleData
  const minutesRef = useRef(minutes)
  minutesRef.current = minutes
  const pushDay = useCallback((day: string, m: { reading: number; prayer: number }) => {
    if (sample.current) return
    enqueue({ kind: 'upsert', table: 'activity_days', row: { user_id: '$uid', day, reading_minutes: m.reading, prayer_minutes: m.prayer }, onConflict: 'user_id,day' })
  }, [])

  const markActiveToday = useCallback(() => {
    const t = todayISO()
    if (activeDaysRef.current.includes(t)) return
    const next = [...activeDaysRef.current, t]
    activeDaysRef.current = next
    setActiveDays(next)
    setItem('activeDays', next)
    pushDay(t, minutesRef.current[t] ?? { reading: 0, prayer: 0 })
  }, [pushDay])

  const addMinutes = useCallback(
    (kind: 'reading' | 'prayer', mins: number) => {
      if (mins <= 0) return
      const t = todayISO()
      const cur = minutesRef.current[t] ?? { reading: 0, prayer: 0 }
      const day = { ...cur, [kind]: cur[kind] + mins }
      const next = { ...minutesRef.current, [t]: day }
      minutesRef.current = next
      setMinutes(next)
      setItem('minutes', next)
      pushDay(t, day)
    },
    [pushDay],
  )

  // Ao entrar: traz do banco os dias com leitura ou oração, para o total aparecer em qualquer celular.
  const uid = useUserId()
  // Ao entrar: o servidor passa a saber para qual aparelho mandar os avisos desta conta.
  useEffect(() => {
    if (uid && !sampleData) void registerPushToken(uid)
  }, [uid, sampleData])
  useEffect(() => {
    if (!uid || sampleData || !supabase) return
    let alive = true
    supabase
      .from('activity_days')
      .select('day, reading_minutes, prayer_minutes')
      .eq('user_id', uid)
      .then(({ data, error }) => {
        if (!alive || error || !data) return
        const days = [...new Set([...data.map((d) => d.day as string), ...activeDaysRef.current])].sort()
        setActiveDays(days)
        setItem('activeDays', days)
        const mins = { ...minutesRef.current }
        for (const d of data) mins[d.day] = { reading: Math.max(d.reading_minutes, mins[d.day]?.reading ?? 0), prayer: Math.max(d.prayer_minutes, mins[d.day]?.prayer ?? 0) }
        minutesRef.current = mins
        setMinutes(mins)
        setItem('minutes', mins)
      })
    return () => {
      alive = false
    }
  }, [uid, sampleData])

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
    () => ({ onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut, sampleData, dataEpoch, resetData, activeDays, markActiveToday, minutes, addMinutes }),
    [onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut, sampleData, dataEpoch, resetData, activeDays, markActiveToday, minutes, addMinutes],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider')
  return ctx
}
