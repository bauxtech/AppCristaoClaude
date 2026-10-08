// Decide se um aviso vai para o celular agora, depois (horário de silêncio) ou não vai (tipo desligado).
// As preferências vêm do app (profiles.notify_prefs), com os mesmos nomes de src/features/settings/prefs.ts.

export interface NotifyPrefs {
  types?: Record<string, boolean>
  quietFrom?: string
  quietTo?: string
}

/** Padrão do app para quem ainda não mexeu nas preferências. */
const DEFAULT_ON: Record<string, boolean> = { orou: true, mudancaCelula: true, novoPedido: false }

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function inQuiet(nowMin: number, from?: string, to?: string) {
  if (!from || !to) return false
  const a = toMin(from)
  const b = toMin(to)
  if (a === b) return false
  return a < b ? nowMin >= a && nowMin < b : nowMin >= a || nowMin < b
}

/** Minutos do dia no horário de São Paulo (UTC-3, sem horário de verão). */
export function brMinutes(now = new Date()) {
  const m = (now.getUTCHours() * 60 + now.getUTCMinutes() - 180 + 1440) % 1440
  return m
}

export function decide(prefs: NotifyPrefs | null, pref: string | null, now = new Date()): 'send' | 'later' | 'skip' {
  // Aviso sem tipo (ex.: entrada aprovada) sempre pode ir.
  if (pref) {
    const on = prefs?.types?.[pref] ?? DEFAULT_ON[pref] ?? true
    if (!on) return 'skip'
  }
  return inQuiet(brMinutes(now), prefs?.quietFrom, prefs?.quietTo) ? 'later' : 'send'
}

export interface ExpoMessage {
  to: string
  title: string
  body: string
  data: { href: string | null; id: string }
  sound: 'default'
}

/** Mensagens para o serviço do Expo, no máximo 100 por envio. */
export function chunks<T>(list: T[], size = 100): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
