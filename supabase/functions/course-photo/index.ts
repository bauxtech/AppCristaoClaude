// POST /functions/v1/course-photo  { image: base64, mediaType }
// Lê a foto do cronograma do curso. Confere login, o plano (Completo ou Líder) e o limite por dia no servidor.
// A foto não é guardada.
import { askJsonFor, PHOTO_MODEL } from '../_shared/claude.ts'
import { MAX_PHOTO_BYTES, readCoursePhoto } from '../_shared/course-photo.ts'
import { useLimit } from '../_shared/usage.ts'
import { admin, cors, json, userId } from '../_shared/http.ts'

const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)

  const body = await req.json().catch(() => ({}))
  const data = typeof body.image === 'string' ? body.image.replace(/^data:[^,]*,/, '') : ''
  const mediaType = TYPES.find((t) => t === body.mediaType) ?? 'image/jpeg'
  if (!data || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return json({ error: 'Foto inválida' }, 400)
  if ((data.length * 3) / 4 > MAX_PHOTO_BYTES) return json({ error: 'Foto grande demais' }, 413)

  const db = admin()
  let refund = async () => {}
  const result = await readCoursePhoto(
    {
      use: async () => {
        const r = await useLimit(db, uid, 'course_photo')
        refund = r.refund
        return r.usage
      },
      refund: () => refund(),
      askJson: askJsonFor(PHOTO_MODEL),
    },
    { data: data.replace(/\s/g, ''), mediaType },
    new Date().getFullYear(),
  ).catch((e) => {
    console.error('course-photo', e)
    return null
  })
  if (!result) return json({ error: 'Não foi possível ler a foto agora.' }, 502)
  return json(result)
})
