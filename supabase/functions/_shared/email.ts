// E-mails de oferta da régua de assinatura. Só texto, com o link para não receber mais em todo e-mail.
// O envio é pelo Resend (https://resend.com). Sem RESEND_API_KEY, nada é enviado e a fila espera.

export interface OutboxRow {
  id: number
  subject: string
  body: string
  attempts: number
  profiles: { email: string | null; offers_email: boolean; offers_token: string; name: string } | null
}

/** Link do descadastro: a função descadastrar desliga as ofertas por e-mail de quem tem o código. */
export function unsubscribeUrl(supabaseUrl: string, token: string) {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/descadastrar?t=${encodeURIComponent(token)}`
}

/** Texto final do e-mail: saudação, corpo e rodapé com o motivo e o descadastro. */
export function emailText(row: Pick<OutboxRow, 'body'>, name: string, unsubscribe: string) {
  const first = name.trim().split(/\s+/)[0]
  return [
    first ? `Olá, ${first}.` : 'Olá.',
    '',
    row.body,
    '',
    'Equipe acasa',
    '',
    '---',
    'Você recebe este e-mail porque autorizou ofertas do acasa por e-mail. Para não receber mais, abra:',
    unsubscribe,
    'Também dá para desligar no app, em Configurações > Avisos.',
  ].join('\n')
}

/** O que fazer com cada e-mail da fila na hora de enviar. */
export function outboxAction(row: OutboxRow): 'send' | 'drop' {
  const p = row.profiles
  // Quem retirou a autorização ou apagou o e-mail depois de o e-mail entrar na fila não recebe.
  if (!p || !p.offers_email || !p.email) return 'drop'
  return 'send'
}

/** Corpo da chamada ao Resend, com o descadastro em um clique que o Gmail e o Yahoo pedem. */
export function resendPayload(from: string, to: string, subject: string, text: string, unsubscribe: string) {
  return {
    from,
    to: [to],
    subject,
    text,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}

/** Código do link: um uuid. Qualquer outra coisa é recusada antes de ir ao banco. */
export function validToken(t: string | null): t is string {
  return !!t && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)
}
