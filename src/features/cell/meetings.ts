import { WEEKDAYS_LONG, type Cell } from './data'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export interface Meeting {
  date: string
  time: string
  extra: boolean
  cancelled: boolean
}

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "20:00" para "20h", "19:30" para "19h30". */
export function formatTime(t: string) {
  const [h, m] = t.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** "Quarta-feira, 7 de outubro" */
export function formatMeetingDay(date: string) {
  const d = parseISO(date)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function formatMeeting(m: { date: string; time: string }) {
  return `${formatMeetingDay(m.date)} · ${formatTime(m.time)}`
}

/** Próximas reuniões: as semanais e os encontros extras, em ordem de data. */
export function upcomingMeetings(cell: Pick<Cell, 'day' | 'time' | 'cancelledDates' | 'extraMeetings'>, now = new Date(), count = 4): Meeting[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [h, min] = cell.time.split(':').map(Number)
  let first = new Date(today)
  first.setDate(today.getDate() + ((cell.day - today.getDay() + 7) % 7))
  // Se a reunião de hoje já passou, começa na semana seguinte.
  if (first.getTime() === today.getTime() && (now.getHours() > h || (now.getHours() === h && now.getMinutes() > min))) {
    first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7)
  }
  const regular: Meeting[] = Array.from({ length: count }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7)
    const date = iso(d)
    return { date, time: cell.time, extra: false, cancelled: cell.cancelledDates.includes(date) }
  })
  const last = regular[regular.length - 1].date
  const extras = cell.extraMeetings.filter((e) => e.date >= iso(today) && e.date <= last).map((e) => ({ ...e, extra: true, cancelled: cell.cancelledDates.includes(e.date) }))
  return [...regular, ...extras].sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
}

export function nextMeeting(cell: Pick<Cell, 'day' | 'time' | 'cancelledDates' | 'extraMeetings'>, now = new Date()) {
  return upcomingMeetings(cell, now, 8).find((m) => !m.cancelled) ?? null
}

/** Faltou nas duas últimas reuniões. */
export function missedTwoWeeks(lastAttendance: boolean[]) {
  const n = lastAttendance.length
  return n >= 2 && !lastAttendance[n - 1] && !lastAttendance[n - 2]
}

export function maskTime(input: string) {
  const d = input.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

export function isValidTime(t: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60
}
