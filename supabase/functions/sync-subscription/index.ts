// POST /functions/v1/sync-subscription
// O app chama logo depois de comprar ou restaurar, para não esperar o aviso do RevenueCat.
// Consulta o RevenueCat com a chave secreta (REVENUECAT_SECRET_KEY, só no Supabase) e grava a assinatura da própria pessoa.
import { fetchSubscriber, patchFromSubscriber } from '../_shared/revenuecat.ts'
import { admin, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const key = Deno.env.get('REVENUECAT_SECRET_KEY')
  if (!key) return json({ status: 'not_configured' })

  const sub = await fetchSubscriber(uid, key)
  if (!sub) return json({ error: 'Não foi possível consultar a loja' }, 502)
  const patch = patchFromSubscriber(uid, sub, new Date(), Deno.env.get('REVENUECAT_ALLOW_SANDBOX') === 'true')
  const now = new Date().toISOString()
  if (!patch) {
    // Nada ativo na loja para esta conta: se ela tinha plano da loja, acabou (ex.: a compra foi restaurada em outra conta).
    await admin().from('subscriptions').update({ status: 'expired', updated_at: now }).eq('user_id', uid).not('plan', 'is', null)
    return json({ status: 'none' })
  }
  const { error } = await admin().from('subscriptions').update({ ...patch, updated_at: now }).eq('user_id', uid)
  if (error) return json({ error: 'Não foi possível salvar' }, 500)
  return json({ status: patch.status, plan: patch.plan ?? null })
})
