import type { SyncOp } from '../../lib/sync'
import { contentTypeOf, signedUrl } from '../../lib/files'
import { supabase } from '../../lib/supabase'
import { isUuid, uuid } from '../../lib/uuid'
import { DEFAULT_ROLES, type Cell, type Member } from './data'
import { nextMeeting } from './meetings'
import type { CellRole } from './permissions'

// Sincronização da célula com o banco. Os dados são de várias pessoas, então quem decide o que cada um
// pode ler e gravar são as regras do banco (papel na célula). O app manda a diferença de cada mudança
// e, ao abrir, traz a célula de novo do banco.
// No app, a própria pessoa aparece com o id 'me'. Na ida para o banco, 'me' vira '$uid' (id de quem está logado).

const me = (id: string | null | undefined) => (id === 'me' ? '$uid' : id ?? null)
const iso = (ts: string | null | undefined) => (ts ? ts.slice(0, 10) : '')

/** Caminho do material na pasta da célula. O nome vai sem caracteres especiais. */
export function materialPath(cell: string, id: string, name: string) {
  const safe = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-60)
  return `${cell}/materiais/${id}-${safe}`
}

/** Itens novos criados nas telas com id provisório ganham uuid, que é a chave das tabelas. */
export function withIds(prev: Cell | null, next: Cell): Cell {
  const known = (list: { id: string }[] | undefined) => new Set((list ?? []).map((x) => x.id))
  const fix = <T extends { id: string }>(list: T[], before: Set<string>) => {
    let changed = false
    const out = list.map((x) => {
      if (isUuid(x.id) || before.has(x.id)) return x
      changed = true
      return { ...x, id: uuid() }
    })
    return changed ? out : list
  }
  const schedule = next.schedule.some((s) => !s.id) ? next.schedule.map((s) => (s.id ? s : { ...s, id: uuid() })) : next.schedule
  const board = fix(next.board, known(prev?.board))
  const rides = fix(next.rides, known(prev?.rides))
  const swaps = fix(next.swaps, known(prev?.swaps))
  const visitors = fix(next.visitors, known(prev?.visitors))
  const polls = fix(next.polls, known(prev?.polls))
  const playlist = fix(next.playlist, known(prev?.playlist))
  const materials = fix(next.materials, known(prev?.materials))
  if (
    schedule === next.schedule &&
    board === next.board &&
    rides === next.rides &&
    swaps === next.swaps &&
    visitors === next.visitors &&
    polls === next.polls &&
    playlist === next.playlist &&
    materials === next.materials
  )
    return next
  return { ...next, schedule, board, rides, swaps, visitors, polls, playlist, materials }
}

function byId<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]))
}

const planOf = (c: Cell) => ({ title: c.planTitle, ref: c.planRef, sections: c.plan })

