// Avisos que aparecem na central (sino da tela Hoje).
// Enquanto o servidor não entra, os avisos de exemplo vêm daqui.

export type NoticeType = 'cell' | 'bible' | 'prayer' | 'church' | 'system'

export interface Notice {
  id: string
  type: NoticeType
  title: string
  body: string
  /** Data e hora em ISO. */
  at: string
  read: boolean
  /** Tela que abre ao tocar. */
  href?: string
  /** Aviso sobre pedido de oração da célula: o visitante não recebe. */
  cellPrayer?: boolean
}

export const NOTICE_TYPE_LABEL: Record<NoticeType, string> = {
  cell: 'Célula',
  bible: 'Bíblia',
  prayer: 'Oração',
  church: 'Igreja',
  system: 'App',
}

/** Avisos do protótipo, com o horário contado a partir de agora. */
export function sampleNotices(now = new Date()): Notice[] {
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
  return [
    { id: 'nt1', type: 'cell', title: 'Encontro da célula hoje', body: 'Jovens da Central às 20h. Confirme sua presença.', at: ago(0), read: false, href: '/celula' },
    { id: 'nt2', type: 'prayer', title: 'Momento de oração', body: 'Sua oração noturna está agendada para as 21h.', at: ago(Math.min(2, now.getHours() * 0.5)), read: false, href: '/oracao' },
    { id: 'nt3', type: 'bible', title: 'Plano bíblico', body: 'Você tem 2 capítulos para ler hoje: Salmos 23 e 24.', at: ago(Math.min(5, now.getHours() * 0.8)), read: false, href: '/biblia' },
    { id: 'nt4', type: 'cell', title: 'Ana confirmou presença', body: 'Ana Pereira confirmou para o encontro de quarta.', at: ago(now.getHours() + 4), read: true, href: '/celula' },
    { id: 'nt5', type: 'church', title: 'Resumo do culto pronto', body: 'O resumo do culto de domingo está disponível.', at: ago(now.getHours() + 6), read: true, href: '/culto' },
    { id: 'nt6', type: 'prayer', title: 'Pedido de oração respondido', body: 'Carlos marcou um pedido da célula como respondido.', at: ago(now.getHours() + 30), read: true, href: '/celula/pedidos', cellPrayer: true },
    { id: 'nt7', type: 'system', title: 'Novo plano disponível', body: 'Um novo plano de leitura "Advento 2025" está disponível.', at: ago(now.getHours() + 100), read: true, href: '/biblia/planos' },
  ]
}

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Avisos que a pessoa pode ver. O texto do pedido nunca vai no aviso (aparece na tela bloqueada). */
export function visibleNotices(list: Notice[], canSeePrayers: boolean) {
  return canSeePrayers ? list : list.filter((n) => !n.cellPrayer)
}

/** Agrupa em Hoje, Ontem e Anteriores, do mais novo para o mais antigo. */
export function groupNotices(list: Notice[], now = new Date()) {
  const today = dayStart(now)
  const yesterday = today - 86400_000
  const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at))
  const groups: { label: string; items: Notice[] }[] = []
  const push = (label: string, n: Notice) => {
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(n)
    else groups.push({ label, items: [n] })
  }
  for (const n of sorted) {
    const t = new Date(n.at).getTime()
    push(t >= today ? 'Hoje' : t >= yesterday ? 'Ontem' : 'Anteriores', n)
  }
  return groups
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "Agora", "2h", "Ontem", "28 set". */
export function noticeTime(iso: string, now = new Date()) {
  const d = new Date(iso)
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 5) return 'Agora'
  if (d.getTime() >= dayStart(now)) return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h`
  if (d.getTime() >= dayStart(now) - 86400_000) return 'Ontem'
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
