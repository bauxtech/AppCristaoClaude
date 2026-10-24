// Foto ou PDF mandado em base64 para a IA ler (curso e roteiro da célula). O arquivo não é guardado.
// Confere o tipo, o tamanho e, no PDF, o número de páginas antes de gastar com a IA.
import { PDFDocument } from 'npm:pdf-lib@1.17.1'
import type { FileType } from './claude-types.ts'

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_PDF_PAGES = 20
// 10 MB em base64 (cerca de 13,4 MB) e uma folga. Corpo maior é recusado antes de ser lido.
export const MAX_BODY = 14_500_000

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

export type Upload = { ok: true; file: { data: string; mediaType: FileType } } | { ok: false; reason: 'too_big' | 'too_many_pages' | 'failed' } | { ok: false; error: string }

export async function readUpload(body: Record<string, unknown>): Promise<Upload> {
  const data = typeof body.image === 'string' ? body.image.replace(/^data:[^,]*,/, '') : ''
  const mediaType = TYPES.find((t) => t === body.mediaType) ?? 'image/jpeg'
  if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return { ok: false, error: 'Arquivo inválido' }
  const clean = data.replace(/\s/g, '')
  const bytes = (clean.length * 3) / 4
  if (mediaType === 'application/pdf') {
    if (bytes > MAX_PDF_BYTES) return { ok: false, reason: 'too_big' }
    let raw: Uint8Array
    try {
      raw = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0))
    } catch {
      return { ok: false, error: 'Arquivo inválido' }
    }
    // Conta as páginas pelo próprio PDF (inclusive os comprimidos). Se não der para contar, não lê.
    let pages: number
    try {
      pages = (await PDFDocument.load(raw, { ignoreEncryption: true, updateMetadata: false })).getPageCount()
    } catch {
      return { ok: false, reason: 'failed' }
    }
    if (pages > MAX_PDF_PAGES) return { ok: false, reason: 'too_many_pages' }
  } else if (bytes > MAX_PHOTO_BYTES) {
    return { ok: false, reason: 'too_big' }
  }
  return { ok: true, file: { data: clean, mediaType } }
}