/** Diferença entre a célula antes e depois de uma mudança, como operações no banco. Célula de exemplo (id provisório) não vai. */
export function cellDiffOps(prev: Cell, next: Cell, now = new Date()): SyncOp[] {
  if (!isUuid(next.id) || prev.id !== next.id) return []
  const cell = next.id
  const ops: SyncOp[] = []

  // Dados da célula (só o líder consegue gravar; o banco confere).
  const info: Record<string, unknown> = {}
  if (prev.name !== next.name) info.name = next.name
  if (prev.type !== next.type) info.type = next.type
  if (prev.day !== next.day) info.weekday = next.day
  if (prev.time !== next.time) info.time = next.time
  if (prev.address !== next.address) info.address = next.address
  if (prev.reference !== next.reference) info.reference = next.reference
  if (prev.neighborhood !== next.neighborhood) info.neighborhood = next.neighborhood
  if (prev.archived !== next.archived) info.archived = next.archived
  if (prev.maxSize !== next.maxSize) info.max_size = next.maxSize
  if (JSON.stringify(planOf(prev)) !== JSON.stringify(planOf(next))) info.plan = planOf(next)
  if (Object.keys(info).length) ops.push({ kind: 'update', table: 'cells', values: info, match: { id: cell } })

  if (prev.muted !== next.muted) ops.push({ kind: 'update', table: 'cell_members', values: { muted: next.muted }, match: { cell_id: cell, user_id: '$uid' } })

  // Entrada: o líder aprova (a pessoa vira membro) ou recusa (some da lista de pedidos).
  const nextMembers = byId(next.members)
  for (const j of prev.pendingJoins) {
    if (next.pendingJoins.some((x) => x.id === j.id) || !isUuid(j.id)) continue
    const approved = nextMembers.get(j.id)
    ops.push({
      kind: 'update',
      table: 'cell_members',
      values: approved ? { status: 'approved', role: approved.role, joined_at: now.toISOString() } : { status: 'rejected' },
      match: { cell_id: cell, user_id: j.id },
    })
  }

  // Papéis. Passar a liderança vai pela função do banco, que troca os dois papéis juntos.
  const prevMembers = byId(prev.members)
  const newLeader = next.members.find((m) => m.role === 'lider' && !m.isMe && prevMembers.get(m.id)?.role !== 'lider')
  const iLeft = prev.myRole === 'lider' && next.myRole !== 'lider'
  if (newLeader && iLeft && isUuid(newLeader.id)) ops.push({ kind: 'rpc', fn: 'transfer_leadership', args: { p_cell: cell, p_new_leader: newLeader.id } })
  for (const m of next.members) {
    const before = prevMembers.get(m.id)
    if (!before || m.isMe || before.role === m.role || !isUuid(m.id)) continue
    if (newLeader && iLeft && m.id === newLeader.id) continue
    ops.push({ kind: 'update', table: 'cell_members', values: { role: m.role }, match: { cell_id: cell, user_id: m.id } })
  }
  for (const m of prev.members) {
    if (!nextMembers.has(m.id) && !m.isMe && isUuid(m.id) && !prev.pendingJoins.some((j) => j.id === m.id)) ops.push({ kind: 'delete', table: 'cell_members', match: { cell_id: cell, user_id: m.id } })
  }

  // Presença: a última reunião marcada vai pela função do banco (só líder e auxiliar).
  if (next.history.meetings > prev.history.meetings) {
    const present: Record<string, boolean> = {}
    for (const m of next.members) {
      const before = prevMembers.get(m.id)
      if (!before || m.lastAttendance === before.lastAttendance) continue
      const uid = m.isMe ? '$uid' : m.id
      if (uid === '$uid' || isUuid(uid)) present[uid] = !!m.lastAttendance[m.lastAttendance.length - 1]
    }
    const meeting = nextMeeting(prev, now)
    if (meeting && Object.keys(present).length) ops.push({ kind: 'rpc', fn: 'mark_attendance', args: { p_cell: cell, p_date: meeting.date, p_present: present } })
  }

  // Escala.
  const prevSched = new Map(prev.schedule.filter((s) => s.id).map((s) => [s.id!, s]))
  for (const s of next.schedule) {
    if (!s.id) continue
    const before = prevSched.get(s.id)
    if (!before || before.role !== s.role || before.memberId !== s.memberId) {
      ops.push({ kind: 'upsert', table: 'cell_schedule', row: { id: s.id, cell_id: cell, role_name: s.role, member_id: me(s.memberId) } })
    }
  }
  const nextSchedIds = new Set(next.schedule.map((s) => s.id))
  for (const s of prev.schedule) if (s.id && !nextSchedIds.has(s.id)) ops.push({ kind: 'delete', table: 'cell_schedule', match: { id: s.id } })

  // Agenda: reunião cancelada, reativada, encontro extra.
  for (const d of next.cancelledDates) {
    if (!prev.cancelledDates.includes(d)) ops.push({ kind: 'upsert', table: 'cell_meetings', row: { cell_id: cell, date: d, cancelled: true }, onConflict: 'cell_id,date' })
  }
  for (const d of prev.cancelledDates) {
    if (!next.cancelledDates.includes(d)) ops.push({ kind: 'upsert', table: 'cell_meetings', row: { cell_id: cell, date: d, cancelled: false }, onConflict: 'cell_id,date' })
  }
  for (const e of next.extraMeetings) {
    if (!prev.extraMeetings.some((x) => x.date === e.date)) ops.push({ kind: 'upsert', table: 'cell_meetings', row: { cell_id: cell, date: e.date, time: e.time, extra: true }, onConflict: 'cell_id,date' })
  }
  for (const e of prev.extraMeetings) {
    if (!next.extraMeetings.some((x) => x.date === e.date)) ops.push({ kind: 'delete', table: 'cell_meetings', match: { cell_id: cell, date: e.date, extra: true } })
  }

  // Vou / não vou na próxima reunião.
  if (prev.myRsvp !== next.myRsvp && next.myRsvp) {
    const meeting = nextMeeting(next, now)
    if (meeting) ops.push({ kind: 'upsert', table: 'cell_rsvps', row: { cell_id: cell, meeting_date: meeting.date, user_id: '$uid', going: next.myRsvp === 'vou' }, onConflict: 'cell_id,meeting_date,user_id' })
  }

  // Mural (só o líder publica e apaga).
  const prevBoard = byId(prev.board)
  for (const b of next.board) if (!prevBoard.has(b.id) && isUuid(b.id)) ops.push({ kind: 'upsert', table: 'cell_board', row: { id: b.id, cell_id: cell, author_id: '$uid', text: b.text } })
  const nextBoard = byId(next.board)
  for (const b of prev.board) if (!nextBoard.has(b.id) && isUuid(b.id)) ops.push({ kind: 'delete', table: 'cell_board', match: { id: b.id } })

  // Carona: quem oferece, quem pede e quem aceita.
  const prevRides = byId(prev.rides)
  const nextRides = byId(next.rides)
  for (const r of next.rides) {
    if (!isUuid(r.id)) continue
    const before = prevRides.get(r.id)
    if (!before && r.driverId === 'me') ops.push({ kind: 'upsert', table: 'cell_rides', row: { id: r.id, cell_id: cell, driver_id: '$uid', origin: r.from, seats: r.seats } })
    for (const q of r.requests) {
      const old = before?.requests.find((x) => x.memberId === q.memberId)
      if (!old && q.memberId === 'me') ops.push({ kind: 'upsert', table: 'ride_requests', row: { ride_id: r.id, user_id: '$uid', status: 'pending' } })
      if (old && old.status !== q.status && r.driverId === 'me' && isUuid(q.memberId)) ops.push({ kind: 'update', table: 'ride_requests', values: { status: q.status }, match: { ride_id: r.id, user_id: q.memberId } })
    }
  }
  for (const r of prev.rides) if (!nextRides.has(r.id) && isUuid(r.id) && r.driverId === 'me') ops.push({ kind: 'delete', table: 'cell_rides', match: { id: r.id } })

  // Trocas na escala.
  const prevSwaps = byId(prev.swaps)
  for (const s of next.swaps) {
    if (!isUuid(s.id)) continue
    const before = prevSwaps.get(s.id)
    if (!before && s.fromId === 'me') {
      const row = next.schedule.find((x) => x.role === s.role && x.id)
      if (row && isUuid(s.toId)) ops.push({ kind: 'upsert', table: 'cell_swaps', row: { id: s.id, cell_id: cell, schedule_id: row.id, from_id: '$uid', to_id: s.toId, status: 'pending' } })
    } else if (before && before.status !== s.status) {
      ops.push({ kind: 'update', table: 'cell_swaps', values: { status: s.status === 'approved' ? 'accepted' : s.status }, match: { id: s.id } })
    }
  }

  // Visitantes registrados (só o líder).
  const prevVisitors = byId(prev.visitors)
  for (const v of next.visitors) {
    if (isUuid(v.id) && prevVisitors.get(v.id) !== v) {
      ops.push({ kind: 'upsert', table: 'cell_leads', row: { id: v.id, cell_id: cell, name: v.name, phone: v.phone.replace(/\D/g, ''), notes: v.notes || null, follow_up_at: v.followUpAt || null, source: 'manual' } })
    }
  }
  const nextVisitors = byId(next.visitors)
  for (const v of prev.visitors) if (!nextVisitors.has(v.id) && isUuid(v.id)) ops.push({ kind: 'delete', table: 'cell_leads', match: { id: v.id } })

  // Enquetes (o líder cria) e votos (cada um o seu).
  const prevPolls = byId(prev.polls)
  for (const q of next.polls) {
    if (!isUuid(q.id)) continue
    const before = prevPolls.get(q.id)
    if (!before) ops.push({ kind: 'upsert', table: 'cell_polls', row: { id: q.id, cell_id: cell, question: q.question, options: q.options.map((o) => o.label) } })
    if (q.myVote != null && before?.myVote !== q.myVote) ops.push({ kind: 'upsert', table: 'cell_poll_votes', row: { poll_id: q.id, user_id: '$uid', option: q.myVote }, onConflict: 'poll_id,user_id' })
  }
  const nextPolls = byId(next.polls)
  for (const q of prev.polls) if (isUuid(q.id) && !nextPolls.has(q.id)) ops.push({ kind: 'delete', table: 'cell_polls', match: { id: q.id } })

  // Playlist da célula (o líder).
  const prevSongs = byId(prev.playlist)
  for (const s of next.playlist) if (isUuid(s.id) && !prevSongs.has(s.id)) ops.push({ kind: 'upsert', table: 'cell_playlist', row: { id: s.id, cell_id: cell, title: s.title, artist: s.artist, url: s.url ?? null } })
  const nextSongs = byId(next.playlist)
  for (const s of prev.playlist) if (isUuid(s.id) && !nextSongs.has(s.id)) ops.push({ kind: 'delete', table: 'cell_playlist', match: { id: s.id } })

  // Materiais: o arquivo sobe para a pasta da célula e a linha guarda o caminho. Apagar tira os dois.
  const prevFiles = byId(prev.materials)
  for (const f of next.materials) {
    if (!isUuid(f.id) || prevFiles.has(f.id) || !f.uri || /^https?:/.test(f.uri)) continue
    const path = materialPath(cell, f.id, f.name)
    ops.push({ kind: 'upload', bucket: 'cell-files', path, uri: f.uri, contentType: contentTypeOf(f.name) })
    ops.push({ kind: 'upsert', table: 'cell_materials', row: { id: f.id, cell_id: cell, name: f.name, kind: f.kind, path } })
  }
  const nextFiles = byId(next.materials)
  for (const f of prev.materials) {
    if (!isUuid(f.id) || nextFiles.has(f.id)) continue
    ops.push({ kind: 'delete', table: 'cell_materials', match: { id: f.id } })
    ops.push({ kind: 'remove', bucket: 'cell-files', paths: [materialPath(cell, f.id, f.name)] })
  }

  // Capa da célula.
  if (prev.coverUri !== next.coverUri) {
    if (next.coverUri && !/^https?:/.test(next.coverUri)) {
      ops.push({ kind: 'upload', bucket: 'cell-files', path: `${cell}/capa.jpg`, uri: next.coverUri, contentType: 'image/jpeg' })
      ops.push({ kind: 'update', table: 'cells', values: { cover_path: `${cell}/capa.jpg` }, match: { id: cell } })
    } else if (!next.coverUri) {
      ops.push({ kind: 'update', table: 'cells', values: { cover_path: null }, match: { id: cell } })
      ops.push({ kind: 'remove', bucket: 'cell-files', paths: [`${cell}/capa.jpg`] })
    }
  }

  // "Orei por você" nos pedidos da célula.
  const prevPrayers = byId(prev.prayers)
  for (const p of next.prayers) {
    const before = prevPrayers.get(p.id)
    if (!before || !isUuid(p.id) || !!before.iPrayed === !!p.iPrayed) continue
    ops.push(p.iPrayed ? { kind: 'upsert', table: 'prayer_prayed', row: { request_id: p.id, user_id: '$uid' } } : { kind: 'delete', table: 'prayer_prayed', match: { request_id: p.id, user_id: '$uid' } })
  }

  // Conteúdo denunciado: some na hora para quem denunciou, também em outro celular.
  for (const id of next.hidden) {
    if (prev.hidden.includes(id) || !isUuid(id)) continue
    const type = next.board.some((b) => b.id === id) ? 'board' : 'prayer'
    ops.push({ kind: 'upsert', table: 'hidden_content', row: { user_id: '$uid', target_type: type, target_id: id } })
  }

  return ops
}

