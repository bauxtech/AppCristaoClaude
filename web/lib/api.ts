// Acesso aos dados da página. Hoje usa os dados de exemplo do app.
// Quando o banco entrar, estas três funções chamam funções públicas do Supabase com as mesmas entradas e saídas.

import type { PrivateAddress, PublicCell } from './data'

const DEMO: Record<string, PublicCell & { _address: PrivateAddress }> = {
  ABC123: {
    code: 'ABC123',
    name: 'Jovens da Central',
    type: 'Jovens',
    churchName: 'Igreja Batista Central de São Paulo',
    neighborhood: 'Pinheiros',
    city: 'São Paulo, SP',
    coverUrl: null,
    leaderFirstName: 'João',
    day: 3,
    time: '20:00',
    status: 'active',
    nextMeeting: null,
    plan: {
      title: 'Vivendo com propósito',
      ref: 'João 15:1-17',
      sections: [
        { title: 'Quebra-gelo', content: 'Pergunta: Qual foi o melhor momento da sua semana?', minutes: 10 },
        { title: 'Louvor', content: 'Oceans, Hillsong United\nHow Great Is Our God, Chris Tomlin', minutes: 15 },
        { title: 'Palavra', content: 'Tema: Vivendo com propósito (baseado no culto de domingo)\nTexto base: João 15:1-17', minutes: 20 },
        { title: 'Perguntas para reflexão', content: '1. Como você tem buscado viver com propósito?\n2. O que significa "permanecer em Cristo" no seu dia a dia?', minutes: 10 },
        { title: 'Oração', content: 'Pedidos do grupo. Oração pelos ausentes.', minutes: 10 },
      ],
    },
    materials: [
      { name: 'Estudo: Vivendo com propósito.pdf', kind: 'PDF', size: '1,2 MB', url: '#' },
      { name: 'Louvor outubro.pdf', kind: 'PDF', size: '0,8 MB', url: '#' },
    ],
    _address: { address: 'Casa da Maria, Rua das Flores, 42', reference: 'Portão azul, ao lado da padaria' },
  },
  NOVA01: {
    code: 'NOVA01',
    name: 'Célula do Bairro',
    type: 'Mista',
    churchName: null,
    neighborhood: 'Centro',
    city: 'Recife, PE',
    coverUrl: null,
    leaderFirstName: 'Ana',
    day: 5,
    time: '19:30',
    status: 'active',
    nextMeeting: null,
    plan: null,
    materials: [],
    _address: { address: 'Rua da Aurora, 100', reference: '' },
  },
  ARQ001: {
    code: 'ARQ001',
    name: 'Casais em Missão',
    type: 'Casais',
    churchName: null,
    neighborhood: 'Boa Viagem',
    city: 'Recife, PE',
    coverUrl: null,
    leaderFirstName: 'Pedro',
    day: 6,
    time: '19:00',
    status: 'archived',
    nextMeeting: null,
    plan: null,
    materials: [],
    _address: { address: '', reference: '' },
  },
}

export const DEMO_CODES = Object.keys(DEMO)

function nextOf(day: number, time: string, now: Date) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((day - now.getDay() + 7) % 7))
  const [h, m] = time.split(':').map(Number)
  if (d.toDateString() === now.toDateString() && (now.getHours() > h || (now.getHours() === h && now.getMinutes() > m))) d.setDate(d.getDate() + 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time }
}

export function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** Dados públicos. Nunca inclui endereço completo, membros, telefones ou pedidos. */
export async function getPublicCell(rawCode: string, now = new Date()): Promise<PublicCell | null> {
  const c = DEMO[normalizeCode(rawCode)]
  if (!c) return null
  const { _address, ...pub } = c
  void _address
  return { ...pub, nextMeeting: pub.status === 'active' ? nextOf(pub.day, pub.time, now) : null }
}

export function isValidPhone(digits: string) {
  return /^\d{10,11}$/.test(digits) && digits.slice(2, 3) !== '0'
}

/** Deixa nome e telefone para o líder. Devolve o endereço completo. */
export async function leaveContact(rawCode: string, name: string, phoneDigits: string): Promise<PrivateAddress> {
  const c = DEMO[normalizeCode(rawCode)]
  if (!c || c.status !== 'active') throw new Error('Célula indisponível')
  if (name.trim().length < 2) throw new Error('Nome inválido')
  if (!isValidPhone(phoneDigits)) throw new Error('Telefone inválido')
  return c._address
}

/** Pedido de oração para o líder. Vai só para o líder, não aparece na página. */
export async function leavePrayer(rawCode: string, text: string, name?: string): Promise<void> {
  const c = DEMO[normalizeCode(rawCode)]
  if (!c || c.status !== 'active') throw new Error('Célula indisponível')
  if (!text.trim()) throw new Error('Pedido vazio')
  void name
}
