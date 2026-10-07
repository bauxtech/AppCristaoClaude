import type { SyncOp } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { isUuid } from '../../lib/uuid'

/** Nome de um colega de célula pelo id, definido por quem tem a lista da célula. */
let memberName: (id: string) => string | null = () => null
export function setMemberNameLookup(fn: (id: string) => string | null) {
  memberName = fn
}
import { toISODate, type Campaign, type CampaignType, type DiaryEntry, type PrayerRequest } from './data'

// Sincronização da oração com o banco: diário, pedidos e campanhas da própria pessoa.
// Pedido de oração e diário são dado sensível (LGPD): a regra de acesso do banco deixa cada pessoa ver só os seus.
// Compartilhar com a célula grava shared_cell_id com a célula aberta. O banco só aceita se a pessoa vê os pedidos dela.
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

/** cellId: célula aberta agora. Pedido marcado como compartilhado vai para ela; sem célula, fica só da pessoa. */
/** faith: consentimento de fé. Sem ele, diário e pedidos ficam só no aparelho; campanhas seguem. */
export function prayerDiffOps(prev: SyncedPrayer, next: SyncedPrayer, now = new Date(), cellId: string | null = null, faith = true): SyncOp[] {
  if (!faith) {
    prev = { ...prev, diary: [], requests: [] }
    next = { ...next, diary: [], requests: [] }
  }
  return [
    ...diffList(prev.diary, next.diary, 'prayer_diary', (e) => ({ id: e.id, user_id: '$uid', text: e.text, created_at: atNoon(e.date, now), updated_at: now.toISOString() })),
    ...diffList(prev.requests, next.requests, 'prayer_requests', (r) => ({
      id: r.id,
      user_id: '$uid',
      title: r.title,
      text: r.text,
      answered_at: r.answeredAt ?? null,
      testimony: r.testimony ?? null,
      // Mantém a célula onde o pedido foi compartilhado. A célula aberta só vale para pedido antigo sem célula guardada.
      shared_cell_id: r.shared ? (r.sharedCellId ?? cellId) : null,
      created_at: atNoon(r.createdAt, now),
    })),
    ...diffList(prev.campaigns, next.campaigns, 'prayer_campaigns', (c) => ({ id: c.id, user_id: '$uid', name: c.name, type: c.type, start_date: c.start, end_date: c.end, done_days: c.doneDays })),
  ]
}

/**
 * Junta o que veio do banco com o que só existe no aparelho (itens de antes do servidor).
 * Do aparelho, o pedido mantém o vídeo em Libras, que o banco ainda não guarda.
 */
export function mergePrayer(local: SyncedPrayer, remote: SyncedPrayer, faith = true): SyncedPrayer {
  const localReq = byId(local.requests)
  // Sem consentimento, o banco não guarda diário nem pedidos: os do aparelho ficam como estão.
  const keep = faith ? null : { diary: local.diary, requests: local.requests }
  return {
    diary: [...remote.diary, ...local.diary.filter((e) => !isUuid(e.id))],
    requests: [
      ...remote.requests.map((r) => {
        const l = localReq.get(r.id)
        return l ? { ...r, prayedBy: r.prayedBy.length ? r.prayedBy : l.prayedBy, videoUri: l.videoUri } : r
      }),
      ...local.requests.filter((r) => !isUuid(r.id)),
    ],
    campaigns: [...remote.campaigns.map((c) => ({ ...c, days: local.campaigns.find((l) => l.id === c.id)?.days })), ...local.campaigns.filter((c) => !isUuid(c.id))],
    ...keep,
  }
}

/** Lê do banco o diário, os pedidos e as campanhas de quem está logado. */
export async function pullPrayer(uid: string): Promise<SyncedPrayer | null> {
  if (!supabase) return null
  const [diary, requests, campaigns] = await Promise.all([
    supabase.from('prayer_diary').select('id, text, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('prayer_requests').select('id, title, text, answered_at, testimony, created_at, shared_cell_id, prayer_prayed(user_id)').eq('user_id', uid).order('created_at', { ascending: false }),
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
      shared: !!r.shared_cell_id,
      sharedCellId: r.shared_cell_id ?? null,
      // Nomes de quem orou: o banco devolve os ids; os nomes vêm da lista da célula.
      prayedBy: ((r.prayer_prayed ?? []) as { user_id: string }[]).map((p) => memberName(p.user_id)).filter((n): n is string => !!n),
      ...(r.answered_at ? { answeredAt: r.answered_at } : {}),
      ...(r.testimony ? { testimony: r.testimony } : {}),
    })),
    campaigns: (campaigns.data ?? []).map((c) => ({ id: c.id, name: c.name, type: c.type as CampaignType, start: c.start_date, end: c.end_date, doneDays: c.done_days ?? [] })),
  }
}
