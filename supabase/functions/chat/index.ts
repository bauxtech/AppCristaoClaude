// POST /functions/v1/chat  { question, conversationId?, context? }
// Chat bíblico. Confere login, assinatura e o limite de 20 perguntas por dia no servidor.
import { answerChat } from '../_shared/chat.ts'
import { askJson } from '../_shared/claude.ts'
import { DAILY_LIMIT } from '../_shared/rules.ts'
import { admin, asUser, brDay, cors, json, userId } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)

  const body = await req.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question : ''
  if (!question.trim()) return json({ error: 'Pergunta vazia' }, 400)

  const db = admin()
  const user = asUser(req)
  const day = brDay()
  const { data: profile } = await user.from('profiles').select('tradition, faith_consent').eq('id', uid).single()

  // Histórico só da própria conversa (as regras do banco garantem que é da pessoa).
  let history: { role: 'user' | 'assistant'; text: string }[] = []
  if (body.conversationId) {
    const { data } = await user.from('chat_messages').select('role, text').eq('conversation_id', body.conversationId).order('created_at', { ascending: true }).limit(12)
    history = (data ?? []) as typeof history
  }

  const result = await answerChat(
    {
      hasAccess: async () => (await db.rpc('has_access', { p_user: uid })).data === true,
      consume: async () => (await db.rpc('consume_usage', { p_user: uid, p_kind: 'chat_day', p_period: day, p_limit: DAILY_LIMIT })).data as number,
      refund: async () => void (await db.rpc('refund_usage', { p_user: uid, p_kind: 'chat_day', p_period: day })),
      searchVerses: async (q) => ((await user.rpc('search_verses', { p_query: q, p_limit: 12 })).data ?? []).map((v: { verse_key: string; text: string }) => ({ key: v.verse_key, text: v.text })),
      versesByKeys: async (keys) => (keys.length ? ((await user.rpc('verses_by_keys', { p_keys: keys })).data ?? []) : []).map((v: { verse_key: string; text: string }) => ({ key: v.verse_key, text: v.text })),
      askJson,
    },
    {
      question,
      // Sem consentimento para dado de fé, a tradição não é usada.
      tradition: profile?.faith_consent ? profile?.tradition : null,
      context: typeof body.context === 'string' ? body.context.slice(0, 300) : null,
      history,
    },
  ).catch((e) => {
    console.error('chat', e)
    return null
  })

  if (!result) return json({ error: 'Não foi possível responder agora. Tente de novo.' }, 502)

  // Mensagem de crise não é guardada.
  if (result.kind === 'answer' && body.conversationId) {
    await user.from('chat_messages').insert([
      { conversation_id: body.conversationId, user_id: uid, role: 'user', text: question.slice(0, 500) },
      { conversation_id: body.conversationId, user_id: uid, role: 'assistant', text: result.text, verses: result.verses },
    ])
  }
  return json(result)
})
