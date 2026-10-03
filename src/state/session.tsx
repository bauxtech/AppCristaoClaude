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
}

const empty: Profile = { name: '', phone: '', tradition: null, goal: null, time: null, church: null }

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children, initialOnboarded }: { children: ReactNode; initialOnboarded?: boolean }) {
  const [onboarded, setOnboarded] = useState<boolean>(() => initialOnboarded ?? getItem('onboarded', false))
  const [profile, setProfile] = useState<Profile>(() => getItem('profile', empty))
  const [cellStatus, setCellStatusState] = useState<CellStatus>(() => getItem('cellStatus', 'none'))

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

  const signOut = useCallback(() => {
    setOnboarded(false)
    setItem('onboarded', false)
  }, [])

  const value = useMemo(
    () => ({ onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut }),
    [onboarded, profile, cellStatus, updateProfile, setCellStatus, finishOnboarding, signOut],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider')
  return ctx
}
