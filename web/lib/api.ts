// Acesso aos dados da página.
// Com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY definidos, chama as funções públicas do banco
// (public_cell_page, leave_contact, report_cell_page). A chave anon é pública por desenho: as regras ficam no banco.
// Sem elas, usa os dados de exemplo abaixo. O endereço da reunião nunca chega à página: só no app, depois da aprovação do líder.

import type { JoinCode, PublicCell } from './data'

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

// Exemplo para a prévia: só dados públicos.
const DEMO: Record<string, PublicCell> = {
  ABC123: {
    code: 'ABC123',
    slug: 'jovens-da-central',
    logoUrl: null,
    coverUrl: null,
    name: 'Jovens da Central',
    type: 'Jovens',
    bio: 'Jovens de 18 a 30 anos que se encontram em casa para ler a Bíblia, orar e comer juntos.',
    neighborhood: 'Pinheiros',
    city: 'São Paulo, SP',
    schedule: [
      { day: 3, time: '20:00' },
      { day: 6, time: '16:00' },
    ],
    status: 'active',
  },
  NOVA01: {
    code: 'NOVA01',
    slug: 'celula-do-bairro',
    logoUrl: null,
    coverUrl: null,
    name: 'Célula do Bairro',
    type: 'Mista',
    bio: null,
    neighborhood: 'Centro',
    city: 'Recife, PE',
    schedule: null,
    status: 'active',
  },
  PAU001: {
    code: 'PAU001',
    slug: 'celula-parada',
    logoUrl: null,
    coverUrl: null,
    name: 'Célula Parada',
    type: 'Mista',
    bio: null,
    neighborhood: 'Centro',
    city: 'Salvador, BA',
    schedule: [{ day: 2, time: '20:00' }],
    status: 'paused',
  },
  ARQ001: {
    code: 'ARQ001',
    slug: null,
    logoUrl: null,
    coverUrl: null,
    name: 'Casais em Missão',
    type: 'Casais',
    bio: null,
    neighborhood: 'Boa Viagem',
    city: 'Recife, PE',
    schedule: [{ day: 6, time: '19:00' }],
    status: 'archived',
  },
}

export const DEMO_CODES = Object.keys(DEMO)
export const DEMO_SLUGS = Object.values(DEMO).flatMap((c) => (c.slug ? [c.slug] : []))

function demoCell(key: string) {
  if (key.startsWith('c:')) return DEMO[normalizeCode(key.slice(2))]
  return Object.values(DEMO).find((c) => c.slug === key.toLowerCase()) ?? DEMO[normalizeCode(key)]
}

export function normalizeCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

/** Endereço do site → como achar a célula. /celulas/jovens-da-central/ vira "jovens-da-central"; o link antigo /c/ABC123/ vira "c:ABC123". */
export function keyFromPath(path: string): string | null {
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v)
    } catch {
      return null
    }
  }
  const slug = /^\/celulas\/([^/]+)\/?$/.exec(path)
  if (slug) {
    const v = decode(slug[1])?.toLowerCase() ?? ''
    // Só o formato que o banco aceita para o endereço. Assim um "c:" no endereço novo não vira código de convite.
    return /^[a-z0-9-]{3,30}$/.test(v) ? v : null
  }
  const code = /^\/c\/([^/]+)\/?$/.exec(path)
  if (code) {
    const v = normalizeCode(decode(code[1]) ?? '')
    return v && code[1] !== '_' ? `c:${v}` : null
  }
  return null
}

/** Endereço público do logo ou da capa no balde cell-logos. */
function logoUrl(path: string | null) {
  return path && SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/cell-logos/${path.split('/').map(encodeURIComponent).join('/')}` : null
}

/** Agenda da página: a lista de dias e horários; célula antiga usa o dia e o horário únicos. De segunda a domingo. */
export function scheduleOf(r: { weekday: number | null; time: string | null; meeting_slots: { weekday: number; time: string }[] | null }) {
  const list = r.meeting_slots?.length ? r.meeting_slots.map((x) => ({ day: x.weekday, time: x.time })) : r.weekday != null && r.time ? [{ day: r.weekday, time: r.time }] : []
  const order = (d: number) => (d + 6) % 7
  return list.length ? list.sort((a, b) => order(a.day) - order(b.day)) : null
}

/** Dados públicos. Nunca inclui endereço, membros, telefones, pedidos ou nome do líder. */
export async function getPublicCell(key: string): Promise<PublicCell | null> {
  if (REMOTE) {
    const rows = await rpc<
      {
        name: string
        type: string | null
        bio: string | null
        weekday: number | null
        time: string | null
        meeting_slots: { weekday: number; time: string }[] | null
        neighborhood: string | null
        archived: boolean
        paused: boolean
        slug: string | null
        logo_path: string | null
        cover_path: string | null
      }[]
    >('public_cell_page', { p_code: key })
    const r = rows[0]
    if (!r) return null
    const status = r.archived ? 'archived' : r.paused ? 'paused' : 'active'
    return {
      code: key,
      slug: r.slug,
      logoUrl: logoUrl(r.logo_path),
      coverUrl: logoUrl(r.cover_path),
      name: r.name,
      type: r.type,
      bio: r.bio,
      neighborhood: r.neighborhood ?? '',
      city: '',
      schedule: scheduleOf(r),
      status,
    }
  }
  return demoCell(key) ?? null
}

export function isValidPhone(digits: string) {
  return /^\d{10,11}$/.test(digits) && digits.slice(2, 3) !== '0'
}

/** Deixa nome e telefone para o líder. Devolve o código para entrar na célula pelo app. */
export async function leaveContact(key: string, name: string, phoneDigits: string): Promise<JoinCode> {
  if (name.trim().length < 2) throw new Error('Nome inválido')
  if (!isValidPhone(phoneDigits)) throw new Error('Telefone inválido')
  if (REMOTE) {
    const rows = await rpc<{ invite_code: string }[]>('leave_contact', { p_code: key, p_name: name.trim(), p_phone: phoneDigits })
    if (!rows[0]?.invite_code) throw new Error('Célula indisponível')
    return { inviteCode: rows[0].invite_code }
  }
  const c = demoCell(key)
  if (!c || c.status !== 'active') throw new Error('Célula indisponível')
  return { inviteCode: c.code }
}

export type ReportReason = 'logo' | 'capa' | 'nome' | 'outro'

/** Denúncia da página: vai para a equipe do acasa, sem login. */
export async function reportPage(key: string, reason: ReportReason, detail?: string): Promise<void> {
  if (REMOTE) {
    await rpc('report_cell_page', { p_code: key, p_reason: reason, p_detail: detail?.trim() || null })
    return
  }
  if (!demoCell(key)) throw new Error('Célula indisponível')
}
