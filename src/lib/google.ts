import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Entrar com Google: o Google confirma a pessoa no celular e o Supabase cria ou abre a conta.
// O ID do cliente web do Google não é segredo (vai no app). Ele vem da variável EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID do EAS.

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

/** Só aparece no Android por enquanto, com servidor e com o ID do Google configurado. */
export const GOOGLE_READY = !!supabase && !!WEB_CLIENT_ID && Platform.OS === 'android'

let configured = false

export type GoogleResult = { uid: string; name: string | null; email: string | null } | 'cancelled' | 'failed'

export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!GOOGLE_READY || !supabase) return 'failed'
  try {
    if (!configured) {
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID })
      configured = true
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
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
