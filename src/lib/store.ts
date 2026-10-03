import { Linking, Platform } from 'react-native'

// Compra nativa da App Store e do Google Play. A integração com o RevenueCat entra aqui depois.
// Até lá, a compra é simulada pela folha de exemplo e restaurar só encontra a compra simulada.

let simulatedPurchase: 'monthly' | 'annual' | null = null

/** Só na prévia: finge que existe uma assinatura feita em outro aparelho. */
export function simulateStorePurchase(billing: 'monthly' | 'annual' | null) {
  simulatedPurchase = billing
}

/** Procura uma assinatura ativa na conta da loja. */
export async function restorePurchase(): Promise<'monthly' | 'annual' | null> {
  return simulatedPurchase
}

/** Abre a tela de assinaturas da loja, onde a pessoa cancela e troca a forma de pagamento. */
export function openStoreSubscriptions() {
  const url = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'
  return Linking.openURL(url).catch(() => {})
}

export const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play'
