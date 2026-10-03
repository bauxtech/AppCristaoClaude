import { DEMO_CODE } from './data'

/** Na prévia, só o código de exemplo existe. 000000 simula um código vencido. */
export function checkInviteCode(code: string): 'ok' | 'expired' | 'invalid' {
  if (code === DEMO_CODE) return 'ok'
  if (code === '000000') return 'expired'
  return 'invalid'
}

/** Lê o código de um QR code do app ("appcristao://celula/entrar?codigo=ABC123") ou de um código solto. */
export function codeFromQr(data: string): string | null {
  const m = /codigo=([A-Za-z0-9]{6})/.exec(data)
  if (m) return m[1].toUpperCase()
  const plain = data.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return plain.length === 6 ? plain : null
}
