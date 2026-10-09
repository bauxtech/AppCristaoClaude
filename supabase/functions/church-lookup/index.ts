// POST /functions/v1/church-lookup  { cnpj }
// Busca a igreja nos dados públicos da Receita (BrasilAPI) e guarda no banco. Só aceita organização religiosa.
import { isReligious, onlyDigits, toChurchRow, validCnpj, type CnpjData } from '../_shared/church.ts'
import { admin, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (!(await userId(req))) return json({ error: 'Precisa entrar na conta' }, 401)
  const { cnpj } = await req.json().catch(() => ({}))
  if (!validCnpj(cnpj ?? '')) return json({ kind: 'invalid' })

  const db = admin()
  const digits = onlyDigits(cnpj)
  const { data: known } = await db.from('churches').select('id, cnpj, name, address, neighborhood, city').eq('cnpj', digits).maybeSingle()
  if (known) return json({ kind: 'found', church: known })

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { headers: { Accept: 'application/json' } }).catch(() => null)
  if (!res) return json({ kind: 'unavailable' }, 502)
  if (res.status === 404 || res.status === 400) return json({ kind: 'not_found' })
  if (!res.ok) return json({ kind: 'unavailable' }, 502)
  const data = (await res.json().catch(() => null)) as CnpjData | null
  if (!data) return json({ kind: 'unavailable' }, 502)
  if (!isReligious(data)) return json({ kind: 'not_religious' })
  if (data.descricao_situacao_cadastral && data.descricao_situacao_cadastral.toUpperCase() !== 'ATIVA') return json({ kind: 'inactive' })

  const { data: row, error } = await db.from('churches').upsert(toChurchRow(digits, data), { onConflict: 'cnpj' }).select('id, cnpj, name, address, neighborhood, city').single()
  if (error || !row) return json({ kind: 'unavailable' }, 502)
  return json({ kind: 'found', church: row })
})
