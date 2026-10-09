// POST /functions/v1/church-lookup  { cnpj }
// Busca a igreja nos dados públicos da Receita (BrasilAPI) e guarda no banco. Só aceita organização religiosa.
import { isReligious, onlyDigits, toChurchRow, validCnpj, type CnpjData } from '../_shared/church.ts'
import { admin, brDay, cors, json, userId } from '../_shared/http.ts'

/** Buscas na Receita por pessoa, por dia. Igreja que já está no banco não conta. */
const CNPJ_DAILY_LIMIT = 30

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const { cnpj } = await req.json().catch(() => ({}))
  if (!validCnpj(cnpj ?? '')) return json({ kind: 'invalid' })

  const db = admin()
  const digits = onlyDigits(cnpj)
  // Só vale como "já conhecida" a igreja gravada pelo servidor com os dados da Receita (sem created_by).
  const { data: known } = await db.from('churches').select('id, cnpj, name, address, neighborhood, city, created_by').eq('cnpj', digits).maybeSingle()
  if (known && !known.created_by) {
    const { created_by: _c, ...church } = known
    return json({ kind: 'found', church })
  }

  const left = (await db.rpc('consume_usage', { p_user: uid, p_kind: 'cnpj_day', p_period: brDay(), p_limit: CNPJ_DAILY_LIMIT })).data as number
  if (typeof left === 'number' && left < 0) return json({ kind: 'limit' })
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { headers: { Accept: 'application/json' } }).catch(() => null)
  if (!res) return json({ kind: 'unavailable' }, 502)
  if (res.status === 404 || res.status === 400) return json({ kind: 'not_found' })
  if (!res.ok) return json({ kind: 'unavailable' }, 502)
  const data = (await res.json().catch(() => null)) as CnpjData | null
  if (!data) return json({ kind: 'unavailable' }, 502)
  if (!isReligious(data)) return json({ kind: 'not_religious' })
  if (data.descricao_situacao_cadastral && data.descricao_situacao_cadastral.toUpperCase() !== 'ATIVA') return json({ kind: 'inactive' })

  // Se havia uma linha com esse CNPJ gravada por alguém, os dados da Receita tomam o lugar e ela deixa de ser de quem gravou.
  const { data: row, error } = await db.from('churches').upsert({ ...toChurchRow(digits, data), created_by: null }, { onConflict: 'cnpj' }).select('id, cnpj, name, address, neighborhood, city').single()
  if (error || !row) return json({ kind: 'unavailable' }, 502)
  return json({ kind: 'found', church: row })
})
