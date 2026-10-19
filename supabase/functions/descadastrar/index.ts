// Link "não quero mais receber" dos e-mails de oferta. Aberto sem login, pelo código que só vai no e-mail da pessoa.
// Desliga só as ofertas por e-mail. Aceita o clique no link (GET) e o descadastro em um clique do Gmail e do Yahoo (POST).
import { admin } from '../_shared/http.ts'
import { validToken } from '../_shared/email.ts'

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return text('Método não aceito.', 405)
  const t = new URL(req.url).searchParams.get('t')
  if (!validToken(t)) return text('Link inválido.', 400)
  const { error } = await admin().rpc('unsubscribe_offers', { p_token: t })
  if (error) return text('Não foi possível agora. Tente de novo mais tarde.', 500)
  // Mesma resposta para código conhecido ou não: o link não revela se o código existe.
  return text('Pronto. Você não recebe mais ofertas do acasa por e-mail. Para voltar a receber, ligue em Configurações > Avisos, no app.')
})
