// Datas da oração: guardadas como "AAAA-MM-DD", mostradas em português.

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DAY = 86400000

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Diferença em dias inteiros entre duas datas (b - a). */
export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY)
}

/** "3 de outubro" ou "3 de outubro de 2025" quando é de outro ano. */
export function formatDayMonth(iso: string, now = new Date()) {
  const d = parseISODate(iso)
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === now.getFullYear() ? base : `${base} de ${d.getFullYear()}`
}

/** "Hoje, 3 de outubro", "Ontem, 2 de outubro" ou "28 de setembro". */
export function formatDiaryDate(iso: string, now = new Date()) {
  const diff = daysBetween(parseISODate(iso), now)
  const day = formatDayMonth(iso, now)
  if (diff === 0) return `Hoje, ${day}`
  if (diff === 1) return `Ontem, ${day}`
  return day
}

/** "hoje", "ontem", "há 5 dias". */
export function formatAgo(iso: string, now = new Date()) {
  const diff = daysBetween(parseISODate(iso), now)
  if (diff <= 0) return 'hoje'
  if (diff === 1) return 'ontem'
  return `há ${diff} dias`
}

/** "03/10/2026" */
export function formatBR(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Máscara DD/MM/AAAA enquanto a pessoa digita. */
export function maskDate(input: string) {
  const digits = input.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** "03/10/2026" para "2026-10-03". Retorna null se a data não existe. */
export function brToISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return null
  return `${yyyy}-${mm}-${dd}`
}
