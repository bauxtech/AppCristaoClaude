import { callFunction } from '../../lib/supabase'

// Curso pela foto do cronograma: o servidor lê a foto (plano Completo e Líder) e devolve os campos para a pessoa conferir.

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

export type CoursePhotoResult = { ok: true; course: CourseRead } | { ok: false; reason: 'no_access' | 'limit' | 'not_found' | 'failed'; resetsAt?: string | null }

const REASONS = ['no_access', 'limit', 'not_found', 'failed'] as const

export async function readCoursePhotoRemote(base64: string, mimeType: string): Promise<CoursePhotoResult> {
  try {
    const mediaType = ['image/png', 'image/webp'].includes(mimeType) ? mimeType : 'image/jpeg'
    const r = await callFunction<CoursePhotoResult>('course-photo', { image: base64, mediaType })
    if (r?.ok && r.course) return r
    if (r && !r.ok && REASONS.includes(r.reason)) return r
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
