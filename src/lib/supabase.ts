import 'react-native-url-polyfill/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Ligação com o servidor (Supabase, região São Paulo).
// Fica desligada até existirem EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY nas variáveis do EAS.
// A chave anon é pública por desenho: quem protege os dados são as regras de acesso do banco.

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const IS_REMOTE = !!(URL && ANON)

// A sessão de login fica no armazenamento seguro do celular (Keychain no iPhone, Keystore no Android).
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase: SupabaseClient | null = IS_REMOTE
  ? createClient(URL!, ANON!, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null

/** Chama uma função do servidor como a pessoa logada. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Servidor não configurado')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw error
  return data as T
}

/** Envia o código por SMS. O número vai no formato +55DDDNÚMERO. */
export async function sendLoginCode(phoneE164: string, channel: 'sms' | 'whatsapp' = 'sms') {
  if (!supabase) throw new Error('Servidor não configurado')
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164, options: { channel } })
  if (error) throw error
}

/** Confere o código. Quem valida e limita tentativas é o servidor. */
export async function verifyLoginCode(phoneE164: string, code: string) {
  if (!supabase) throw new Error('Servidor não configurado')
  const { data, error } = await supabase.auth.verifyOtp({ phone: phoneE164, token: code, type: 'sms' })
  if (error) throw error
  return data.user?.id ?? null
}

/** A conta já tinha nome cadastrado (quem volta vê "Bem-vindo de volta"). */
export async function hasProfileName(userId: string) {
  if (!supabase) return false
  const { data } = await supabase.from('profiles').select('name').eq('id', userId).single()
  return !!data?.name
}

/** Quando há login salvo, liga a loja com o id da pessoa. Devolve a função para parar de ouvir. */
export function watchSession(onUser: (id: string) => void) {
  if (!supabase) return () => {}
  supabase.auth.getSession().then(({ data }) => data.session && onUser(data.session.user.id))
  const { data } = supabase.auth.onAuthStateChange((_e, session) => session && onUser(session.user.id))
  return () => data.subscription.unsubscribe()
}

export async function signOutRemote() {
  await supabase?.auth.signOut()
}
