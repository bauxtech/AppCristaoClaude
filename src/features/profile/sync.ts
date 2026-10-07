import { signedUrl } from '../../lib/files'
import type { SyncOp } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { isUuid } from '../../lib/uuid'
import type { Song } from '../music/catalog'
import type { FreeNote, Milestone } from './ProfileContext'

// Sincronização do perfil: foto, aniversário, privacidade, jornada, anotações e músicas favoritas.
// A foto vai para o balde privado 'avatars', na pasta da pessoa. Quem divide célula vê só se a pessoa deixar.

export interface SyncedProfile {
  photoUri?: string
  birthday?: string
  privacy: { showPhoto: boolean; showBirthday: boolean; showBooks: boolean }
  milestones: Milestone[]
  notes: FreeNote[]
  favoriteSongs: Song[]
}

export const AVATAR_PATH = '$uid/avatar.jpg'
const isRemoteUri = (u?: string) => !!u && /^https?:/.test(u)
const songKey = (s: Song) => `${s.title}\u0000${s.artist}`

function byId<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]))
}

export function profileDiffOps(prev: SyncedProfile, next: SyncedProfile): SyncOp[] {
  const ops: SyncOp[] = []
  const values: Record<string, unknown> = {}
  if (prev.birthday !== next.birthday) values.birthday = next.birthday || null
  if (prev.privacy.showPhoto !== next.privacy.showPhoto) values.show_photo = next.privacy.showPhoto
  if (prev.privacy.showBirthday !== next.privacy.showBirthday) values.show_birthday = next.privacy.showBirthday
  if (prev.privacy.showBooks !== next.privacy.showBooks) values.show_books = next.privacy.showBooks

  // Foto: arquivo novo do aparelho sobe; foto tirada apaga o arquivo. Link vindo do banco não sobe de novo.
  if (prev.photoUri !== next.photoUri) {
    if (next.photoUri && !isRemoteUri(next.photoUri)) {
      ops.push({ kind: 'upload', bucket: 'avatars', path: AVATAR_PATH, uri: next.photoUri, contentType: 'image/jpeg' })
      // Só aponta para a foto depois que ela subiu.
      ops.push({ kind: 'update', table: 'profiles', values: { photo_path: AVATAR_PATH }, match: { id: '$uid' }, afterUpload: true })
    } else if (!next.photoUri) {
      ops.push({ kind: 'remove', bucket: 'avatars', paths: [AVATAR_PATH] })
      values.photo_path = null
    }
  }
  if (Object.keys(values).length) ops.push({ kind: 'update', table: 'profiles', values, match: { id: '$uid' } })

  const pm = byId(prev.milestones)
  for (const m of next.milestones) if (isUuid(m.id) && pm.get(m.id) !== m) ops.push({ kind: 'upsert', table: 'milestones', row: { id: m.id, user_id: '$uid', type: m.type, date: m.date, description: m.desc } })
  const nm = byId(next.milestones)
  for (const m of prev.milestones) if (isUuid(m.id) && !nm.has(m.id)) ops.push({ kind: 'delete', table: 'milestones', match: { id: m.id, user_id: '$uid' } })

  const pn = byId(prev.notes)
  for (const n of next.notes) if (isUuid(n.id) && pn.get(n.id) !== n) ops.push({ kind: 'upsert', table: 'notes', row: { id: n.id, user_id: '$uid', source: n.source, ref: n.ref, text: n.text, created_at: new Date(`${n.date}T12:00:00`).toISOString() } })
  const nn = byId(next.notes)
  for (const n of prev.notes) if (isUuid(n.id) && !nn.has(n.id)) ops.push({ kind: 'delete', table: 'notes', match: { id: n.id, user_id: '$uid' } })

  const ps = new Set(prev.favoriteSongs.map(songKey))
  const ns = new Set(next.favoriteSongs.map(songKey))
  for (const s of next.favoriteSongs) if (!ps.has(songKey(s))) ops.push({ kind: 'upsert', table: 'favorite_songs', row: { user_id: '$uid', title: s.title, artist: s.artist }, onConflict: 'user_id,title,artist' })
  for (const s of prev.favoriteSongs) if (!ns.has(songKey(s))) ops.push({ kind: 'delete', table: 'favorite_songs', match: { user_id: '$uid', title: s.title, artist: s.artist } })
  return ops
}

/** Traz o perfil do banco. A foto vem como link temporário. */
export async function pullProfileData(uid: string): Promise<SyncedProfile | null> {
  if (!supabase) return null
  const [p, milestones, notes, songs] = await Promise.all([
    supabase.from('profiles').select('birthday, show_photo, show_birthday, show_books, photo_path').eq('id', uid).single(),
    supabase.from('milestones').select('id, type, date, description').eq('user_id', uid).order('date', { ascending: true }),
    supabase.from('notes').select('id, source, ref, text, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('favorite_songs').select('title, artist').eq('user_id', uid).order('created_at', { ascending: true }),
  ])
  if (p.error || milestones.error || notes.error || songs.error || !p.data) return null
  const photo = p.data.photo_path ? await signedUrl('avatars', p.data.photo_path) : null
  return {
    ...(photo ? { photoUri: photo } : {}),
    ...(p.data.birthday ? { birthday: p.data.birthday } : {}),
    privacy: { showPhoto: p.data.show_photo, showBirthday: p.data.show_birthday, showBooks: p.data.show_books },
    milestones: (milestones.data ?? []).map((m) => ({ id: m.id, type: m.type, date: m.date, desc: m.description })),
    notes: (notes.data ?? []).map((n) => ({ id: n.id, source: n.source as FreeNote['source'], ref: n.ref, text: n.text, date: n.created_at.slice(0, 10) })),
    favoriteSongs: (songs.data ?? []).map((s) => ({ title: s.title, artist: s.artist })),
  }
}
