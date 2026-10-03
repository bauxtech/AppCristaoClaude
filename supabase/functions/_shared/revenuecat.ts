// Webhook do RevenueCat: traduz o evento da loja para a tabela de assinaturas.
// O app usa o id do usuário do Supabase como app_user_id no RevenueCat.

export const GRACE_DAYS = 7

export interface RcEvent {
  type: string
  app_user_id: string
  product_id?: string
  store?: string
  expiration_at_ms?: number | null
  grace_period_expiration_at_ms?: number | null
}

export interface SubscriptionPatch {
  user_id: string
  status: 'active' | 'canceled_active' | 'payment_failed' | 'expired'
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
  const base: Partial<SubscriptionPatch> = {
    billing: /annual|anual|year|ano/i.test(e.product_id ?? '') ? 'annual' : 'monthly',
    store: e.store === 'APP_STORE' ? 'app_store' : e.store === 'PLAY_STORE' ? 'play_store' : undefined,
  }
  switch (e.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
      return { ...base, user_id: e.app_user_id, status: 'active', renews_at: iso(e.expiration_at_ms), grace_until: null }
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
