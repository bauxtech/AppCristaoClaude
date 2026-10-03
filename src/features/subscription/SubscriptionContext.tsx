import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { restorePurchase } from '../../lib/store'
import { useSession } from '../../state/session'
import { nextCharge, previewState, subStatus, trialDaysLeft, trialEnd, type Billing, type PreviewSub, type SubState, type SubStatus } from './plan'

interface SubValue extends SubState {
  status: SubStatus
  daysLeft: number
  /** Data em que o teste termina. */
  trialEndsAt: string | null
  seeIntro: () => void
  subscribe: (billing: Billing) => void
  /** Troca entre mensal e anual. Vale a partir da próxima cobrança. */
  changeBilling: (billing: Billing) => void
  restore: () => Promise<boolean>
  setPreview: (k: PreviewSub) => void
}

const Ctx = createContext<SubValue | null>(null)
const empty: SubState = { trialStart: null, introSeen: false, plan: null }

export function SubscriptionProvider({ children, initial, now }: { children: ReactNode; initial?: Partial<SubState>; now?: Date }) {
  const { onboarded } = useSession()
  const [state, setState] = useState<SubState>(() => (initial ? { ...empty, ...initial } : getItem<SubState>('subscription', empty)))
  useEffect(() => {
    if (!initial) setItem('subscription', state)
  }, [state, initial])
  // O teste começa no primeiro login.
  useEffect(() => {
    if (onboarded && !state.trialStart) setState((s) => ({ ...s, trialStart: new Date().toISOString() }))
  }, [onboarded, state.trialStart])
  // Sair e entrar de novo não recomeça o teste. No servidor, o início do teste fica preso à conta.

  const value = useMemo<SubValue>(() => {
    const at = now ?? new Date()
    return {
      ...state,
      status: subStatus(state, at),
      daysLeft: trialDaysLeft(state.trialStart, at),
      trialEndsAt: state.trialStart ? trialEnd(state.trialStart).toISOString() : null,
      seeIntro: () => setState((s) => ({ ...s, introSeen: true })),
      subscribe: (billing) => setState((s) => ({ ...s, introSeen: true, plan: { billing, status: 'active', renewsAt: nextCharge(billing) } })),
      changeBilling: (billing) => setState((s) => (s.plan ? { ...s, plan: { ...s.plan, billing } } : s)),
      restore: async () => {
        const found = await restorePurchase()
        if (found) setState((s) => ({ ...s, plan: { billing: found, status: 'active', renewsAt: nextCharge(found) } }))
        return !!found
      },
      setPreview: (k) => setState(previewState(k)),
    }
  }, [state, now])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSubscription() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSubscription fora do SubscriptionProvider')
  return v
}
