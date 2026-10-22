// Reportar um problema: o que a pessoa escreveu, a tela e o aparelho. Vai para a tabela problem_reports
// e por e-mail para a equipe. Só texto: nada de dado de fé é pedido.

export const REPORT_TO = 'oi@acasa.app.br'
/** Relatos por pessoa, por dia. */
export const REPORT_DAILY_LIMIT = 5

export interface ReportInput {
  message: string
  screen: string | null
  app_version: string | null
  platform: string | null
  device: string | null
}

const cut = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

/** Confere e limpa o que veio do app. Texto vazio ou com mais de 2000 letras é recusado. */
export function parseReport(body: unknown): ReportInput | null {
  const b = (body ?? {}) as Record<string, unknown>
  const message = typeof b.message === 'string' ? b.message.trim() : ''
  if (!message || message.length > 2000) return null
  return { message, screen: cut(b.screen, 200), app_version: cut(b.appVersion, 40), platform: cut(b.platform, 20), device: cut(b.device, 100) }
}

/** E-mail para a equipe. Responder vai direto para o e-mail da pessoa, quando ela cadastrou um. */
export function reportEmail(from: string, r: ReportInput, who: { id: string; name: string; email: string | null }, to = REPORT_TO) {
  const text = [
    r.message,
    '',
    '---',
    `Pessoa: ${who.name || 'sem nome'} (${who.id})`,
    `E-mail: ${who.email ?? 'não cadastrado'}`,
    `Tela: ${r.screen ?? 'não informada'}`,
    `App: ${r.app_version ?? '?'} · ${r.platform ?? '?'} · ${r.device ?? '?'}`,
  ].join('\n')
  const first = r.message.replace(/\s+/g, ' ').slice(0, 60)
  return { from, to: [to], subject: `Problema no app: ${first}`, text, ...(who.email ? { reply_to: who.email } : {}) }
}
