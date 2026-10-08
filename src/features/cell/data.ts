// Dados de exemplo da célula, a partir do protótipo. Saem daqui quando o app ligar ao banco.

import type { CellRole } from './permissions'

export const CELL_TYPES = ['Jovens', 'Casais', 'Mulheres', 'Homens', 'Mista'] as const
export type CellType = (typeof CELL_TYPES)[number]

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
export const WEEKDAYS_PLURAL = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']

export interface Member {
  id: string
  name: string
  role: CellRole
  phone: string
  /** "MM-DD" */
  birthday?: string
  birthYear?: number
  since: string
  /** Assinante. Quem não assinou fica na lista como inativo e sai da escala. */
  active: boolean
  /** Presença nas últimas 4 reuniões, da mais antiga para a mais recente. */
  lastAttendance: boolean[]
  isMe?: boolean
  showReadingProgress?: boolean
  readingProgress?: number
  /** Foto, quando a pessoa deixa mostrar. Link temporário. */
  photoUri?: string
}

export interface PlanSection {
  id: string
  title: string
  content: string
  minutes: number
}

export interface CellPrayer {
  id: string
  memberId: string
  text: string
  prayedCount: number
  iPrayed?: boolean
  notified?: boolean
  at: string
}

export interface Ride {
  id: string
  driverId: string
  from: string
  seats: number
  /** Pedidos para esta carona. O WhatsApp só abre depois de aceito. */
  requests: { memberId: string; status: 'pending' | 'accepted' }[]
}

export interface SwapRequest {
  id: string
  fromId: string
  toId: string
  role: string
  date: string
  reason?: string
  status: 'pending' | 'approved' | 'declined'
}

export interface Poll {
  id: string
  question: string
  options: { label: string; votes: number }[]
  myVote?: number
}

export interface Cell {
  id: string
  name: string
  type: CellType | null
  /** 0 = domingo */
  day: number
  time: string
  address: string
  reference: string
  neighborhood: string
  coverUri?: string
  code: string
  maxSize: number
  archived: boolean
  muted: boolean
  foundedAt: string
  myRole: CellRole
  members: Member[]
  pendingJoins: { id: string; name: string; phone: string; requestedAt: string }[]
  visitors: { id: string; name: string; phone: string; date: string; notes: string; followUpAt: string }[]
  /** id: linha da escala no banco (uuid). */
  schedule: { id?: string; role: string; memberId: string | null }[]
  plan: PlanSection[]
  planTitle: string
  planRef: string
  cancelledDates: string[]
  extraMeetings: { date: string; time: string }[]
  /** Confirmados da próxima reunião, sem contar a pessoa. */
  confirmedOthers: number
  myRsvp?: 'vou' | 'naovou'
  swaps: SwapRequest[]
  board: { id: string; authorId: string; text: string; at: string }[]
  polls: Poll[]
  /** path: caminho do arquivo no Storage, quando já está no banco. */
  materials: { id: string; name: string; kind: 'PDF' | 'Imagem'; size: string; date: string; uri?: string; path?: string }[]
  playlist: { id: string; title: string; artist: string; url?: string }[]
  prayers: CellPrayer[]
  rides: Ride[]
  readingPlan: { planId: string; joined: boolean }
  history: { meetings: number; avgAttendance: number; answered: number }
  /** Itens denunciados por esta pessoa. Somem na hora para ela. */
  hidden: string[]
}

export const DEFAULT_ROLES = ['Recebe em casa', 'Lanche', 'Louvor', 'Palavra', 'Oração', 'Intérprete de Libras']