/** Criar célula: a função do banco põe quem criou como líder. Depois vão a escala e o roteiro. */
export function createCellOps(c: Cell): SyncOp[] {
  // Como a célula nasce no banco: sem escala, sem roteiro e com o tamanho máximo padrão (10).
  const blank: Cell = { ...c, schedule: [], plan: [], planTitle: '', planRef: '', maxSize: 10 }
  return [
    { kind: 'rpc', fn: 'create_cell', args: { p_id: c.id, p_name: c.name, p_type: c.type, p_weekday: c.day, p_time: c.time, p_address: c.address, p_reference: c.reference, p_neighborhood: c.neighborhood } },
    ...cellDiffOps(blank, c),
  ]
}

// ─── Leitura do banco ────────────────────────────────────────────────────────

export interface PulledCells {
  cells: Cell[]
  /** Pedido de entrada esperando o líder. */
  pending: boolean
}

interface Card {
  user_id: string
  name: string
  birthday: string | null
  role: CellRole
  status: 'pending' | 'approved' | 'rejected'
  active: boolean
  show_books: boolean
  books_read: number | null
  phone: string | null
  is_me: boolean
}

/**
 * Traz do banco as células de quem está logado, já no formato das telas.
 * O que o banco ainda não guarda (plano de leitura da célula, histórico) vem da cópia do aparelho.
 */
