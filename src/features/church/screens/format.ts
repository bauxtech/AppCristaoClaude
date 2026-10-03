import { WEEKDAYS_LONG } from '../../cell/data'
import { formatTime } from '../../cell/meetings'
import type { Accessibility, Service } from '../data'

/** "Domingo: 9h e 18h" por dia, em ordem de domingo a sábado. */
export function servicesByDay(services: Service[]) {
  const days = [...new Set(services.map((s) => s.day))].sort()
  return days.map((d) => {
    const times = services.filter((s) => s.day === d).sort((a, b) => (a.time > b.time ? 1 : -1)).map((s) => formatTime(s.time))
    return { day: WEEKDAYS_LONG[d], times: times.join(', ').replace(/, ([^,]*)$/, ' e $1') }
  })
}

export const ACCESS_ITEMS: { key: 'libras' | 'ramp' | 'reserved' | 'audiodesc'; label: string }[] = [
  { key: 'libras', label: 'Intérprete de Libras' },
  { key: 'ramp', label: 'Rampa de acesso' },
  { key: 'reserved', label: 'Lugar reservado para mobilidade reduzida' },
  { key: 'audiodesc', label: 'Audiodescrição ao vivo' },
]

export function accessState(a: Accessibility, key: (typeof ACCESS_ITEMS)[number]['key']) {
  const v = a[key]
  return v === undefined ? 'Ninguém informou' : v ? 'Tem' : 'Não tem'
}