export const SAMPLE_PLAN: PlanSection[] = [
  { id: 'p1', title: 'Quebra-gelo', content: 'Pergunta: Qual foi o melhor momento da sua semana?', minutes: 10 },
  { id: 'p2', title: 'Louvor', content: 'Oceans, Hillsong United\nHow Great Is Our God, Chris Tomlin', minutes: 15 },
  { id: 'p3', title: 'Palavra', content: 'Tema: Vivendo com propósito (baseado no culto de domingo)\nTexto base: João 15:1-17', minutes: 20 },
  { id: 'p4', title: 'Perguntas para reflexão', content: '1. Como você tem buscado viver com propósito?\n2. O que significa "permanecer em Cristo" no seu dia a dia?', minutes: 10 },
  { id: 'p5', title: 'Oração', content: 'Pedidos do grupo. Oração pelos ausentes.', minutes: 10 },
  { id: 'p6', title: 'Avisos', content: 'Retiro da célula: 22 de outubro. Confirmar presença até sexta.', minutes: 5 },
]

export const DEMO_CODE = 'ABC123'

function m(id: string, name: string, role: CellRole, phone: string, extra: Partial<Member> = {}): Member {
  return { id, name, role, phone, since: '2024-08-01', active: true, lastAttendance: [true, true, true, true], ...extra }
}

