import { Linking, Platform } from 'react-native'
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, STOREKIT_VERSION, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases'
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

// Registro técnico da loja (30/10), para descobrir por que uma compra não termina. Fica só na memória do aparelho
// e só sai dele quando a pessoa toca em "Enviar detalhes". Cada linha é cortada; nada de senha ou cartão passa pela biblioteca.
const LOG: string[] = []
const MAX_LINES = 120
export function storeLog(note?: string) {
  if (note) LOG.push(`app: ${note}`)
  return LOG.slice(-MAX_LINES).join('\n')
}

/** Liga a loja com o id da pessoa no Supabase, para o webhook saber de quem é a compra. */
export function configureStore(userId: string) {
  if (!KEY || configured) return
  try {
    Purchases.setLogHandler((level, message) => {
      LOG.push(`${level}: ${message.slice(0, 300)}`)
      if (LOG.length > MAX_LINES * 2) LOG.splice(0, LOG.length - MAX_LINES)
    })
    void Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  } catch {
    // sem registro: a compra segue normal
  }
  // StoreKit 1 no iPhone (29/10): no TestFlight do iOS 26, a compra pelo StoreKit 2 volta "cancelada" logo depois da senha.
  Purchases.configure({ apiKey: KEY, appUserID: userId, storeKitVersion: STOREKIT_VERSION.STOREKIT_1 })
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

/** no_package: a oferta atual não tem o plano. not_active: a loja concluiu, mas o plano não apareceu ativo no RevenueCat. */
export type PurchaseResult = 'ok' | 'cancelled' | 'pending' | 'unavailable' | 'no_package' | 'not_active'

/** Pacote do plano e período na oferta atual do RevenueCat, pelo nome do produto. */
function findPackage(list: PurchasesPackage[], plan: PlanId, billing: Billing) {
  return list.find((p) => new RegExp(plan, 'i').test(p.product.identifier) && billingOf(p.product.identifier) === billing) ?? null
}

/** Abre a folha de compra da própria loja. Cancelar volta sem erro. */
export async function purchase(plan: PlanId, billing: Billing): Promise<PurchaseResult> {
  if (!configured) return 'unavailable'
  const offerings = await Purchases.getOfferings()
  const list = offerings.current?.availablePackages ?? []
  storeLog(`oferta ${offerings.current?.identifier ?? 'nenhuma'}: ${list.map((p) => p.product.identifier).join(', ')}`)
  const pkg = findPackage(list, plan, billing)
  if (!pkg) return 'no_package'
  storeLog(`comprando ${pkg.product.identifier} (${pkg.product.priceString})`)
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    storeLog(`loja respondeu; ativos: ${Object.keys(customerInfo.entitlements.active).join(', ') || 'nenhum'}`)
    return active(customerInfo) ? 'ok' : 'not_active'
  } catch (e) {
    const err = e as { code?: string; message?: string; underlyingErrorMessage?: string; userCancelled?: boolean }
    storeLog(`erro ${err.code ?? '?'} cancelado=${String(err.userCancelled)}: ${err.message ?? ''} / ${err.underlyingErrorMessage ?? ''}`)
    const code = err.code
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
