import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'
import type { SocialResult } from './google'
import { supabase } from './supabase'

// Entrar com Apple: a Apple confirma a pessoa no iPhone e o Supabase cria ou abre a conta.
// O número de uso único (nonce) evita que um token copiado seja usado de novo: a Apple recebe o resumo dele
// e o Supabase confere o original.

/** Só no iPhone e com servidor. */
export const APPLE_READY = !!supabase && Platform.OS === 'ios'

/** Nome que a Apple manda só no primeiro login com o app. */
export function appleName(n: AppleAuthentication.AppleAuthenticationFullName | null): string | null {
  const name = [n?.givenName, n?.familyName].filter(Boolean).join(' ').trim()
  return name || null
}

export async function signInWithApple(): Promise<SocialResult> {
  if (!APPLE_READY || !supabase) return 'failed'
  try {
    if (!(await AppleAuthentication.isAvailableAsync())) return 'failed'
    const nonce = Crypto.randomUUID()
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce)
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    })
    if (!cred.identityToken) return 'failed'
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce })
    if (error || !data.user) return 'failed'
    return { uid: data.user.id, name: appleName(cred.fullName), email: cred.email ?? data.user.email ?? null }
  } catch (e) {
    if ((e as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED') return 'cancelled'
    return 'failed'
  }
}
