import type { SyncOp } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { isUuid } from '../../lib/uuid'
import { toISODate, type Campaign, type CampaignType, type DiaryEntry, type PrayerRequest } from './data'

// Sincronização da oração com o banco: diário, pedidos e campanhas da própria pessoa.
// Pedido de oração e diário são dado sensível (LGPD): a regra de acesso do banco deixa cada pessoa ver só os seus.
// Compartilhar com a célula (shared_cell_id) entra junto com a célula no banco; até lá o pedido vai sem célula.
// O vídeo em Libras do pedido continua só no aparelho.

export interface SyncedPrayer {
  diary: DiaryEntry[]
  requests: PrayerRequest[]
  campaigns: Campaign[]
}

/** Data do aparelho (AAAA-MM-DD) para o banco: meio-dia do dia, para não trocar de dia por fuso. */
function atNoon(date: string, now: Date) {
  return date === toISODate(now) ? now.toISOString() : new Date(`${date}T12:00:00`).toISOString()
}

function byId<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]))
}

function diffList<T extends { id: string }>(prev: T[], next: T[], table: string, toRow: (x: T) => Record<string, unknown>): SyncOp[] {
  const ops: SyncOp[] = []
  const before = byId(prev)
  const after = byId(next)
  for (const x of next) if (isUuid(x.id) && before.get(x.id) !== x) ops.push({ kind: 'upsert', table, row: toRow(x) })
  for (const x of prev) if (isUuid(x.id) && !after.has(x.id)) ops.push({ kind: 'delete', table, match: { id: x.id, user_id: '$uid' } })
  return ops
}

export function prayerDiffOps(prev: SyncedPrayer, next: SyncedPrayer, now = new Date()): SyncOp[] {
  return [
    ...diffList(prev.diary, next.diary, 'prayer_diary', (e) => ({ id: e.id, user_id: '$uid', text: e.text, created_at: atNoon(e.date, now), updated_at: now.toISOString() })),
    ...diffList(prev.requests, next.requests, 'prayer_requests', (r) => ({
      id: r.id,
      user_id: '$uid',
      title: r.title,
      text: r.text,
      answered_at: r.answeredAt ?? null,
      testimony: r.testimony ?? null,
      created_at: atNoon(r.createdAt, now),
    })),
    ...diffList(prev.campaigns, next.campaigns, 'prayer_campaigns', (c) => ({ id: c.id, user_id: '$uid', name: c.name, type: c.type, start_date: c.start, end_date: c.end, done_days: c.doneDays })),
  ]
}

/**
 * Junta o que veio do banco com o que só existe no aparelho (itens de antes do servidor).
 * Do aparelho, o pedido mantém o que o banco ainda não guarda: compartilhado, quem orou e o vídeo.
 */
export function mergePrayer(local: SyncedPrayer, remote: SyncedPrayer): SyncedPrayer {
  const localReq = byId(local.requests)
  return {
    diary: [...remote.diary, ...local.diary.filter((e) => !isUuid(e.id))],
    requests: [
      ...remote.requests.map((r) => {
        const l = localReq.get(r.id)
        return l ? { ...r, shared: l.shared, prayedBy: l.prayedBy, videoUri: l.videoUri } : r
      }),
      ...local.requests.filter((r) => !isUuid(r.id)),
    ],
    campaigns: [...remote.campaigns.map((c) => ({ ...c, days: local.campaigns.find((l) => l.id === c.id)?.days })), ...local.campaigns.filter((c) => !isUuid(c.id))],
  }
}

/** Lê do banco o diário, os pedidos e as campanhas de quem está logado. */
export async function pullPrayer(uid: string): Promise<SyncedPrayer | null> {
  if (!supabase) return null
  const [diary, requests, campaigns] = await Promise.all([
    supabase.from('prayer_diary').select('id, text, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('prayer_requests').select('id, title, text, answered_at, testimony, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('prayer_campaigns').select('id, name, type, start_date, end_date, done_days').eq('user_id', uid).order('start_date', { ascending: false }),
  ])
  if (diary.error || requests.error || campaigns.error) return null
  const day = (ts: string) => toISODate(new Date(ts))
  return {
    diary: (diary.data ?? []).map((e) => ({ id: e.id, date: day(e.created_at), text: e.text })),
    requests: (requests.data ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? '',
      text: r.text,
      createdAt: day(r.created_at),
      shared: false,
      prayedBy: [],
      ...(r.answered_at ? { answeredAt: r.answered_at } : {}),
      ...(r.testimony ? { testimony: r.testimony } : {}),
    })),
    campaigns: (campaigns.data ?? []).map((c) => ({ id: c.id, name: c.name, type: c.type as CampaignType, start: c.start_date, end: c.end_date, doneDays: c.done_days ?? [] })),
  }
}
