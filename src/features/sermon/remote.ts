import { readBytes } from '../../lib/files'
import { callFunction, supabase } from '../../lib/supabase'
import { bookBySlug } from '../bible/books'
import type { Sermon, VerseRef } from './data'

// Culto pelo servidor: o app sobe o áudio, a função transcreve (OpenAI) e resume (Claude).
// O áudio sobe para sermon-audio/<id da pessoa>/<id do culto>.m4a. A função apaga o áudio no fim,
// a não ser que a pessoa tenha escolhido guardar (30 dias).

/** Limite da transcrição por arquivo. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024

export type FailReason = 'too_big' | 'no_audio' | 'limit' | 'no_access' | 'empty' | 'no_login' | 'error'

export interface RemoteResult {
  theme: string
  transcript: string
  summary: string
  points: string[]
  application: string
  verses: VerseRef[]
}

/** "joao:10:11" vira João 10:11, com o nome do livro do app. */
export function toVerseRef(key: string): VerseRef {
  const [slug, chapter, verse] = key.split(':')
  return { book: bookBySlug(slug)?.name ?? slug, chapter: Number(chapter), ...(verse ? { verse: Number(verse) } : {}) }
}

type Row = { status: 'processing' | 'ready' | 'failed'; title: string; transcript: string | null; summary: { reason?: string; summary?: string; points?: string[]; application?: string; verses?: { key: string }[] } | null }

export function fromRow(r: Row): RemoteResult | FailReason | 'processing' {
  if (r.status === 'processing') return 'processing'
  const reason = r.summary?.reason
  if (r.status === 'failed') return reason === 'limit' || reason === 'no_access' || reason === 'empty' ? reason : 'error'
  const s = r.summary ?? {}
  return {
    theme: r.title,
    transcript: r.transcript ?? '',
    summary: s.summary ?? '',
    points: s.points ?? [],
    application: s.application ?? '',
    verses: (s.verses ?? []).map((v) => toVerseRef(v.key)),
  }
}

/** Sobe o áudio, cria o culto no banco e pede o processamento. */
export async function startRemote(s: Sermon, uid: string): Promise<'ok' | FailReason> {
  if (!supabase) return 'error'
  if (!s.audioUri) return 'no_audio'
  const bytes = await readBytes(s.audioUri)
  if (!bytes) return 'no_audio'
  if (bytes.byteLength > MAX_AUDIO_BYTES) return 'too_big'
  const path = `${uid}/${s.id}.m4a`
  const up = await supabase.storage.from('sermon-audio').upload(path, bytes, { contentType: 'audio/mp4', upsert: true })
  if (up.error) return 'error'
  // Sem mexer na situação: quem marca "processando" é a trava do servidor (claim_sermon).
  const row = await supabase.from('sermons').upsert({ id: s.id, user_id: uid, church: s.church || null, date: s.date, duration_sec: Math.round(s.trim.end - s.trim.start), audio_path: path, notes: s.notes })
  if (row.error) return 'error'
  try {
    await callFunction('sermon-process', { sermonId: s.id, keepAudio: s.keepAudio })
  } catch (e) {
    // 409: o servidor já está processando este culto (pedido repetido). Basta esperar o resultado.
    if ((e as { context?: { status?: number } })?.context?.status === 409) return 'ok'
    return 'error'
  }
  return 'ok'
}

/** Espera o resultado. Volta 'processing' se ainda não terminou no tempo dado. */
export async function waitRemote(id: string, timeoutMs = 10 * 60_000, everyMs = 5000): Promise<RemoteResult | FailReason | 'processing'> {
  if (!supabase) return 'error'
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, everyMs))
    const { data, error } = await supabase.from('sermons').select('status, title, transcript, summary').eq('id', id).maybeSingle()
    if (error) continue
    if (!data) return 'error'
    const r = fromRow(data as Row)
    if (r !== 'processing') return r
  }
  return 'processing'
}
