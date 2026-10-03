// Webhook do RevenueCat: a loja avisa compra, renovação, cancelamento, falha de pagamento e expiração.
// O segredo REVENUECAT_WEBHOOK_SECRET é o mesmo configurado no painel do RevenueCat (Authorization).
import { patchFromEvent, validWebhookAuth } from '../_shared/revenuecat.ts'
import { admin, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('REVENUECAT_WEBHOOK_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const body = await req.json().catch(() => null)
  const patch = body?.event ? patchFromEvent(body.event) : null
  if (!patch) return json({ status: 'ignorado' })
  const { error } = await admin().from('subscriptions').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', patch.user_id)
  if (error) return json({ error: error.message }, 500)
  return json({ status: 'ok' })
})
