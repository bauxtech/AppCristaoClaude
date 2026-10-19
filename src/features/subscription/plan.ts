// Planos (decisão do Thiago, 12/10): Essencial, Completo e Líder, mensal ou anual, com os mesmos limites.
// Teste: 7 dias corridos pelo servidor, sem forma de pagamento, um por número de celular.
// Depois do teste sem plano: só a Bíblia continua. O que a pessoa criou fica para leitura.
// Quem decide o acesso é o servidor (my_access). O app só mostra; os limites aqui são o padrão até a primeira resposta.

export type PlanId = 'essencial' | 'completo' | 'lider'
export type AccessPlan = 'free' | 'trial' | PlanId
export type Billing = 'monthly' | 'annual'
export type Feature = 'reading_plans' | 'prayer' | 'church' | 'music' | 'chat' | 'sermon' | 'cell' | 'cell_lead' | 'course_photo'

export const TRIAL_DAYS = 7
/** Prazo para regularizar na loja quando a renovação falha. */
export const GRACE_DAYS = 7

export interface PlanInfo {
  id: PlanId
  name: string
  prices: Record<Billing, { amount: string; per: string }>
  /** Quanto o anual economiza em relação a 12 meses do mensal. */
  annualSaving: string
  items: string[]
}

// Preços em real ainda dependem da tabela da App Store. O que vale na compra é o preço que a loja mostra.
export const PLANS: PlanInfo[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    prices: { monthly: { amount: 'R$ 19,90', per: 'por mês' }, annual: { amount: 'R$ 159,90', per: 'por ano' } },
    annualSaving: '33%',
    items: ['Bíblia completa, planos de leitura, grifos, notas e busca', 'Oração guiada, diário, pedidos e campanhas', 'Igreja, ministérios, cursos e música', 'Participar de célula', 'Chat bíblico: 5 perguntas por dia'],
  },
  {
    id: 'completo',
    name: 'Completo',
    prices: { monthly: { amount: 'R$ 29,90', per: 'por mês' }, annual: { amount: 'R$ 239,90', per: 'por ano' } },
    annualSaving: '33%',
    items: ['Tudo do Essencial', 'Chat bíblico: 10 perguntas por dia', 'Gravar e transcrever culto: 4 por mês, até 90 minutos cada'],
  },
  {
    id: 'lider',
    name: 'Líder',
    prices: { monthly: { amount: 'R$ 49,90', per: 'por mês' }, annual: { amount: 'R$ 399,90', per: 'por ano' } },
    annualSaving: '33%',
    items: ['Tudo do Completo', 'Gravar e transcrever culto: 8 por mês, até 90 minutos cada', 'Criar e conduzir célula: escala, roteiro, presença, membros, avisos e página web', 'Até 20 membros da célula entram sem plano, só para as funções da célula'],
  },
]

export const PLAN_NAME: Record<AccessPlan, string> = { free: 'Grátis', trial: 'Teste grátis', essencial: 'Essencial', completo: 'Completo', lider: 'Líder' }
export const planInfo = (id: PlanId) => PLANS.find((p) => p.id === id)!

/** Padrão igual ao plan_config do servidor. Vale na prévia e antes da primeira resposta do servidor. */
const DEFAULTS: Record<AccessPlan, { features: Feature[]; chat: number; sermon: number }> = {
  free: { features: [], chat: 0, sermon: 0 },
  essencial: { features: ['reading_plans', 'prayer', 'church', 'music', 'cell', 'chat'], chat: 5, sermon: 0 },
  completo: { features: ['reading_plans', 'prayer', 'church', 'music', 'cell', 'chat', 'sermon', 'course_photo'], chat: 10, sermon: 4 },
  lider: { features: ['reading_plans', 'prayer', 'church', 'music', 'cell', 'chat', 'sermon', 'cell_lead', 'course_photo'], chat: 10, sermon: 8 },
  trial: { features: ['reading_plans', 'prayer', 'church', 'music', 'cell', 'chat', 'sermon', 'cell_lead', 'course_photo'], chat: 10, sermon: 2 },
}
const DEFAULT_MIN: Record<Feature, PlanId> = { reading_plans: 'essencial', prayer: 'essencial', church: 'essencial', music: 'essencial', cell: 'essencial', chat: 'essencial', sermon: 'completo', cell_lead: 'lider', course_photo: 'completo' }

