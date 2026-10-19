// Rotina: envia os e-mails da régua de assinatura que estão na fila (email_outbox).
// Só roda com o segredo CRON_SECRET. Precisa de RESEND_API_KEY e EMAIL_FROM nos segredos das funções;
// sem eles, não envia nada e a fila espera. Confere a autorização da pessoa de novo na hora de enviar.
import { validWebhookAuth } from '../_shared/revenuecat.ts'
import { admin, json } from '../_shared/http.ts'
import { emailText, outboxAction, resendPayload, unsubscribeUrl, type OutboxRow } from '../_shared/email.ts'

Deno.serve(async (req) => {
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('CRON_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!key || !from) return json({ sent: 0, waiting: 'Falta RESEND_API_KEY ou EMAIL_FROM' })
  const db = admin()
  const { data, error } = await db
    .from('email_outbox')
    .select('id, subject, body, attempts, profiles(email, offers_email, offers_token, name)')
    .is('sent_at', null)
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return json({ error: error.message }, 500)

  let sent = 0
  let dropped = 0
  for (const row of (data ?? []) as unknown as OutboxRow[]) {
    const now = new Date().toISOString()
    if (outboxAction(row) === 'drop') {
      await db.from('email_outbox').update({ sent_at: now, last_error: 'sem autorização' }).eq('id', row.id)
      dropped++
      continue
    }
    const p = row.profiles!
    const unsub = unsubscribeUrl(Deno.env.get('SUPABASE_URL')!, p.offers_token)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resendPayload(from, p.email!, row.subject, emailText(row, p.name, unsub), unsub)),
    }).catch(() => null)
    if (res?.ok) {
      await db.from('email_outbox').update({ sent_at: now, attempts: row.attempts + 1, last_error: null }).eq('id', row.id)
      sent++
    } else {
      const msg = res ? `${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}` : 'sem resposta'
      await db.from('email_outbox').update({ attempts: row.attempts + 1, last_error: msg }).eq('id', row.id)
    }
  }
  return json({ sent, dropped })
})
