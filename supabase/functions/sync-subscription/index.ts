// POST /functions/v1/sync-subscription
// O app chama logo depois de comprar ou restaurar, para não esperar o aviso do RevenueCat.
// Consulta o RevenueCat com a chave secreta (REVENUECAT_SECRET_KEY, só no Supabase) e grava a assinatura da própria pessoa.
import { patchFromSubscriber, type RcSubscriber } from '../_shared/revenuecat.ts'
import { admin, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const key = Deno.env.get('REVENUECAT_SECRET_KEY')
  if (!key) return json({ status: 'not_configured' })

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) return json({ error: 'Não foi possível consultar a loja' }, 502)
  const body = (await res.json().catch(() => null)) as { subscriber?: RcSubscriber } | null
  const patch = body?.subscriber ? patchFromSubscriber(uid, body.subscriber) : null
  if (!patch) return json({ status: 'none' })
  const { error } = await admin().from('subscriptions').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', uid)
  if (error) return json({ error: 'Não foi possível salvar' }, 500)
  return json({ status: patch.status, plan: patch.plan ?? null })
})