export type StoreStatus = 'active' | 'canceledActive' | 'paymentFailed' | 'expired' | null

export interface Access {
  plan: AccessPlan
  features: Feature[]
  minPlan: Record<Feature, PlanId>
  trialStart: string | null
  trialEndsAt: string | null
  /** A conta já usou o teste (ou o número já tinha usado). */
  trialUsed: boolean
  trialMode: 'server' | 'store'
  storePlan: PlanId | null
  storeStatus: StoreStatus
  billing: Billing | null
  renewsAt: string | null
  graceUntil: string | null
  paywallSeen: boolean
  chat: { limit: number; used: number; resetsAt: string | null }
  sermon: { limit: number; used: number; resetsAt: string | null }
  /**
   * Células em que a pessoa é membro aprovado: se a célula funciona, se ela usa as funções
   * e a vaga (plan: plano próprio, seat: vaga do líder, visitor: visitante, none: sem vaga).
   */
  cells: Record<string, { active: boolean; canUse: boolean; seat: SeatState | null }>
}

type ServerAccess = {
  plan?: string
  features?: string[] | null
  min_plan?: Record<string, string> | null
  trial_start?: string | null
  trial_ends_at?: string | null
  trial_used?: boolean
  trial_mode?: string | null
  store_plan?: string | null
  status?: string | null
  billing?: string | null
  renews_at?: string | null
  grace_until?: string | null
  paywall_seen?: boolean
  chat?: { limit?: number; used?: number; resets_at?: string | null }
  sermon?: { limit?: number; used?: number; resets_at?: string | null }
  cells?: Record<string, { active?: boolean; can_use?: boolean; seat?: string | null }> | null
}

export type SeatState = 'plan' | 'seat' | 'visitor' | 'none'
const SEATS: SeatState[] = ['plan', 'seat', 'visitor', 'none']
export const seatState = (v: unknown): SeatState | null => (SEATS.includes(v as SeatState) ? (v as SeatState) : null)

const STATUS: Record<string, StoreStatus> = { active: 'active', canceled_active: 'canceledActive', payment_failed: 'paymentFailed', expired: 'expired' }
const isPlan = (p: unknown): p is AccessPlan => typeof p === 'string' && p in DEFAULTS

export function accessFromServer(r: ServerAccess): Access {
  const plan: AccessPlan = isPlan(r.plan) ? r.plan : 'free'
  return {
    plan,
    features: (r.features ?? DEFAULTS[plan].features) as Feature[],
    minPlan: { ...DEFAULT_MIN, ...((r.min_plan ?? {}) as Record<Feature, PlanId>) },
    trialStart: r.trial_start ?? null,
    trialEndsAt: r.trial_ends_at ?? null,
    trialUsed: !!r.trial_used,
    trialMode: r.trial_mode === 'store' ? 'store' : 'server',
    storePlan: r.store_plan === 'essencial' || r.store_plan === 'completo' || r.store_plan === 'lider' ? r.store_plan : null,
    storeStatus: (r.status ? STATUS[r.status] : null) ?? null,
    billing: r.billing === 'annual' ? 'annual' : r.billing === 'monthly' ? 'monthly' : null,
    renewsAt: r.renews_at ?? null,
    graceUntil: r.grace_until ?? null,
    paywallSeen: !!r.paywall_seen,
    chat: { limit: r.chat?.limit ?? DEFAULTS[plan].chat, used: r.chat?.used ?? 0, resetsAt: r.chat?.resets_at ?? null },
    sermon: { limit: r.sermon?.limit ?? DEFAULTS[plan].sermon, used: r.sermon?.used ?? 0, resetsAt: r.sermon?.resets_at ?? null },
    cells: Object.fromEntries(Object.entries(r.cells ?? {}).map(([id, c]) => [id, { active: !!c.active, canUse: !!c.can_use, seat: seatState(c.seat) }])),
  }
}

