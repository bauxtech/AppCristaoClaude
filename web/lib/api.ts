// Acesso aos dados da página.
// Com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY definidos, chama as funções públicas do banco
// (public_cell_page, leave_contact, leave_web_prayer). A chave anon é pública por desenho: as regras ficam no banco.
// Sem elas, usa os dados de exemplo abaixo. O endereço NUNCA fica no código da página: só chega depois do contato.

import type { PrivateAddress, PublicCell } from './data'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const REMOTE = !!(SUPABASE_URL && SUPABASE_ANON)

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON!, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Erro no servidor')
  return res.json() as Promise<T>
}

// Exemplo para a prévia: só dados públicos. O endereço de exemplo é genérico de propósito.
const DEMO_ADDRESS: PrivateAddress = { address: 'Endereço de exemplo (na versão real, vem do servidor)', reference: '' }

const DEMO: Record<string, PublicCell> = {
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
  const code = normalizeCode(rawCode)
  if (REMOTE) {
    const rows = await rpc<{ name: string; type: string | null; weekday: number | null; time: string | null; neighborhood: string | null; leader_first_name: string | null; archived: boolean }[]>('public_cell_page', { p_code: code })
    const r = rows[0]
    if (!r) return null
    const day = r.weekday ?? 0
    const time = r.time ?? '20:00'
    const status = r.archived ? 'archived' : 'active'
    // Roteiro e materiais não aparecem na página pública até isso ser decidido.
    return { code, name: r.name, type: r.type, churchName: null, neighborhood: r.neighborhood ?? '', city: '', coverUrl: null, leaderFirstName: r.leader_first_name ?? '', day, time, status, nextMeeting: status === 'active' ? nextOf(day, time, now) : null, plan: null, materials: [] }
  }
  const c = DEMO[code]
  if (!c) return null
  return { ...c, nextMeeting: c.status === 'active' ? nextOf(c.day, c.time, now) : null }
}

export function isValidPhone(digits: string) {
  return /^\d{10,11}$/.test(digits) && digits.slice(2, 3) !== '0'
}

/** Deixa nome e telefone para o líder. Devolve o endereço completo. */
export async function leaveContact(rawCode: string, name: string, phoneDigits: string): Promise<PrivateAddress> {
  if (name.trim().length < 2) throw new Error('Nome inválido')
  if (!isValidPhone(phoneDigits)) throw new Error('Telefone inválido')
  if (REMOTE) {
    const rows = await rpc<PrivateAddress[]>('leave_contact', { p_code: normalizeCode(rawCode), p_name: name.trim(), p_phone: phoneDigits })
    if (!rows[0]) throw new Error('Célula indisponível')
    return { address: rows[0].address ?? '', reference: rows[0].reference ?? '' }
  }
  const c = DEMO[normalizeCode(rawCode)]
  if (!c || c.status !== 'active') throw new Error('Célula indisponível')
  return DEMO_ADDRESS
}

/** Pedido de oração para o líder. Vai só para o líder, não aparece na página. */
export async function leavePrayer(rawCode: string, text: string, name?: string): Promise<void> {
  if (!text.trim()) throw new Error('Pedido vazio')
  if (REMOTE) {
    await rpc('leave_web_prayer', { p_code: normalizeCode(rawCode), p_name: name ?? null, p_text: text.trim() })
    return
  }
  const c = DEMO[normalizeCode(rawCode)]
  if (!c || c.status !== 'active') throw new Error('Célula indisponível')
}
