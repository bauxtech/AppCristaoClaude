const PLURAL = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']

export function formatTime(t: string) {
  const [h, m] = t.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function weekly(day: number, time: string) {
  return `${PLURAL[day]}, ${formatTime(time)}`
}

export function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
}
