// Regras do primeiro acesso, separadas das telas para serem testadas.

export function onlyDigits(v: string) {
  return v.replace(/\D/g, '')
}

/** "987654321" vira "98765-4321". */
export function formatPhoneNumber(v: string) {
  const d = onlyDigits(v).slice(0, 9)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

/** DDD com 2 dígitos (11 a 99) e celular com 9 dígitos começando por 9. */
export function isValidPhone(ddd: string, number: string) {
  const dd = onlyDigits(ddd)
  const n = onlyDigits(number)
  return dd.length === 2 && Number(dd) >= 11 && n.length === 9 && n.startsWith('9')
}

export type CodeCheck = 'ok' | 'wrong' | 'expired' | 'tooMany' | 'incomplete'

export function checkCode(code: string, demo: { ok: string; expired: string; tooMany: string }): CodeCheck {
  const c = onlyDigits(code)
  if (c.length < 6) return 'incomplete'
  if (c === demo.expired) return 'expired'
  if (c === demo.tooMany) return 'tooMany'
  return c === demo.ok ? 'ok' : 'wrong'
}

export const CODE_MESSAGES: Record<Exclude<CodeCheck, 'ok' | 'incomplete'>, string> = {
  wrong: 'Código incorreto. Confira e digite de novo.',
  expired: 'Este código expirou. Toque em Reenviar código.',
  tooMany: 'Muitas tentativas. Aguarde 10 minutos e tente de novo.',
}

/** Código de convite: 6 letras ou números, com ou sem hífen. */
export function normalizeInvite(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export interface TermsState {
  terms: boolean
  faith: boolean
  adult: boolean
}

/** Lista o que falta para seguir. Vazia quando está tudo marcado. */
export function missingConsents(s: TermsState): string[] {
  const missing: string[] = []
  if (!s.terms) missing.push('aceitar os Termos de Uso')
  if (!s.faith) missing.push('autorizar o uso dos dados de fé')
  if (!s.adult) missing.push('confirmar que tem 18 anos ou mais')
  return missing
}
