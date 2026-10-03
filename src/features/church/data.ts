// Dados de exemplo da igreja, ministérios e cursos, a partir do protótipo.
// A busca real usa os dados públicos do CNPJ (Receita). Nome e endereço vêm de lá.

import { CHURCHES } from '../onboarding/data'

export interface Service {
  id: string
  /** 0 = domingo */
  day: number
  time: string
}

/** true = tem, false = não tem, ausente = ninguém informou. */
export interface Accessibility {
  libras?: boolean
  librasServices?: string
  ramp?: boolean
  reserved?: boolean
  audiodesc?: boolean
  updatedAt?: string
}

export interface ChurchEvent {
  id: string
  title: string
  date: string
  time?: string
  desc: string
}

export interface Church {
  id: string
  name: string
  city: string
  neighborhood: string
  address: string
  cnpj?: string
  denomination?: string
  /** "cnpj": nome e endereço vêm dos dados públicos. "manual": a pessoa cadastrou. */
  source: 'cnpj' | 'manual'
  services: Service[]
  accessibility: Accessibility
  events: ChurchEvent[]
}

export const DENOMINATIONS = ['Batista', 'Metodista', 'Presbiteriana', 'Adventista', 'Pentecostal', 'Outra']

/** Diretório de exemplo. Só a primeira tem horários e acessibilidade no protótipo. */
export const DIRECTORY: Church[] = [
  {
    id: CHURCHES[0].id,
    name: CHURCHES[0].name,
    city: CHURCHES[0].city,
    cnpj: CHURCHES[0].cnpj,
    neighborhood: 'Pinheiros',
    address: 'Rua das Flores, 1234, Pinheiros, São Paulo, SP',
    source: 'cnpj',
    services: [
      { id: 's1', day: 0, time: '09:00' },
      { id: 's2', day: 0, time: '18:00' },
      { id: 's3', day: 3, time: '19:30' },
    ],
    accessibility: { libras: true, librasServices: 'Culto da manhã e da noite (domingo)', ramp: true, reserved: true, audiodesc: false },
    events: [
      { id: 'e1', title: 'Retiro de jovens', date: '2026-10-22', desc: 'Retiro espiritual no sítio Monte Sinai. Inscrições abertas até dia 15.' },
      { id: 'e2', title: 'Seminário de casais', date: '2026-11-08', desc: 'Seminário especial sobre relacionamentos e família cristã. Vagas limitadas.' },
    ],
  },
  { id: CHURCHES[1].id, name: CHURCHES[1].name, city: CHURCHES[1].city, cnpj: CHURCHES[1].cnpj, neighborhood: '', address: CHURCHES[1].city, source: 'cnpj', services: [], accessibility: {}, events: [] },
  { id: CHURCHES[2].id, name: CHURCHES[2].name, city: CHURCHES[2].city, cnpj: CHURCHES[2].cnpj, neighborhood: '', address: CHURCHES[2].city, source: 'cnpj', services: [], accessibility: { libras: true }, events: [] },
  { id: '4', name: 'Igreja Metodista Central', city: 'São Paulo, SP', cnpj: '22.333.444/0001-55', neighborhood: 'Centro', address: 'Centro, São Paulo, SP', source: 'cnpj', services: [], accessibility: {}, events: [] },
]

export function searchDirectory(query: string, onlyLibras = false) {
  const text = query.trim().toLowerCase()
  const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const digits = text.replace(/\D/g, '')
  return DIRECTORY.filter((c) => {
    if (onlyLibras && !c.accessibility.libras) return false
    if (!text) return false
    return plain(c.name).includes(plain(text)) || plain(c.city).includes(plain(text)) || (digits.length >= 3 && (c.cnpj ?? '').replace(/\D/g, '').includes(digits))
  })
}

export interface Ministry {
  id: string
  area: string
  role: string
  nextDate: string
  nextTime: string
  detail: string
  confirmed: boolean
  reminder: boolean
  swapWith?: string
}

export const MINISTRY_AREAS = ['Louvor', 'Recepção', 'Mídia', 'Infantil', 'Intercessão', 'Outro']

/** Pessoas do ministério, do protótipo. Vêm da escala da igreja quando houver. */
export const MINISTRY_PEOPLE = ['Ana Paula', 'João Marcos', 'Carla Souza']

export interface Material {
  id: string
  name: string
  kind: 'Foto' | 'PDF' | 'Áudio'
  uri: string
}

export interface Lesson {
  id: string
  title: string
  date: string
  time: string
  present?: boolean
  notes: string
  materials: Material[]
}

export interface Card {
  q: string
  a: string
}

export const COURSE_TYPES = ['Batismo', 'Escola de líderes', 'Teologia', 'Encontro']

export interface Course {
  id: string
  name: string
  type: string
  lessons: Lesson[]
  exam?: { date: string; time: string; place: string; reminder: boolean }
  cards: Card[]
  completedAt?: string
  certificate?: { name: string; uri: string }
  milestone?: boolean
}

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Curso de batismo do protótipo, com as aulas aos sábados e a aula 4 no último sábado. */
export function sampleCourses(now: Date): Course[] {
  const lastSat = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 1) % 7))
  const titles = ['O que é o batismo?', 'A vida cristã', 'A Bíblia', 'A oração', 'A célula', 'A igreja', 'Missão', 'Comissão']
  const lessons: Lesson[] = titles.map((t, i) => {
    const d = new Date(lastSat.getFullYear(), lastSat.getMonth(), lastSat.getDate() + (i - 3) * 7)
    return { id: `l${i + 1}`, title: t, date: iso(d), time: '09:00', present: i < 4 ? i !== 2 : undefined, notes: '', materials: [] }
  })
  const examDate = new Date(lastSat.getFullYear(), lastSat.getMonth(), lastSat.getDate() + 5 * 7)
  return [
    {
      id: 'c1',
      name: 'Curso de batismo',
      type: 'Batismo',
      lessons,
      exam: { date: iso(examDate), time: '09:00', place: 'Sala 3', reminder: false },
      cards: [
        { q: 'O que é a oração segundo a Bíblia?', a: 'Comunhão íntima com Deus, não apenas pedido. É diálogo, adoração e entrega.' },
        { q: 'Quais os elementos da oração do Pai Nosso?', a: 'Adoração, entrega, pedido de provisão, perdão e proteção espiritual.' },
        { q: 'Por que Jesus orava à parte?', a: 'Para ter comunhão íntima com o Pai, mostrar dependência e dar exemplo.' },
      ],
    },
  ]
}

export function sampleMinistries(now: Date): Ministry[] {
  const nextSun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7))
  return [
    { id: 'm1', area: 'Louvor', role: 'Músico', nextDate: iso(nextSun), nextTime: '09:00', detail: 'Guitarra', confirmed: false, reminder: true },
    { id: 'm2', area: 'Mídia', role: 'Operador', nextDate: iso(nextSun), nextTime: '18:00', detail: 'ProPresenter', confirmed: false, reminder: true },
  ]
}

/** Dados que o protótipo mostra como "reconhecidos" na foto do cronograma. */
export const PHOTO_SAMPLE = { name: 'Escola de Líderes', type: 'Escola de líderes', lessons: 8, weekday: 6, time: '09:00' }
