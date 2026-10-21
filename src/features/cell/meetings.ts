import { WEEKDAYS_LONG, WEEKDAYS_PLURAL, type Cell, type MeetingSlot } from './data'

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

type Schedule = Pick<Cell, 'day' | 'time' | 'slots' | 'cancelledDates' | 'extraMeetings'>

/** Dias e horários da célula, de segunda a domingo. Célula antiga, sem agenda, usa o dia e o horário únicos. */
export function slotsOf(cell: Pick<Cell, 'day' | 'time' | 'slots'>): MeetingSlot[] {
  const list = cell.slots?.length ? cell.slots : [{ day: cell.day, time: cell.time }]
  const order = (d: number) => (d + 6) % 7
  return [...list].sort((a, b) => order(a.day) - order(b.day) || a.time.localeCompare(b.time))
}

/** "Terças, 20h · Sábados, 16h" */
export function scheduleLabel(cell: Pick<Cell, 'day' | 'time' | 'slots'>) {
  return slotsOf(cell)
    .map((s) => `${WEEKDAYS_PLURAL[s.day]}, ${formatTime(s.time)}`)
    .join(' · ')
}

/** Próximas reuniões: as de cada dia da agenda e os encontros extras, em ordem de data. count é o número de semanas. */
export function upcomingMeetings(cell: Schedule, now = new Date(), count = 4): Meeting[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const regular: Meeting[] = []
  for (const slot of slotsOf(cell)) {
    const [h, min] = slot.time.split(':').map(Number)
    let first = new Date(today)
    first.setDate(today.getDate() + ((slot.day - today.getDay() + 7) % 7))
    // Se a reunião de hoje já passou, começa na semana seguinte.
    if (first.getTime() === today.getTime() && (now.getHours() > h || (now.getHours() === h && now.getMinutes() > min))) {
      first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7)
    }
    for (let i = 0; i < count; i++) {
      const date = iso(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7))
      regular.push({ date, time: slot.time, extra: false, cancelled: cell.cancelledDates.includes(date) })
    }
  }
  regular.sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
  const last = regular[regular.length - 1]?.date ?? iso(today)
  // Encontro extra no mesmo dia de uma reunião da agenda toma o lugar dela.
  const extras = cell.extraMeetings.filter((e) => e.date >= iso(today) && e.date <= last).map((e) => ({ ...e, extra: true, cancelled: cell.cancelledDates.includes(e.date) }))
  const merged = [...regular.filter((r) => !extras.some((e) => e.date === r.date)), ...extras]
  return merged.sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
}

/** Reunião mais recente que já começou (hoje ou antes, até 3 semanas), não cancelada. É a da tela de presença. */
export function lastMeeting(cell: Schedule, now = new Date()): Meeting | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const started = (d: Date, time: string) => {
    if (d.getTime() < today.getTime()) return true
    const [th, tm] = time.split(':').map(Number)
    return now.getHours() > th || (now.getHours() === th && now.getMinutes() >= tm)
  }
  const slots = slotsOf(cell)
  for (let i = 0; i <= 21; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const date = iso(d)
    if (cell.cancelledDates.includes(date)) continue
    const extra = cell.extraMeetings.find((e) => e.date === date)
    if (extra && started(d, extra.time || slots[0].time)) return { date, time: extra.time || slots[0].time, extra: true, cancelled: false }
    const slot = slots.find((s) => s.day === d.getDay() && started(d, s.time))
    if (slot) return { date, time: slot.time, extra: false, cancelled: false }
  }
  return null
}

export function nextMeeting(cell: Schedule, now = new Date()) {
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
