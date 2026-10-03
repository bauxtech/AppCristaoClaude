// Regras da assinatura (CLAUDE.md): 7 dias grátis controlados pelo app, sem forma de pagamento.
// Depois, bloqueia tudo para quem não assina. Um plano só, mensal ou anual.
// O preço ainda não foi decidido: R$ 00,00 até lá.

export const TRIAL_DAYS = 7
/** Prazo para regularizar na loja quando a renovação falha (texto do protótipo). */
export const GRACE_DAYS = 7

export type Billing = 'monthly' | 'annual'

export const PRICES: Record<Billing, { label: string; amount: string; per: string }> = {
  monthly: { label: 'Mensal', amount: 'R$ 00,00', per: 'por mês' },
  annual: { label: 'Anual', amount: 'R$ 00,00', per: 'por ano' },
}

/** O que o plano inclui, já com os limites decididos. */
export const FEATURES = [
  'Bíblia com planos de leitura, notas e grifos',
  'Chat bíblico, 20 perguntas por dia',
  'Gravação e resumo de cultos, 5 por mês',
  'Oração guiada, pedidos e diário',
  'Célula: agenda, escala, pedidos e presença',
  'Igreja, cursos e ministérios',
  'Músicas por momento',
]

export type PlanStatus = 'active' | 'canceledActive' | 'paymentFailed'
export type SubStatus = 'trial' | PlanStatus | 'blocked'

export interface Plan {
  billing: Billing
  status: PlanStatus
  /** Próxima cobrança, ou fim do período quando cancelada. */
  renewsAt: string
  /** Prazo para regularizar quando o pagamento falhou. */
  graceUntil?: string
}

export interface SubState {
  /** Primeiro login. O teste conta a partir daqui. */
  trialStart: string | null
  introSeen: boolean
  plan: Plan | null
}

const DAY = 86400_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function trialEnd(trialStart: string) {
  const s = startOfDay(new Date(trialStart))
  return new Date(s.getTime() + TRIAL_DAYS * DAY)
}

/** Dias que faltam, contando hoje. No primeiro dia faltam 7; no último, 1. */
export function trialDaysLeft(trialStart: string | null, now = new Date()) {
  if (!trialStart) return TRIAL_DAYS
  const left = Math.ceil((trialEnd(trialStart).getTime() - startOfDay(now).getTime()) / DAY)
  return Math.max(0, Math.min(TRIAL_DAYS, left))
}

export function subStatus(s: SubState, now = new Date()): SubStatus {
  if (s.plan) {
    const { status, renewsAt, graceUntil } = s.plan
    if (status === 'canceledActive' && new Date(renewsAt) <= now) return 'blocked'
    if (status === 'paymentFailed' && graceUntil && new Date(graceUntil) <= now) return 'blocked'
    return status
  }
  return trialDaysLeft(s.trialStart, now) > 0 ? 'trial' : 'blocked'
}

export function nextCharge(billing: Billing, from = new Date()) {
  const d = new Date(from)
  if (billing === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

/** Estados da prévia, pedidos no documento: teste no dia 2, último dia, bloqueado e assinante. */
export type PreviewSub = 'trialDay2' | 'lastDay' | 'blocked' | 'active' | 'paymentFailed' | 'canceledActive'

export function previewState(kind: PreviewSub, now = new Date()): SubState {
  const daysAgo = (n: number) => new Date(startOfDay(now).getTime() - n * DAY).toISOString()
  const inDays = (n: number) => new Date(now.getTime() + n * DAY).toISOString()
  switch (kind) {
    case 'trialDay2':
      return { trialStart: daysAgo(1), introSeen: true, plan: null }
    case 'lastDay':
      return { trialStart: daysAgo(TRIAL_DAYS - 1), introSeen: true, plan: null }
    case 'blocked':
      return { trialStart: daysAgo(TRIAL_DAYS + 2), introSeen: true, plan: null }
    case 'active':
      return { trialStart: daysAgo(30), introSeen: true, plan: { billing: 'monthly', status: 'active', renewsAt: inDays(20) } }
    case 'paymentFailed':
      return { trialStart: daysAgo(40), introSeen: true, plan: { billing: 'monthly', status: 'paymentFailed', renewsAt: inDays(0), graceUntil: inDays(GRACE_DAYS) } }
    case 'canceledActive':
      return { trialStart: daysAgo(30), introSeen: true, plan: { billing: 'monthly', status: 'canceledActive', renewsAt: inDays(12) } }
  }
}
