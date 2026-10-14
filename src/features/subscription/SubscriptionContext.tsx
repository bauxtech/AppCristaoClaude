import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { getItem, setItem } from '../../lib/storage'
import { restorePurchase, syncSubscription } from '../../lib/store'
import { IS_REMOTE, supabase } from '../../lib/supabase'
import { useUserId } from '../../lib/sync'
import { useSession } from '../../state/session'
import { accessFromServer, localAccess, nextCharge, previewState, trialDaysLeft, type Access, type AccessPlan, type Billing, type Feature, type LocalSub, type PlanId, type PreviewSub } from './plan'

export type SubStatus = 'trial' | 'active' | 'canceledActive' | 'paymentFailed' | 'free'

interface SubValue {
  access: Access
  plan: AccessPlan
  /** Situação para as telas: teste, assinatura (e o estado dela) ou grátis. */
  status: SubStatus
  daysLeft: number
  trialEndsAt: string | null
  introSeen: boolean
  /** Pode usar a função agora. */
  can: (f: Feature) => boolean
  /** Plano mais barato que libera a função, para o cadeado ("No plano Completo"). */
  minPlan: (f: Feature) => PlanId
  /** Usa as funções da célula (plano próprio ou vaga do líder). Sem resposta do servidor ainda: segue o plano. */
  canUseCell: (cellId: string) => boolean
  /** A célula funciona (tem líder no plano Líder). */
  cellActive: (cellId: string) => boolean
  /** Membro sem plano e sem vaga numa célula funcionando: vê a reunião e confirma presença; pedidos, escala e avisos ficam trancados. */
  cellSeatless: (cellId: string) => boolean
  /** Entrou pelo Google ou pela Apple e ainda não confirmou o celular: o teste começa depois disso. */
  needsPhoneForTrial: boolean
  /** Dia 8: a tela de planos aparece uma vez ao abrir o app. */
  showEndOfTrial: boolean
  markPaywallSeen: () => void
  seeIntro: () => void
  /** Busca de novo no servidor (depois de comprar, restaurar ou confirmar o celular). */
  refresh: () => Promise<void>
  /** Só na prévia: compra de exemplo. Com a loja ligada, quem libera é o servidor. */
  subscribe: (plan: PlanId, billing: Billing) => void
  restore: () => Promise<boolean>
  setPreview: (k: PreviewSub) => void
}

const Ctx = createContext<SubValue | null>(null)
const emptyLocal: LocalSub = { trialStart: null, introSeen: false, paywallSeen: false, plan: null }

export function SubscriptionProvider({ children, initial, now }: { children: ReactNode; initial?: Partial<LocalSub>; now?: Date }) {
  const { onboarded, sampleData } = useSession()
  const uid = useUserId()
  const remote = IS_REMOTE && !initial && !sampleData
  const [local, setLocal] = useState<LocalSub>(() => (initial ? { ...emptyLocal, ...initial } : getItem<LocalSub>('subscription', emptyLocal)))
  const [server, setServer] = useState<Access | null>(() => (remote ? getItem<Access | null>('access', null) : null))

  useEffect(() => {
    if (!initial) setItem('subscription', local)
  }, [local, initial])
  // Prévia: o teste começa no primeiro login, contado no aparelho. Com o servidor, quem marca é o banco.
  useEffect(() => {
    if (!remote && onboarded && !local.trialStart) setLocal((s) => ({ ...s, trialStart: new Date().toISOString() }))
  }, [remote, onboarded, local.trialStart])

  const [failures, setFailures] = useState(0)
  const refresh = useCallback(async () => {
    if (!remote || !uid || !supabase) return
    const { data, error } = await supabase.rpc('my_access')
    if (error || !data) {
      setFailures((n) => n + 1)
      return
    }
    setFailures(0)
    const a = accessFromServer(data)
    setServer(a)
    setItem('access', a)
  }, [remote, uid])
  // Sem resposta (sem internet, erro): tenta de novo, cada vez mais devagar, até 5 vezes.
  useEffect(() => {
    if (!remote || !uid || failures === 0 || failures > 5) return
    const t = setTimeout(() => void refresh(), Math.min(60_000, 5_000 * failures))
    return () => clearTimeout(t)
  }, [remote, uid, failures, refresh])

  useEffect(() => {
    if (!remote || !uid) return
    void refresh()
    // Ao voltar para o app: o dia pode ter virado, o teste terminado ou a assinatura renovado.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh()
    })
    return () => sub.remove()
  }, [remote, uid, refresh])
  // Saiu da conta: esquece o acesso da conta anterior.
  useEffect(() => {
    if (remote && !uid && server) {
      setServer(null)
      setItem('access', null)
    }
  }, [remote, uid, server])

  const value = useMemo<SubValue>(() => {
    const at = now ?? new Date()
    // Antes da primeira resposta do servidor, nada aparece trancado: quem confere de verdade é o servidor.
    const loading = remote && !server
    const a = remote ? (server ?? accessFromServer({ plan: 'free' })) : localAccess(local, at)
    const storeLive = a.plan !== 'free' && a.plan !== 'trial'
    const status: SubStatus = a.plan === 'trial' ? 'trial' : storeLive ? (a.storeStatus === 'canceledActive' || a.storeStatus === 'paymentFailed' ? a.storeStatus : 'active') : 'free'
    const can = (f: Feature) => loading || a.features.includes(f)
    return {
      access: a,
      plan: a.plan,
      status,
      daysLeft: a.plan === 'trial' ? trialDaysLeft(a.trialEndsAt, at) : 0,
      trialEndsAt: a.trialEndsAt,
      introSeen: local.introSeen,
      can,
      minPlan: (f) => a.minPlan[f],
      // Célula que ainda não veio na resposta (acabou de entrar): o servidor decide; a tela não tranca antes.
      canUseCell: (id) => a.cells[id]?.canUse ?? true,
      cellActive: (id) => a.cells[id]?.active ?? true,
      cellSeatless: (id) => !!a.cells[id]?.active && a.cells[id]?.seat === 'none',
      needsPhoneForTrial: remote && !!server && a.trialMode === 'server' && a.plan === 'free' && !a.trialUsed && !a.trialStart,
      showEndOfTrial: a.plan === 'free' && !!a.trialStart && !a.paywallSeen && (remote ? !!server : true),
      markPaywallSeen: () => {
        if (remote && supabase) {
          setServer((s) => (s ? { ...s, paywallSeen: true } : s))
          void supabase.rpc('mark_paywall_seen').then(() => refresh())
        } else setLocal((s) => ({ ...s, paywallSeen: true }))
      },
      seeIntro: () => setLocal((s) => ({ ...s, introSeen: true })),
      refresh,
      subscribe: (plan, billing) => setLocal((s) => ({ ...s, introSeen: true, plan: { id: plan, billing, status: 'active', renewsAt: nextCharge(billing) } })),
      restore: async () => {
        const found = await restorePurchase()
        if (!found) return false
        if (remote) {
          await syncSubscription()
          await refresh()
        } else setLocal((s) => ({ ...s, plan: { id: found.plan, billing: found.billing, status: 'active', renewsAt: nextCharge(found.billing) } }))
        return true
      },
      setPreview: (k) => setLocal(previewState(k)),
    }
  }, [remote, server, local, now, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSubscription() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSubscription fora do SubscriptionProvider')
  return v
}
