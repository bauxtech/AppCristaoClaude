// Planos de leitura de exemplo do protótipo.

export interface Plan {
  id: string
  name: string
  total: number
  /** Dia em que a pessoa está. 0 = não começou. */
  day: number
  /** Dias de atraso em relação à data de início. */
  behind: number
  todayReading: string
  /** Primeiro capítulo da leitura de hoje, para abrir direto. */
  todayRef: { book: string; chapter: number }
}

export const PLANS: Plan[] = [
  { id: 'nt-90', name: 'Novo Testamento em 90 dias', total: 90, day: 34, behind: 3, todayReading: 'Romanos 1 a 4', todayRef: { book: 'Romanos', chapter: 1 } },
  { id: 'biblia-1-ano', name: 'Bíblia em 1 ano', total: 365, day: 0, behind: 0, todayReading: 'Gênesis 1 e 2', todayRef: { book: 'Gênesis', chapter: 1 } },
  { id: 'sl-pv-30', name: 'Salmos e Provérbios em 30 dias', total: 30, day: 0, behind: 0, todayReading: 'Salmos 1 a 5', todayRef: { book: 'Salmos', chapter: 1 } },
  { id: 'vida-jesus', name: 'Vida de Jesus nos 4 Evangelhos', total: 40, day: 40, behind: 0, todayReading: 'Concluído', todayRef: { book: 'Mateus', chapter: 1 } },
]

export function planStatus(p: Plan): 'notStarted' | 'active' | 'behind' | 'done' {
  if (p.day >= p.total) return 'done'
  if (p.day === 0) return 'notStarted'
  return p.behind > 0 ? 'behind' : 'active'
}

export function planById(id: string) {
  return PLANS.find((p) => p.id === id)
}
