import type { Profile } from '../state/session'
import { currentUserId, enqueue, syncEnabled } from './sync'
import { IS_REMOTE, supabase } from './supabase'

// Conta da pessoa no banco (tabela profiles). A linha nasce no cadastro, por gatilho do servidor;
// o app só atualiza a própria linha, e a regra de acesso do banco garante isso.

const FIELDS: Partial<Record<keyof Profile, string>> = { name: 'name', phone: 'phone', tradition: 'tradition', goal: 'goal', time: 'reminder_time', email: 'email' }

/** Manda para o banco os campos do perfil que mudaram. Sem servidor, não faz nada. */
export function pushProfile(p: Partial<Profile>) {
  const values: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    const col = FIELDS[k as keyof Profile]
    if (col) values[col] = v === '' && col === 'email' ? null : v
  }
  if (Object.keys(values).length) enqueue({ kind: 'update', table: 'profiles', values, match: { id: '$uid' } })
}

/** Termos, idade e consentimento separado para dado de fé (LGPD art. 11), com a data do aceite. */
export function pushConsents(c: { terms: boolean; adult: boolean; faith: boolean }, now = new Date()) {
  const at = now.toISOString()
  enqueue({
    kind: 'update',
    table: 'profiles',
    values: { terms_accepted_at: c.terms ? at : null, adult_confirmed: c.adult, faith_consent: c.faith, faith_consent_at: c.faith ? at : null },
    match: { id: '$uid' },
  })
}

export function pushFaithConsent(faith: boolean, now = new Date()) {
  enqueue({ kind: 'update', table: 'profiles', values: { faith_consent: faith, faith_consent_at: faith ? now.toISOString() : null }, match: { id: '$uid' } })
}

export interface RemoteProfile {
  profile: Partial<Profile>
  faithConsent: boolean
  termsAccepted: boolean
  deletionRequestedAt: string | null
}

/**
 * Lê o perfil de quem acabou de entrar.
 * 'missing': não há perfil (conta nova). 'failed': não deu para ler (rede, servidor). Falha não pode virar conta nova,
 * senão o cadastro refeito sobrescreve nome e consentimentos que já estavam no banco.
 */
export async function fetchProfile(uid: string): Promise<RemoteProfile | 'missing' | 'failed'> {
  if (!supabase) return 'missing'
  const { data, error } = await supabase
    .from('profiles')
    .select('name, phone, tradition, goal, reminder_time, email, faith_consent, terms_accepted_at, deletion_requested_at')
    .eq('id', uid)
    .maybeSingle()
  if (error) return 'failed'
  if (!data) return 'missing'
  return {
    profile: { name: data.name ?? '', phone: data.phone ?? '', tradition: data.tradition, goal: data.goal, time: data.reminder_time, ...(data.email ? { email: data.email } : {}) },
    faithConsent: !!data.faith_consent,
    termsAccepted: !!data.terms_accepted_at,
    deletionRequestedAt: data.deletion_requested_at,
  }
}

/**
 * Pede a exclusão da conta no servidor (apagada em 30 dias). Quem lidera célula com membros recebe erro
 * e precisa passar a liderança antes. Sem servidor, devolve ok para a prévia seguir.
 */
export async function requestDeletionRemote(): Promise<{ ok: true; at?: string } | { ok: false; message: string }> {
  // Só a prévia, sem servidor, segue sem chamar ninguém. Com servidor e sem login, a exclusão não pode ser dada como feita.
  if (!IS_REMOTE || !syncEnabled() || !supabase) return { ok: true }
  if (!currentUserId()) return { ok: false, message: 'Entre de novo na conta para excluir.' }
  const { data, error } = await supabase.rpc('request_account_deletion')
  if (!error) return { ok: true, at: typeof data === 'string' ? data : undefined }
  if (/lideran/i.test(error.message)) return { ok: false, message: 'Passe a liderança da célula antes de excluir a conta.' }
  return { ok: false, message: 'Não foi possível pedir a exclusão agora. Confira a internet e tente de novo.' }
}

export async function cancelDeletionRemote(): Promise<boolean> {
  if (!IS_REMOTE || !syncEnabled() || !supabase) return true
  if (!currentUserId()) return false
  const { error } = await supabase.rpc('cancel_account_deletion')
  return !error
}