export async function pullCells(uid: string, local: Cell[], now = new Date()): Promise<PulledCells | null> {
  if (!supabase) return null
  const db = supabase
  const mine = await db.from('cell_members').select('cell_id, role, status, muted').eq('user_id', uid)
  if (mine.error) return null
  const approved = (mine.data ?? []).filter((m) => m.status === 'approved')
  const pending = (mine.data ?? []).some((m) => m.status === 'pending')
  const cells: Cell[] = []
  for (const m of approved) {
    const c = await pullOne(db, uid, m.cell_id, m.role as CellRole, m.muted, local.find((x) => x.id === m.cell_id) ?? null, now)
    if (!c) return null
    cells.push(c)
  }
  return { cells, pending }
}

async function pullOne(db: NonNullable<typeof supabase>, uid: string, cellId: string, myRole: CellRole, muted: boolean, local: Cell | null, now: Date): Promise<Cell | null> {
  const asMe = (id: string | null) => (id === uid ? 'me' : id)
  const today = now.toISOString().slice(0, 10)
  const [row, cards, schedule, meetings, board, rides, swaps, leads, prayers, prayed, rsvp, hidden, polls, votes, counts, playlist, materials] = await Promise.all([
    db.from('cells').select('id, name, type, weekday, time, address, reference, neighborhood, invite_code, archived, max_size, plan, cover_path, created_at').eq('id', cellId).single(),
    db.rpc('cell_member_cards', { p_cell: cellId }),
    db.from('cell_schedule').select('id, role_name, member_id').eq('cell_id', cellId).is('meeting_date', null),
    db.from('cell_meetings').select('id, date, time, extra, cancelled').eq('cell_id', cellId).order('date', { ascending: true }),
    db.from('cell_board').select('id, author_id, text, created_at').eq('cell_id', cellId).order('created_at', { ascending: false }),
    db.from('cell_rides').select('id, driver_id, origin, seats, ride_requests(user_id, status)').eq('cell_id', cellId),
    db.from('cell_swaps').select('id, schedule_id, from_id, to_id, status').eq('cell_id', cellId),
    myRole === 'lider' ? db.from('cell_leads').select('id, name, phone, notes, follow_up_at, created_at').eq('cell_id', cellId) : Promise.resolve({ data: [], error: null }),
    myRole === 'visitante' ? Promise.resolve({ data: [], error: null }) : db.from('prayer_requests').select('id, user_id, text, created_at').eq('shared_cell_id', cellId).neq('user_id', uid),
    db.from('prayer_prayed').select('request_id').eq('user_id', uid),
    db.from('cell_rsvps').select('meeting_date, going').eq('cell_id', cellId).eq('user_id', uid).gte('meeting_date', today),
    db.from('hidden_content').select('target_id').eq('user_id', uid),
    db.from('cell_polls').select('id, question, options').eq('cell_id', cellId).order('created_at', { ascending: false }),
    db.from('cell_poll_votes').select('poll_id, option').eq('user_id', uid),
    db.rpc('cell_poll_counts', { p_cell: cellId }),
    db.from('cell_playlist').select('id, title, artist, url').eq('cell_id', cellId).order('created_at', { ascending: true }),
    db.from('cell_materials').select('id, name, kind, path, created_at').eq('cell_id', cellId).order('created_at', { ascending: false }),
  ])
  const all = [row, cards, schedule, meetings, board, rides, swaps, leads, prayers, prayed, rsvp, hidden, polls, votes, counts, playlist, materials]
  if (all.some((r) => r.error) || !row.data) return null
  const c = row.data
  const list = (cards.data ?? []) as Card[]

  // Presença: últimas 4 reuniões que já aconteceram e não foram canceladas.
  const past = (meetings.data ?? []).filter((m) => !m.cancelled && m.date <= today).slice(-4)
  const att = past.length
    ? await db.from('cell_attendance').select('meeting_id, user_id, present').in('meeting_id', past.map((m) => m.id))
    : { data: [] as { meeting_id: string; user_id: string; present: boolean }[], error: null }
  if (att.error) return null
  const lastAttendance = (userId: string) => past.filter((m) => (att.data ?? []).some((a) => a.meeting_id === m.id && a.user_id === userId)).map((m) => !!(att.data ?? []).find((a) => a.meeting_id === m.id && a.user_id === userId)?.present)

  const localMember = (id: string) => local?.members.find((x) => x.id === id)
  const members: Member[] = list
    .filter((x) => x.status === 'approved')
    .map((x) => ({
      id: x.is_me ? 'me' : x.user_id,
      name: x.name || 'Sem nome',
      role: x.role,
      phone: x.phone ?? '',
      ...(x.birthday ? { birthday: x.birthday } : {}),
      since: localMember(x.is_me ? 'me' : x.user_id)?.since ?? '',
      active: x.active,
      lastAttendance: lastAttendance(x.user_id),
      ...(x.is_me ? { isMe: true } : {}),
      showReadingProgress: x.show_books,
      ...(x.books_read != null ? { readingProgress: Math.round((x.books_read / 66) * 100) } : {}),
    }))

  const schedRows = (schedule.data ?? []).map((s) => ({ id: s.id, role: s.role_name, memberId: asMe(s.member_id) }))
  const order = (r: string) => (DEFAULT_ROLES.indexOf(r) < 0 ? 99 : DEFAULT_ROLES.indexOf(r))
  schedRows.sort((a, b) => order(a.role) - order(b.role))

  const plan = (c.plan ?? {}) as { title?: string; ref?: string; sections?: Cell['plan'] }
  const meetingsData = meetings.data ?? []
  const cellBase = {
    day: c.weekday ?? 0,
    time: c.time ?? '',
    cancelledDates: meetingsData.filter((m) => m.cancelled).map((m) => m.date),
    extraMeetings: meetingsData.filter((m) => m.extra && !m.cancelled).map((m) => ({ date: m.date, time: m.time ?? c.time ?? '' })),
  }
  const next = nextMeeting(cellBase, now)
  const myRsvp = next ? (rsvp.data ?? []).find((r) => r.meeting_date === next.date) : undefined
  const confirmed = next ? await db.rpc('cell_rsvp_count', { p_cell: cellId, p_date: next.date }) : { data: 0, error: null }
  const prayedSet = new Set((prayed.data ?? []).map((p) => p.request_id))
  const hiddenIds = (hidden.data ?? []).map((h) => h.target_id)
  const voteRows = (counts.data ?? []) as { poll_id: string; option: number; votes: number }[]
  const myVotes = new Map((votes.data ?? []).map((v) => [v.poll_id, v.option]))
  // Arquivos privados: o app mostra por link temporário.
  const cover = c.cover_path ? await signedUrl('cell-files', c.cover_path) : null
  const files = await Promise.all((materials.data ?? []).map(async (f) => ({ ...f, url: await signedUrl('cell-files', f.path) })))
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const longDay = (ts: string) => {
    const d = new Date(ts)
    return `${d.getDate()} de ${months[d.getMonth()]}`
  }

  return {
    id: c.id,
    name: c.name,
    type: (c.type as Cell['type']) ?? null,
    ...cellBase,
    address: c.address ?? '',
    reference: c.reference ?? '',
    neighborhood: c.neighborhood ?? '',
    ...(cover ? { coverUri: cover } : {}),
    code: c.invite_code,
    maxSize: c.max_size ?? 10,
    archived: c.archived,
    muted,
    foundedAt: iso(c.created_at),
    myRole,
    members,
    pendingJoins: list.filter((x) => x.status === 'pending').map((x) => ({ id: x.user_id, name: x.name || 'Sem nome', phone: x.phone ?? '', requestedAt: '' })),
    visitors: (leads.data ?? []).map((v) => ({ id: v.id, name: v.name, phone: v.phone, date: iso(v.created_at), notes: v.notes ?? '', followUpAt: v.follow_up_at ?? '' })),
    schedule: schedRows,
    plan: plan.sections ?? [],
    planTitle: plan.title ?? '',
    planRef: plan.ref ?? '',
    confirmedOthers: typeof confirmed.data === 'number' ? confirmed.data : 0,
    ...(myRsvp ? { myRsvp: myRsvp.going ? ('vou' as const) : ('naovou' as const) } : {}),
    swaps: (swaps.data ?? []).map((s) => ({
      id: s.id,
      fromId: asMe(s.from_id) ?? '',
      toId: asMe(s.to_id) ?? '',
      role: schedRows.find((r) => r.id === s.schedule_id)?.role ?? '',
      date: next ? next.date : '',
      status: s.status === 'accepted' ? ('approved' as const) : (s.status as 'pending' | 'declined'),
    })),
    board: (board.data ?? []).map((b) => ({ id: b.id, authorId: asMe(b.author_id) ?? '', text: b.text, at: iso(b.created_at) })),
    polls: (polls.data ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.options as string[]).map((label, i) => ({ label, votes: voteRows.find((v) => v.poll_id === q.id && v.option === i)?.votes ?? 0 })),
      ...(myVotes.has(q.id) ? { myVote: myVotes.get(q.id) } : {}),
    })),
    materials: files.map((f) => ({ id: f.id, name: f.name, kind: f.kind === 'PDF' ? ('PDF' as const) : ('Imagem' as const), size: local?.materials.find((m) => m.id === f.id)?.size ?? '', date: longDay(f.created_at), ...(f.url ? { uri: f.url } : {}) })),
    playlist: (playlist.data ?? []).map((s) => ({ id: s.id, title: s.title, artist: s.artist, ...(s.url ? { url: s.url } : {}) })),
    prayers: (prayers.data ?? []).map((p) => ({ id: p.id, memberId: p.user_id, text: p.text, prayedCount: 0, iPrayed: prayedSet.has(p.id), at: iso(p.created_at) })),
    rides: (rides.data ?? []).map((r) => ({
      id: r.id,
      driverId: asMe(r.driver_id) ?? '',
      from: r.origin,
      seats: r.seats,
      requests: ((r.ride_requests ?? []) as { user_id: string; status: string }[])
        .filter((q) => q.status !== 'declined')
        .map((q) => ({ memberId: asMe(q.user_id) ?? '', status: q.status as 'pending' | 'accepted' })),
    })),
    readingPlan: local?.readingPlan ?? { planId: '', joined: false },
    history: local?.history ?? { meetings: past.length, avgAttendance: 0, answered: 0 },
    hidden: [...new Set([...(local?.hidden ?? []), ...hiddenIds])],
  }
}

