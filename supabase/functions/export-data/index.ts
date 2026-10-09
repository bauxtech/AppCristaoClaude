// POST /functions/v1/export-data
// Devolve, em JSON, tudo o que o servidor guarda da pessoa (LGPD, "Baixar meus dados").
import { ADMIN_EXPORT_TABLES, EXPORT_EITHER, EXPORT_TABLES, PAGE, exportFile } from '../_shared/export.ts'
import { admin, asUser, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const db = asUser(req)
  const parts: Record<string, unknown[]> = {}
  // Lê em páginas de 1000 até acabar: o arquivo sai completo, sem corte.
  const readAll = async (client: typeof db, table: string, filter: (q: any) => any) => {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await filter(client.from(table).select('*')).range(from, from + PAGE - 1)
      if (error) throw new Error(table)
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE) return rows
    }
  }
  try {
    for (const [table, owner] of EXPORT_TABLES) parts[table] = await readAll(db, table, (q) => q.eq(owner, uid))
    for (const [table, owners] of EXPORT_EITHER) parts[table] = await readAll(db, table, (q) => q.or(owners.map((o) => `${o}.eq.${uid}`).join(',')))
  } catch (e) {
    return json({ error: `Não foi possível ler ${(e as Error).message}` }, 500)
  }
  // Denúncias: o app não lê essa tabela; o servidor lê só as feitas por esta pessoa (o id vem do login conferido).
  const adm = admin()
  try {
    for (const [table, owner] of ADMIN_EXPORT_TABLES) parts[table] = await readAll(adm, table, (q) => q.eq(owner, uid))
  } catch (e) {
    return json({ error: `Não foi possível ler ${(e as Error).message}` }, 500)
  }
  return json(exportFile(uid, parts))
})
