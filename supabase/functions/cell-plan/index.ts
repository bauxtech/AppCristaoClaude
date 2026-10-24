// POST /functions/v1/cell-plan
//   { mode: 'draft', theme, ref?, context? }   rascunho do roteiro a partir do tema
//   { mode: 'import', image: base64, mediaType } leitura do PDF ou da foto do roteiro
// Roteiro da célula com IA, só no plano Líder. Confere login, o plano e os limites no servidor. Nada é guardado.
import { askJsonFor, PLAN_MODEL } from '../_shared/claude.ts'
import { draftCellPlan, importCellPlan } from '../_shared/cell-plan.ts'
import { MAX_BODY, readUpload } from '../_shared/upload.ts'
import { useLimit } from '../_shared/usage.ts'
import { admin, asUser, cors, json, userId } from '../_shared/http.ts'

type Row = { verse_key: string; text: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)

  const length = Number(req.headers.get('content-length') ?? '0')
  if (!length || length > MAX_BODY) return json({ ok: false, reason: 'too_big' })
  const body = await req.json().catch(() => ({}))
  const db = admin()
  const askJson = askJsonFor(PLAN_MODEL)
  const useDay = () => useLimit(db, uid, 'plan_ai')

  let result: unknown = null
  if (body.mode === 'draft') {
    const theme = typeof body.theme === 'string' ? body.theme : ''
    const ref = typeof body.ref === 'string' ? body.ref : ''
    if (!theme.trim() && !ref.trim()) return json({ error: 'Informe o tema ou o texto base' }, 400)
    const user = asUser(req)
    result = await draftCellPlan(
      {
        useMonth: () => useLimit(db, uid, 'plan_draft'),
        useDay,
        askJson,
        searchVerses: async (q) => ((await user.rpc('search_verses', { p_query: q, p_limit: 12 })).data ?? []).map((v: Row) => ({ key: v.verse_key, text: v.text })),
        versesByKeys: async (keys) => (keys.length ? ((await user.rpc('verses_by_keys', { p_keys: keys })).data ?? []) : []).map((v: Row) => ({ key: v.verse_key, text: v.text })),
      },
      { theme, ref, context: typeof body.context === 'string' ? body.context : null },
    ).catch((e) => {
      console.error('cell-plan', e)
      return null
    })
  } else if (body.mode === 'import') {
    const upload = await readUpload(body)
    if (!upload.ok) return 'error' in upload ? json({ error: upload.error }, 400) : json(upload)
    result = await importCellPlan({ useMonth: () => useLimit(db, uid, 'plan_import'), useDay, askJson }, upload.file).catch((e) => {
      console.error('cell-plan', e)
      return null
    })
  } else {
    return json({ error: 'Pedido inválido' }, 400)
  }
  if (!result) return json({ error: 'Não foi possível montar o roteiro agora.' }, 502)
  return json(result)
})