/** A célula do protótipo. myName é o nome da pessoa no app. */
export function sampleCell(myRole: CellRole, myName: string): Cell {
  const me = m('me', myName || 'Você', myRole, '11987654321', { isMe: true, birthday: '03-15', showReadingProgress: false, readingProgress: 30 })
  const leader = myRole === 'lider' ? me : m('u1', 'João Silva', 'lider', '11991112222', { birthday: '05-02', showReadingProgress: true, readingProgress: 80 })
  const members: Member[] = [
    leader,
    ...(myRole === 'lider' ? [] : [me]),
    m('u2', 'Ana Souza', myRole === 'auxiliar' ? 'membro' : 'auxiliar', '11992223333', { lastAttendance: [true, true, false, false], birthday: '08-21', showReadingProgress: true, readingProgress: 60 }),
    m('u3', 'Maria Santos', 'anfitriao', '11993334444', { birthday: '01-30', showReadingProgress: true, readingProgress: 40 }),
    m('u4', 'Carlos Lima', 'membro', '11994445555', { birthday: '10-12', birthYear: 2000 }),
    m('u5', 'Paula Rocha', 'membro', '11995556666', { birthday: '10-27', birthYear: 1995 }),
    m('u6', 'Pedro Costa', 'membro', '11996667777', { active: false, lastAttendance: [true, false, true, true] }),
    m('u7', 'Bia Nunes', 'membro', '11997778888'),
    m('u8', 'Lucas Ferreira', 'membro', '11998889999'),
    m('u9', 'Camila Dias', 'membro', '11990001111'),
    m('u10', 'Rafael Mendes', 'membro', '11981112222'),
    m('u11', 'Juliana Alves', 'membro', '11982223333'),
  ]
  const leaderId = leader.id
  return {
    id: 'c-central',
    name: 'Jovens da Central',
    type: 'Jovens',
    day: 3,
    time: '20:00',
    address: 'Casa da Maria, Rua das Flores, 42',
    reference: 'Portão azul, ao lado da padaria',
    neighborhood: 'Pinheiros',
    code: DEMO_CODE,
    maxSize: 10,
    archived: false,
    muted: false,
    foundedAt: '2023-03-01',
    myRole,
    members,
    pendingJoins: myRole === 'lider' ? [{ id: 'j1', name: 'Fernanda Reis', phone: '11983334444', requestedAt: '2026-10-02' }] : [],
    visitors: [],
    schedule: [
      { role: 'Recebe em casa', memberId: 'u3' },
      { role: 'Lanche', memberId: 'u4' },
      { role: 'Louvor', memberId: myRole === 'lider' ? 'u2' : 'me' },
      { role: 'Palavra', memberId: leaderId },
      { role: 'Oração', memberId: 'u5' },
      { role: 'Intérprete de Libras', memberId: null },
    ],
    plan: SAMPLE_PLAN,
    planTitle: 'Vivendo com propósito',
    planRef: 'João 15:1-17',
    cancelledDates: [],
    extraMeetings: [],
    confirmedOthers: 8,
    swaps: myRole === 'lider' ? [{ id: 's1', fromId: 'u2', toId: 'u4', role: 'Louvor', date: '7 de outubro', status: 'pending' }] : [],
    board: [
      { id: 'b1', authorId: leaderId, text: 'Retiro da célula: 22 de outubro. Confirmar presença até sexta.', at: '2026-10-03' },
      { id: 'b2', authorId: leaderId, text: 'Parabéns ao Pedro pela nova faculdade!', at: '2026-09-30' },
    ],
    polls: [{ id: 'q1', question: 'Preferem reunião às 19h ou 20h?', options: [{ label: '19h', votes: 4 }, { label: '20h', votes: 7 }] }],
    materials: [
      { id: 'mt1', name: 'Estudo: Vivendo com propósito.pdf', kind: 'PDF', size: '1,2 MB', date: '1 de outubro' },
      { id: 'mt2', name: 'Louvor outubro.pdf', kind: 'PDF', size: '0,8 MB', date: '28 de setembro' },
      { id: 'mt3', name: 'Foto retiro 2024.jpg', kind: 'Imagem', size: '3,1 MB', date: '20 de setembro' },
    ],
    playlist: [
      { id: 'pl1', title: 'Oceans', artist: 'Hillsong United' },
      { id: 'pl2', title: 'How Great Is Our God', artist: 'Chris Tomlin' },
      { id: 'pl3', title: 'Reckless Love', artist: 'Cory Asbury' },
      { id: 'pl4', title: 'Way Maker', artist: 'Sinach' },
      { id: 'pl5', title: '10,000 Reasons', artist: 'Matt Redman' },
      { id: 'pl6', title: 'Goodness of God', artist: 'Bethel Music' },
      { id: 'pl7', title: 'Lugar Secreto', artist: 'Gabriela Rocha' },
    ],
    prayers: [
      { id: 'cp1', memberId: leaderId === 'me' ? 'u4' : 'u1', text: 'Emprego novo para o meu irmão', prayedCount: 5, at: '2026-10-01' },
      { id: 'cp2', memberId: 'u2', text: 'Saúde da minha mãe, ela está internada', prayedCount: 8, at: '2026-10-02' },
      { id: 'cp3', memberId: 'u4', text: 'Sabedoria na faculdade, prova importante esta semana', prayedCount: 3, at: '2026-09-29' },
    ],
    rides: [
      { id: 'r1', driverId: leaderId === 'me' ? 'u4' : 'u1', from: 'Pinheiros', seats: 2, requests: [] },
      { id: 'r2', driverId: 'u5', from: 'Vila Madalena', seats: 1, requests: myRole === 'lider' ? [] : [{ memberId: 'me', status: 'accepted' }] },
    ],
    readingPlan: { planId: 'sl-pv-30', joined: false },
    history: { meetings: 18, avgAttendance: 75, answered: 3 },
    hidden: [],
  }
}

/** Célula recém-criada, só com o líder. */
export function newCell(input: { name: string; type: CellType | null; day: number; time: string; address: string; reference: string; neighborhood: string }, myName: string): Cell {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
  return {
    id: `c${Date.now().toString(36)}`,
    ...input,
    code,
    maxSize: 12,
    archived: false,
    muted: false,
    foundedAt: new Date().toISOString().slice(0, 10),
    myRole: 'lider',
    members: [{ id: 'me', name: myName || 'Você', role: 'lider', phone: '', since: new Date().toISOString().slice(0, 10), active: true, lastAttendance: [], isMe: true }],
    pendingJoins: [],
    visitors: [],
    schedule: DEFAULT_ROLES.map((role) => ({ role, memberId: null })),
    plan: [],
    planTitle: '',
    planRef: '',
    cancelledDates: [],
    extraMeetings: [],
    confirmedOthers: 0,
    swaps: [],
    board: [],
    polls: [],
    materials: [],
    playlist: [],
    prayers: [],
    rides: [],
    readingPlan: { planId: '', joined: false },
    history: { meetings: 0, avgAttendance: 0, answered: 0 },
    hidden: [],
  }
}
