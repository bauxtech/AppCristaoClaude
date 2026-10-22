import { Linking, Platform } from 'react-native'
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases'
import { callFunction } from './supabase'

// Compra nativa da App Store e do Google Play pelo RevenueCat.
// Fica desligada até existirem EXPO_PUBLIC_REVENUECAT_IOS_KEY e EXPO_PUBLIC_REVENUECAT_ANDROID_KEY nas variáveis do EAS
// (são chaves públicas do SDK, feitas para ficar no app). Sem elas, a compra é simulada pela folha de exemplo.
// Quem libera o acesso de verdade é o servidor, pelo webhook do RevenueCat.

const KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined
/** Entitlements configurados no painel do RevenueCat, do maior para o menor. Os produtos levam o nome do plano e do período (ex.: acasa_completo_anual). */
export const ENTITLEMENTS = ['lider', 'completo', 'essencial'] as const
type PlanId = (typeof ENTITLEMENTS)[number]
type Billing = 'monthly' | 'annual'

export const STORE_ENABLED = !!KEY
let configured = false

/** Liga a loja com o id da pessoa no Supabase, para o webhook saber de quem é a compra. */
export function configureStore(userId: string) {
  if (!KEY || configured) return
  Purchases.configure({ apiKey: KEY, appUserID: userId })
  configured = true
}

const billingOf = (productId: string): Billing => (/annual|anual|year|ano/i.test(productId) ? 'annual' : 'monthly')
function activePlan(info: CustomerInfo): { plan: PlanId; billing: Billing } | null {
  for (const p of ENTITLEMENTS) {
    const e = info.entitlements.active[p]
    if (e) return { plan: p, billing: billingOf(e.productIdentifier) }
  }
  return null
}
const active = (info: CustomerInfo) => !!activePlan(info)

export type PurchaseResult = 'ok' | 'cancelled' | 'pending' | 'unavailable'

/** Pacote do plano e período na oferta atual do RevenueCat, pelo nome do produto. */
function findPackage(list: PurchasesPackage[], plan: PlanId, billing: Billing) {
  return list.find((p) => new RegExp(plan, 'i').test(p.product.identifier) && billingOf(p.product.identifier) === billing) ?? null
}

/** Abre a folha de compra da própria loja. Cancelar volta sem erro. */
export async function purchase(plan: PlanId, billing: Billing): Promise<PurchaseResult> {
  if (!configured) return 'unavailable'
  const offerings = await Purchases.getOfferings()
  const pkg = findPackage(offerings.current?.availablePackages ?? [], plan, billing)
  if (!pkg) return 'unavailable'
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    return active(customerInfo) ? 'ok' : 'unavailable'
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled'
    // Pagamento que a loja ainda vai confirmar (boleto, por exemplo): o plano libera quando o aviso da loja chegar.
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending'
    throw e
  }
}

let simulatedPurchase: { plan: PlanId; billing: Billing } | null = null

/** Só na prévia: finge que existe uma assinatura feita em outro aparelho. */
export function simulateStorePurchase(p: { plan: PlanId; billing: Billing } | null) {
  simulatedPurchase = p
}

/** Procura uma assinatura ativa na conta da loja. */
export async function restorePurchase(): Promise<{ plan: PlanId; billing: Billing } | null> {
  if (!configured) return simulatedPurchase
  const info = await Purchases.restorePurchases()
  return activePlan(info)
}

/** Pede ao servidor para conferir a compra no RevenueCat agora, sem esperar o aviso da loja. */
export async function syncSubscription() {
  try {
    await callFunction('sync-subscription', {})
  } catch {
    // O aviso do RevenueCat chega depois e o servidor atualiza do mesmo jeito.
  }
}

/** Abre a tela de assinaturas da loja, onde a pessoa cancela e troca a forma de pagamento. */
export function openStoreSubscriptions() {
  const url = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'
  return Linking.openURL(url).catch(() => {})
}

export const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play'
/** "na App Store" ou "no Google Play". */
export const IN_STORE = Platform.OS === 'ios' ? 'na App Store' : 'no Google Play'
