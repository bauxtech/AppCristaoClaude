import type { IconName } from '../../components/Icon'
import type { Cell } from '../cell/data'
import { formatTime, nextMeeting, parseISO } from '../cell/meetings'
import type { Church, Course, Ministry } from '../church/data'

export interface Commitment {
  icon: IconName
  title: string
  when: string
  href: string
  sortKey: string
}

const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Hoje, 20h", "Amanhã, 9h" ou "Quarta, 20h". */
export function shortWhen(date: string, time: string, now = new Date()) {
  const d = parseISO(date)
  const diff = Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
  const day = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff < 7 ? WEEKDAY[d.getDay()] : `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${day}, ${formatTime(time)}`
}

/** Próximo culto da igreja a partir dos horários informados. */
function nextService(church: Church, now: Date) {
  let best: { date: string; time: string } | null = null
  for (const s of church.services) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((s.day - now.getDay() + 7) % 7))
    const [h, m] = s.time.split(':').map(Number)
    if (iso(d) === iso(now) && (now.getHours() > h || (now.getHours() === h && now.getMinutes() > m))) d.setDate(d.getDate() + 7)
    const c = { date: iso(d), time: s.time }
    if (!best || c.date + c.time < best.date + best.time) best = c
  }
  return best
}

/** Os próximos compromissos da pessoa, vindos de onde ela participa. Vazio em conta nova. */
export function upcomingCommitments(input: { cell: Cell | null; church: Church | null; courses: Course[]; ministries: Ministry[]; savedEvents?: string[] }, now = new Date(), limit = 4): Commitment[] {
  const out: Commitment[] = []
  const pad = (n: number) => String(n).padStart(2, '0')
  const nowKey = `${iso(now)}${pad(now.getHours())}:${pad(now.getMinutes())}`
  if (input.cell && !input.cell.archived) {
    const m = nextMeeting(input.cell, now)
    if (m) out.push({ icon: 'people', title: 'Reunião da célula', when: shortWhen(m.date, m.time, now), href: '/celula', sortKey: m.date + m.time })
  }
  if (input.church) {
    const s = nextService(input.church, now)
    if (s) out.push({ icon: 'church', title: 'Culto', when: shortWhen(s.date, s.time, now), href: '/igreja', sortKey: s.date + s.time })
  }
  for (const e of input.church?.events.filter((x) => input.savedEvents?.includes(x.id) && x.date + (x.time ?? '23:59') > nowKey) ?? []) {
    out.push({ icon: 'calendar', title: e.title, when: e.time ? shortWhen(e.date, e.time, now) : shortWhen(e.date, '00:00', now).split(',')[0], href: `/igreja/evento/${e.id}`, sortKey: e.date + (e.time ?? '00:00') })
  }
  for (const c of input.courses.filter((x) => !x.completedAt)) {
    const l = c.lessons.find((x) => x.date + x.time > nowKey)
    if (l) out.push({ icon: 'book', title: `Aula do ${c.name}`, when: shortWhen(l.date, l.time, now), href: `/igreja/curso/${c.id}/aula/${l.id}`, sortKey: l.date + l.time })
  }
  for (const m of input.ministries.filter((x) => x.nextDate + x.nextTime > nowKey)) {
    out.push({ icon: 'music', title: `${m.area} no ministério`, when: shortWhen(m.nextDate, m.nextTime, now), href: '/igreja/ministerios', sortKey: m.nextDate + m.nextTime })
  }
  return out.sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1)).slice(0, limit)
}
