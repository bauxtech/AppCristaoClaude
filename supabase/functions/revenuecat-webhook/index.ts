// Webhook do RevenueCat: a loja avisa compra, renovação, troca, transferência, cancelamento, falha de pagamento e expiração.
// O segredo REVENUECAT_WEBHOOK_SECRET é o mesmo configurado no painel do RevenueCat (Authorization).
// Com REVENUECAT_SECRET_KEY, o servidor não confia no corpo do aviso: consulta o RevenueCat e grava o que vale agora.
// Isso cobre aviso fora de ordem, troca de plano agendada e "Restaurar compra" em outra conta (TRANSFER).
// Compra de teste (SANDBOX) só vale com REVENUECAT_ALLOW_SANDBOX=true, para os testes antes do lançamento.
import { affectedUsers, fetchSubscriber, patchFromEvent, patchFromSubscriber, validWebhookAuth, type RcEvent } from '../_shared/revenuecat.ts'
import { admin, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('REVENUECAT_WEBHOOK_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const body = await req.json().catch(() => null)
  const event = body?.event as RcEvent | undefined
  if (!event) return json({ status: 'ignorado' })
  const allowSandbox = Deno.env.get('REVENUECAT_ALLOW_SANDBOX') === 'true'
  if (event.environment === 'SANDBOX' && !allowSandbox) return json({ status: 'ignorado (compra de teste)' })

  const db = admin()
  const key = Deno.env.get('REVENUECAT_SECRET_KEY')
  const now = new Date().toISOString()

  if (key) {
    for (const uid of affectedUsers(event)) {
      const sub = await fetchSubscriber(uid, key)
      if (!sub) return json({ error: 'Não foi possível consultar a loja' }, 502) // o RevenueCat tenta de novo
      const patch = patchFromSubscriber(uid, sub, new Date(), allowSandbox)
      // Sem nenhum plano ativo na loja (inclusive quem perdeu a compra na transferência): a assinatura da loja acaba.
      const { error } = patch
        ? await db.from('subscriptions').update({ ...patch, updated_at: now }).eq('user_id', uid)
        : await db.from('subscriptions').update({ status: 'expired', updated_at: now }).eq('user_id', uid).not('plan', 'is', null)
      if (error) return json({ error: error.message }, 500)
    }
    return json({ status: 'ok' })
  }

  const patch = patchFromEvent(event)
  if (!patch) return json({ status: 'ignorado' })
  const { error } = await db.from('subscriptions').update({ ...patch, updated_at: now }).eq('user_id', patch.user_id)
  if (error) return json({ error: error.message }, 500)
  return json({ status: 'ok' })
})
