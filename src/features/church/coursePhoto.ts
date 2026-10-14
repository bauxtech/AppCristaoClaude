import { callFunction } from '../../lib/supabase'

// Curso pela foto ou PDF do cronograma: o servidor lê o arquivo (plano Completo e Líder) e devolve os campos para a pessoa conferir.

export interface CourseRead {
  name: string
  type: string
  /** DD/MM/AAAA ou vazio. */
  firstDate: string
  /** 0 quando não deu para saber. */
  lessons: number
  /** HH:MM ou vazio. */
  time: string
}

export type CoursePhotoFail = 'no_access' | 'limit_month' | 'limit_day' | 'not_found' | 'too_big' | 'too_many_pages' | 'failed'
export type CoursePhotoResult = { ok: true; course: CourseRead } | { ok: false; reason: CoursePhotoFail; resetsAt?: string | null }

type Raw = { ok?: boolean; course?: CourseRead; reason?: string; scope?: string; resetsAt?: string | null } | null

const PLAIN = ['no_access', 'not_found', 'too_big', 'too_many_pages', 'failed'] as const

/** Bytes do arquivo em base64, em pedaços para não estourar a memória com PDF grande. */
export function toBase64(bytes: ArrayBuffer): string {
  const u = new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(bin)
}

export async function readCoursePhotoRemote(base64: string, mimeType: string): Promise<CoursePhotoResult> {
  try {
    const mediaType = ['image/png', 'image/webp', 'application/pdf'].includes(mimeType) ? mimeType : 'image/jpeg'
    const r = await callFunction<Raw>('course-photo', { image: base64, mediaType })
    if (r?.ok && r.course) return { ok: true, course: r.course }
    if (r?.reason === 'limit') return { ok: false, reason: r.scope === 'day' ? 'limit_day' : 'limit_month', resetsAt: r.resetsAt ?? null }
    if (r && PLAIN.includes(r.reason as (typeof PLAIN)[number])) return { ok: false, reason: r.reason as CoursePhotoFail }
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
