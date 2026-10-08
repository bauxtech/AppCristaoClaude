import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Avisos que dependem de outras pessoas ("Orei por você", entrada aprovada, aviso da célula) chegam pelo servidor.
// O servidor precisa do endereço deste aparelho (token do Expo). Ele fica guardado só para a própria pessoa.

const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId

/** Pega o token deste aparelho. Só pede se a pessoa já deu permissão de avisos. */
export async function devicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !projectId) return null
  try {
    const p = await Notifications.getPermissionsAsync()
    if (!p.granted) return null
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch {
    // Sem Firebase configurado no Android, ou sem rede.
    return null
  }
}

/** Guarda o token para a conta logada. */
export async function registerPushToken(uid: string): Promise<boolean> {
  if (!supabase) return false
  const token = await devicePushToken()
  if (!token) return false
  const { error } = await supabase.from('push_tokens').upsert({ user_id: uid, token }, { onConflict: 'user_id,token' })
  return !error
}

/** Ao sair da conta: este aparelho deixa de receber os avisos dela. */
export async function unregisterPushToken(uid: string): Promise<void> {
  if (!supabase) return
  const token = await devicePushToken()
  if (token) await supabase.from('push_tokens').delete().match({ user_id: uid, token })
}
