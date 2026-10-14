// POST /functions/v1/course-photo  { image: base64, mediaType }
// Lê a foto ou o PDF do cronograma do curso. Confere login, o plano (Completo ou Líder) e os limites no servidor.
// O arquivo não é guardado.
import { askJsonFor, PHOTO_MODEL } from '../_shared/claude.ts'
import { MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_PHOTO_BYTES, pdfPages, readCoursePhoto } from '../_shared/course-photo.ts'
import { useLimit } from '../_shared/usage.ts'
import { admin, cors, json, userId } from '../_shared/http.ts'

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)

  const body = await req.json().catch(() => ({}))
  const data = typeof body.image === 'string' ? body.image.replace(/^data:[^,]*,/, '') : ''
  const mediaType = TYPES.find((t) => t === body.mediaType) ?? 'image/jpeg'
  if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return json({ error: 'Foto inválida' }, 400)
  const clean = data.replace(/\s/g, '')
  const bytes = (clean.length * 3) / 4
  if (mediaType === 'application/pdf') {
    if (bytes > MAX_PDF_BYTES) return json({ ok: false, reason: 'too_big' })
    let raw: Uint8Array
    try {
      raw = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0))
    } catch {
      return json({ error: 'Arquivo inválido' }, 400)
    }
    if (pdfPages(raw) > MAX_PDF_PAGES) return json({ ok: false, reason: 'too_many_pages' })
  } else if (bytes > MAX_PHOTO_BYTES) {
    return json({ ok: false, reason: 'too_big' })
  }

  const db = admin()
  const result = await readCoursePhoto(
    {
      useMonth: () => useLimit(db, uid, 'course_read'),
      useDay: () => useLimit(db, uid, 'course_photo'),
      askJson: askJsonFor(PHOTO_MODEL),
    },
    { data: clean, mediaType },
    new Date().getFullYear(),
  ).catch((e) => {
    console.error('course-photo', e)
    return null
  })
  if (!result) return json({ error: 'Não foi possível ler a foto agora.' }, 502)
  return json(result)
})
