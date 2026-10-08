import { supabase } from '../../lib/supabase'
import type { SyncOp } from '../../lib/sync'
import { isUuid } from '../../lib/uuid'
import type { Notice, NoticeType } from './notices'
import type { NotificationPrefs } from './prefs'

// Central de avisos no banco. Quem cria os avisos é o próprio banco (célula, "Orei por você").
// A pessoa só lê, marca como lido e apaga os dela.

/** O que o servidor precisa para decidir o envio ao celular: tipos ligados e horário de silêncio. */
export function serverPrefs(p: NotificationPrefs) {
  return { types: p.types, quietFrom: p.quietFrom, quietTo: p.quietTo }
}

export function markReadOps(ids: string[], now = new Date()): SyncOp[] {
  const valid = ids.filter(isUuid)
  return valid.map((id) => ({ kind: 'update', table: 'notifications', values: { read_at: now.toISOString() }, match: { id, user_id: '$uid' } }))
}

export function dismissOps(id: string): SyncOp[] {
  return isUuid(id) ? [{ kind: 'delete', table: 'notifications', match: { id, user_id: '$uid' } }] : []
}

type Row = { id: string; type: NoticeType; title: string; body: string; href: string | null; read_at: string | null; created_at: string; cell_prayer: boolean }

export function toNotice(r: Row): Notice {
  return { id: r.id, type: r.type, title: r.title, body: r.body, at: r.created_at, read: !!r.read_at, ...(r.href ? { href: r.href } : {}), ...(r.cell_prayer ? { cellPrayer: true } : {}) }
}

/** Últimos 100 avisos de quem está logado. */
export async function pullNotices(uid: string): Promise<Notice[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('notifications').select('id, type, title, body, href, read_at, created_at, cell_prayer').eq('user_id', uid).order('created_at', { ascending: false }).limit(100)
  if (error) return null
  return ((data ?? []) as Row[]).map(toNotice)
}