const DAY = 86400_000
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Fim do teste: meia-noite depois do 7º dia, contando o dia do primeiro login. */
export function trialEnd(trialStart: string) {
  return new Date(startOfDay(new Date(trialStart)).getTime() + TRIAL_DAYS * DAY)
}

/** Dias que faltam, contando hoje. No primeiro dia faltam 7; no último, 1. */
export function trialDaysLeft(trialEndsAt: string | null, now = new Date()) {
  if (!trialEndsAt) return 0
  const left = Math.ceil((new Date(trialEndsAt).getTime() - startOfDay(now).getTime()) / DAY)
  return Math.max(0, Math.min(TRIAL_DAYS, left))
}

/** Estado só da prévia (sem servidor): o teste conta no aparelho e a compra é de exemplo. */
export interface LocalSub {
  trialStart: string | null
  introSeen: boolean
  paywallSeen: boolean
  plan: { id: PlanId; billing: Billing; status: 'active' | 'canceledActive' | 'paymentFailed'; renewsAt: string; graceUntil?: string } | null
}

export function nextCharge(billing: Billing, from = new Date()) {
  const d = new Date(from)
  if (billing === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

export function localAccess(s: LocalSub, now = new Date()): Access {
  const p = s.plan
  const storeActive = !!p && (p.status === 'active' || (p.status === 'canceledActive' && new Date(p.renewsAt) > now) || (p.status === 'paymentFailed' && (!p.graceUntil || new Date(p.graceUntil) > now)))
  const trialEndsAt = s.trialStart ? trialEnd(s.trialStart).toISOString() : null
  const plan: AccessPlan = storeActive ? p!.id : trialEndsAt && now < new Date(trialEndsAt) ? 'trial' : 'free'
  const d = DEFAULTS[plan]
  return {
    plan,
    features: d.features,
    minPlan: DEFAULT_MIN,
    trialStart: s.trialStart,
    trialEndsAt,
    trialUsed: !!s.trialStart,
    trialMode: 'server',
    storePlan: p?.id ?? null,
    storeStatus: p ? (storeActive ? p.status : 'expired') : null,
    billing: p?.billing ?? null,
    renewsAt: p?.renewsAt ?? null,
    graceUntil: p?.graceUntil ?? null,
    paywallSeen: s.paywallSeen,
    chat: { limit: d.chat, used: 0, resetsAt: null },
    sermon: { limit: d.sermon, used: 0, resetsAt: null },
    cells: {},
  }
}

/** Estados da prévia: teste no dia 2, último dia, sem plano, cada plano, pagamento falhou e cancelada. */
export type PreviewSub = 'trialDay2' | 'lastDay' | 'free' | 'essencial' | 'completo' | 'lider' | 'paymentFailed' | 'canceledActive'

export function previewState(kind: PreviewSub, now = new Date()): LocalSub {
  const daysAgo = (n: number) => new Date(startOfDay(now).getTime() - n * DAY).toISOString()
  const inDays = (n: number) => new Date(now.getTime() + n * DAY).toISOString()
  const base = { introSeen: true, paywallSeen: true }
  switch (kind) {
    case 'trialDay2':
      return { ...base, trialStart: daysAgo(1), plan: null }
    case 'lastDay':
      return { ...base, trialStart: daysAgo(TRIAL_DAYS - 1), plan: null }
    case 'free':
      return { ...base, paywallSeen: false, trialStart: daysAgo(TRIAL_DAYS + 1), plan: null }
    case 'essencial':
    case 'completo':
    case 'lider':
      return { ...base, trialStart: daysAgo(30), plan: { id: kind, billing: 'monthly', status: 'active', renewsAt: inDays(20) } }
    case 'paymentFailed':
      return { ...base, trialStart: daysAgo(40), plan: { id: 'completo', billing: 'monthly', status: 'paymentFailed', renewsAt: inDays(0), graceUntil: inDays(GRACE_DAYS) } }
    case 'canceledActive':
      return { ...base, trialStart: daysAgo(30), plan: { id: 'completo', billing: 'monthly', status: 'canceledActive', renewsAt: inDays(12) } }
  }
}
