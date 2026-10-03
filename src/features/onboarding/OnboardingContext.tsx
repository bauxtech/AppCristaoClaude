import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Rascunho do cadastro enquanto a pessoa passa pelas telas. Some quando o cadastro termina.

interface Draft {
  ddd: string
  number: string
  channel: 'whatsapp' | 'sms'
  /** Chegou por link de convite de célula: pula nome, tradição, objetivo, horário e igreja. */
  viaInvite: boolean
  /** Entrou com Google ou Apple: não passa pelo código. */
  social: boolean
}

interface Ctx {
  draft: Draft
  setDraft: (d: Partial<Draft>) => void
}

const OnboardingContext = createContext<Ctx | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, set] = useState<Draft>({ ddd: '', number: '', channel: 'whatsapp', viaInvite: false, social: false })
  const value = useMemo(() => ({ draft, setDraft: (d: Partial<Draft>) => set((prev) => ({ ...prev, ...d })) }), [draft])
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding precisa estar dentro de OnboardingProvider')
  return ctx
}