// ─── Entrar com código ───────────────────────────────────────────────────────

export interface FoundCell {
  name: string
  leader: string
  when: string
  neighborhood: string
}

/** Procura a célula pelo código. Mostra só nome, líder, dia e bairro: o endereço aparece depois da aprovação. */
export async function findCellByCode(code: string): Promise<FoundCell | 'invalid' | 'failed'> {
  if (!supabase) return 'failed'
  const { data, error } = await supabase.rpc('public_cell_page', { p_code: code })
  if (error) return 'failed'
  const c = (data ?? [])[0] as { name: string; weekday: number | null; time: string | null; neighborhood: string | null; leader_first_name: string | null; archived: boolean } | undefined
  if (!c || c.archived) return 'invalid'
  const days = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']
  return { name: c.name, leader: c.leader_first_name ?? '', when: [c.weekday != null ? days[c.weekday] : '', c.time ?? ''].filter(Boolean).join(', '), neighborhood: c.neighborhood ?? '' }
}

/** Pede para entrar. Sempre fica pendente até o líder aprovar. */
export async function requestJoinRemote(code: string): Promise<'ok' | 'invalid' | 'failed'> {
  if (!supabase) return 'failed'
  const { error } = await supabase.rpc('request_join', { p_code: code })
  if (!error) return 'ok'
  return /inv[aá]lido/i.test(error.message) ? 'invalid' : 'failed'
}
