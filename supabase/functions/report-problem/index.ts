// POST /functions/v1/report-problem  { message, screen, appVersion, platform, device }
// Guarda o relato de problema e avisa a equipe por e-mail (Resend). Sem RESEND_API_KEY ou EMAIL_FROM,
// o relato fica guardado no banco e o e-mail não sai.
import { admin, brDay, cors, json, userId } from '../_shared/http.ts'
import { REPORT_DAILY_LIMIT, parseReport, reportEmail } from '../_shared/report.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const input = parseReport(await req.json().catch(() => null))
  if (!input) return json({ kind: 'invalid' }, 400)

  const db = admin()
  const left = (await db.rpc('consume_usage', { p_user: uid, p_kind: 'report_day', p_period: brDay(), p_limit: REPORT_DAILY_LIMIT })).data as number
  if (typeof left === 'number' && left < 0) return json({ kind: 'limit' })

  const { data: row, error } = await db
    .from('problem_reports')
    .insert({ user_id: uid, ...input })
    .select('id')
    .single()
  if (error || !row) return json({ kind: 'failed' }, 500)

  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  let emailed = false
  if (key && from) {
    const { data: p } = await db.from('profiles').select('name, email').eq('id', uid).maybeSingle()
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reportEmail(from, input, { id: uid, name: p?.name ?? '', email: p?.email ?? null }, Deno.env.get('REPORT_TO') || undefined)),
    }).catch(() => null)
    emailed = !!res?.ok
    if (emailed) await db.from('problem_reports').update({ emailed_at: new Date().toISOString() }).eq('id', row.id)
  }
  return json({ kind: 'ok', emailed })
})
