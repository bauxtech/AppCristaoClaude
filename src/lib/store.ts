import { Linking, Platform } from 'react-native'
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo } from 'react-native-purchases'

// Compra nativa da App Store e do Google Play pelo RevenueCat.
// Fica desligada até existirem EXPO_PUBLIC_REVENUECAT_IOS_KEY e EXPO_PUBLIC_REVENUECAT_ANDROID_KEY nas variáveis do EAS
// (são chaves públicas do SDK, feitas para ficar no app). Sem elas, a compra é simulada pela folha de exemplo.
// Quem libera o acesso de verdade é o servidor, pelo webhook do RevenueCat.

const KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined
/** Nome da assinatura configurado no painel do RevenueCat. */
export const ENTITLEMENT = 'acesso'

export const STORE_ENABLED = !!KEY
let configured = false

/** Liga a loja com o id da pessoa no Supabase, para o webhook saber de quem é a compra. */
export function configureStore(userId: string) {
  if (!KEY || configured) return
  Purchases.configure({ apiKey: KEY, appUserID: userId })
  configured = true
}

const active = (info: CustomerInfo) => !!info.entitlements.active[ENTITLEMENT]

export type PurchaseResult = 'ok' | 'cancelled' | 'unavailable'

/** Abre a folha de compra da própria loja. Cancelar volta sem erro. */
export async function purchase(billing: 'monthly' | 'annual'): Promise<PurchaseResult> {
  if (!configured) return 'unavailable'
  const offerings = await Purchases.getOfferings()
  const pkg = billing === 'annual' ? offerings.current?.annual : offerings.current?.monthly
  if (!pkg) return 'unavailable'
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    return active(customerInfo) ? 'ok' : 'unavailable'
  } catch (e) {
    if ((e as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled'
    throw e
  }
}

let simulatedPurchase: 'monthly' | 'annual' | null = null

/** Só na prévia: finge que existe uma assinatura feita em outro aparelho. */
export function simulateStorePurchase(billing: 'monthly' | 'annual' | null) {
  simulatedPurchase = billing
}

/** Procura uma assinatura ativa na conta da loja. */
export async function restorePurchase(): Promise<'monthly' | 'annual' | null> {
  if (!configured) return simulatedPurchase
  const info = await Purchases.restorePurchases()
  const ent = info.entitlements.active[ENTITLEMENT]
  if (!ent) return null
  return /annual|anual|year|ano/i.test(ent.productIdentifier) ? 'annual' : 'monthly'
}

/** Abre a tela de assinaturas da loja, onde a pessoa cancela e troca a forma de pagamento. */
export function openStoreSubscriptions() {
  const url = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'
  return Linking.openURL(url).catch(() => {})
}

export const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play'
