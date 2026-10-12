// Webhook do RevenueCat: traduz o evento da loja para a tabela de assinaturas.
// O app usa o id do usuário do Supabase como app_user_id no RevenueCat.

export const GRACE_DAYS = 7

export interface RcEvent {
  type: string
  app_user_id: string
  product_id?: string
  /** Para troca de plano: o produto novo. */
  new_product_id?: string
  entitlement_ids?: string[] | null
  store?: string
  purchased_at_ms?: number | null
  expiration_at_ms?: number | null
  /** PRODUCTION ou SANDBOX (compra de teste). */
  environment?: string
  /** Só em TRANSFER: de quem e para quem a compra passou. */
  transferred_from?: string[]
  transferred_to?: string[]
  grace_period_expiration_at_ms?: number | null
}

export type PlanId = 'essencial' | 'completo' | 'lider'
/** Do maior para o menor. Os nomes são os dos entitlements no painel do RevenueCat. */
export const PLAN_ORDER: PlanId[] = ['lider', 'completo', 'essencial']

/** O maior plano entre os entitlements, ou pelo nome do produto (ex.: amora_completo_anual). */
export function planFrom(entitlements: string[] | null | undefined, productId?: string | null): PlanId | null {
  for (const p of PLAN_ORDER) if (entitlements?.includes(p)) return p
  for (const p of PLAN_ORDER) if (productId && new RegExp(p, 'i').test(productId)) return p
  return null
}

export const billingOf = (productId?: string | null): 'monthly' | 'annual' => (/annual|anual|year|ano/i.test(productId ?? '') ? 'annual' : 'monthly')

export interface SubscriptionPatch {
  user_id: string
  status: 'active' | 'canceled_active' | 'payment_failed' | 'expired'
  plan?: PlanId | null
  product_id?: string | null
  period_start?: string | null
  billing?: 'monthly' | 'annual'
  renews_at?: string | null
  grace_until?: string | null
  store?: 'app_store' | 'play_store'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Devolve a mudança na assinatura, ou nulo para eventos que não mudam nada (teste, transferência). */
export function patchFromEvent(e: RcEvent, now = new Date()): SubscriptionPatch | null {
  if (!UUID.test(e.app_user_id)) return null
  const iso = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null)
  const product = e.new_product_id ?? e.product_id ?? null
  const plan = planFrom(e.entitlement_ids, product)
  const base: Partial<SubscriptionPatch> = {
    billing: billingOf(product),
    store: e.store === 'APP_STORE' ? 'app_store' : e.store === 'PLAY_STORE' ? 'play_store' : undefined,
    ...(plan ? { plan } : {}),
    ...(product ? { product_id: product } : {}),
  }
  switch (e.type) {
    // PRODUCT_CHANGE não muda nada sozinho: a troca para um plano menor só vale na renovação.
    // Com a chave secreta, o webhook consulta o RevenueCat e grava o que vale de fato.
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
      // Novo período: o contador de cultos zera a partir daqui.
      return { ...base, user_id: e.app_user_id, status: 'active', renews_at: iso(e.expiration_at_ms), grace_until: null, ...(e.purchased_at_ms ? { period_start: iso(e.purchased_at_ms) } : {}) }
    case 'CANCELLATION':
      // Cancelada, mas continua ativa até o fim do período pago.
      return { ...base, user_id: e.app_user_id, status: 'canceled_active', renews_at: iso(e.expiration_at_ms) }
    case 'BILLING_ISSUE':
      return { ...base, user_id: e.app_user_id, status: 'payment_failed', grace_until: iso(e.grace_period_expiration_at_ms) ?? new Date(now.getTime() + GRACE_DAYS * 86400_000).toISOString() }
    case 'EXPIRATION':
      return { ...base, user_id: e.app_user_id, status: 'expired' }
    default:
      return null
  }
}

/** Confere o segredo configurado no painel do RevenueCat (cabeçalho Authorization). */
export function validWebhookAuth(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false
  const expected = `Bearer ${secret}`
  if (header.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** Assinante como a API do RevenueCat devolve (GET /v1/subscribers/{id}). Só os campos usados. */
export interface RcSubscriber {
  entitlements?: Record<string, { expires_date: string | null; product_identifier: string; purchase_date: string }>
  subscriptions?: Record<string, { expires_date: string | null; purchase_date: string; store?: string; is_sandbox?: boolean; unsubscribe_detected_at?: string | null; billing_issues_detected_at?: string | null; grace_period_expires_date?: string | null }>
}

/** Mesma tradução do webhook, a partir da consulta direta (logo depois de comprar ou restaurar). */
export function patchFromSubscriber(userId: string, sub: RcSubscriber, now = new Date(), allowSandbox = false): SubscriptionPatch | null {
  if (!UUID.test(userId)) return null
  // Compra de teste (TestFlight, testador do Google) não libera nada em produção.
  const real = (productId: string) => allowSandbox || !sub.subscriptions?.[productId]?.is_sandbox
  const active = Object.entries(sub.entitlements ?? {}).filter(([, e]) => (!e.expires_date || new Date(e.expires_date) > now) && real(e.product_identifier))
  const plan = planFrom(active.map(([id]) => id))
  if (!plan) {
    const hadAny = Object.keys(sub.entitlements ?? {}).length > 0
    return hadAny ? { user_id: userId, status: 'expired' } : null
  }
  const ent = active.find(([id]) => id === plan)![1]
  const s = sub.subscriptions?.[ent.product_identifier]
  const store = s?.store === 'app_store' ? 'app_store' : s?.store === 'play_store' ? 'play_store' : undefined
  const status: SubscriptionPatch['status'] = s?.billing_issues_detected_at ? 'payment_failed' : s?.unsubscribe_detected_at ? 'canceled_active' : 'active'
  return {
    user_id: userId,
    status,
    plan,
    product_id: ent.product_identifier,
    billing: billingOf(ent.product_identifier),
    renews_at: ent.expires_date,
    period_start: s?.purchase_date ?? ent.purchase_date,
    ...(status === 'payment_failed' ? { grace_until: s?.grace_period_expires_date ?? new Date(now.getTime() + GRACE_DAYS * 86400_000).toISOString() } : { grace_until: null }),
    ...(store ? { store } : {}),
  }
}

/** Ids de quem o evento afeta. Na transferência, a conta que perdeu e a que ganhou a compra. */
export function affectedUsers(e: RcEvent): string[] {
  const ids = e.type === 'TRANSFER' ? [...(e.transferred_from ?? []), ...(e.transferred_to ?? [])] : [e.app_user_id]
  return [...new Set(ids)].filter((id) => UUID.test(id))
}

/** Consulta o assinante no RevenueCat. Nulo se a consulta falhar. */
export async function fetchSubscriber(userId: string, secretKey: string): Promise<RcSubscriber | null> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${secretKey}` } })
  if (!res.ok) return null
  const body = (await res.json().catch(() => null)) as { subscriber?: RcSubscriber } | null
  return body?.subscriber ?? null
}
