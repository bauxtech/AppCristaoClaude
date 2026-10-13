import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Entrar com Google: o Google confirma a pessoa no celular e o Supabase cria ou abre a conta.
// Os IDs dos clientes do Google não são segredo (vão no app). Vêm das variáveis do EAS:
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Android e iPhone) e EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (só iPhone).

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

/** Aparece com servidor e com os IDs do Google de cada sistema configurados. */
export const GOOGLE_READY = !!supabase && !!WEB_CLIENT_ID && (Platform.OS === 'android' || (Platform.OS === 'ios' && !!IOS_CLIENT_ID))

let configured = false

/** Resultado do login social (Google ou Apple). */
export type SocialResult = { uid: string; name: string | null; email: string | null } | 'cancelled' | 'failed'
export type GoogleResult = SocialResult

export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!GOOGLE_READY || !supabase) return 'failed'
  try {
    if (!configured) {
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, ...(Platform.OS === 'ios' ? { iosClientId: IOS_CLIENT_ID } : {}) })
      configured = true
    }
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const res = await GoogleSignin.signIn()
    if (!isSuccessResponse(res)) return 'cancelled'
    const token = res.data.idToken
    if (!token) return 'failed'
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token })
    if (error || !data.user) return 'failed'
    return { uid: data.user.id, name: res.data.user.name, email: res.data.user.email }
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return 'cancelled'
    return 'failed'
  }
}

/** Ao sair da conta: o Google esquece a conta escolhida, para a próxima pessoa escolher a dela. */
export async function signOutGoogle() {
  if (!GOOGLE_READY) return
  try {
    await GoogleSignin.signOut()
  } catch {
    // Já estava fora.
  }
}
