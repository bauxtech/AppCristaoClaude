// POST /functions/v1/export-data
// Devolve, em JSON, tudo o que o servidor guarda da pessoa (LGPD, "Baixar meus dados").
import { EXPORT_TABLES, exportFile } from '../_shared/export.ts'
import { asUser, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const db = asUser(req)
  const parts: Record<string, unknown[]> = {}
  for (const [table, owner] of EXPORT_TABLES) {
    const { data, error } = await db.from(table).select('*').eq(owner, uid).limit(10000)
    if (error) return json({ error: `Não foi possível ler ${table}` }, 500)
    parts[table] = data ?? []
  }
  return json(exportFile(uid, parts))
})
