// Preferências de avisos. Os nomes e textos vêm do protótipo (Configurar avisos).

export const NOTIFICATION_TYPES = [
  { key: 'leitura', label: 'Leitura do dia', sub: 'Lembrete diário no horário preferido' },
  { key: 'oracao', label: 'Momento de oração', sub: 'Guiado e diário' },
  { key: 'celula', label: 'Reunião da célula', sub: '2 horas antes da reunião' },
  { key: 'culto', label: 'Culto', sub: '1 hora antes do culto cadastrado' },
  { key: 'orou', label: '"Orei por você"', sub: 'Quando alguém orar pelo seu pedido' },
  { key: 'mudancaCelula', label: 'Mudança na célula', sub: 'Novos membros, datas alteradas' },
  { key: 'novoPedido', label: 'Novo pedido na célula', sub: 'Quando alguém compartilhar pedido' },
  { key: 'aniversario', label: 'Aniversário de membro', sub: 'No dia do aniversário' },
  { key: 'aulaCurso', label: 'Aula do curso', sub: 'Antes da próxima aula' },
  { key: 'escalaMinisterio', label: 'Escala do ministério', sub: 'Quando você for escalado' },
  { key: 'resumoSemana', label: 'Resumo da semana', sub: 'Toda segunda-feira pela manhã' },
] as const

export type NotificationKey = (typeof NOTIFICATION_TYPES)[number]['key']

export interface NotificationPrefs {
  types: Record<NotificationKey, boolean>
  vibration: boolean
  /** Banner na tela, sem som. */
  visual: boolean
  /** HH:MM */
  readingTime: string
  prayerTime: string
  quietFrom: string
  quietTo: string
}

/** Horário do primeiro acesso (Manhã, Noite) vira o horário do lembrete de leitura. */
export function readingTimeFrom(choice: string | null) {
  switch (choice) {
    case 'meio':
      return '12:00'
    case 'tarde':
      return '15:00'
    case 'noite':
      return '20:00'
    default:
      return '07:00'
  }
}

export function defaultNotificationPrefs(timeChoice: string | null = null): NotificationPrefs {
  return {
    types: {
      leitura: true,
      oracao: true,
      celula: true,
      culto: false,
      orou: true,
      mudancaCelula: true,
      novoPedido: false,
      aniversario: true,
      aulaCurso: false,
      escalaMinisterio: false,
      resumoSemana: true,
    },
    vibration: true,
    visual: false,
    readingTime: readingTimeFrom(timeChoice),
    prayerTime: '21:00',
    quietFrom: '22:00',
    quietTo: '07:00',
  }
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** O horário cai dentro do silêncio? O silêncio pode virar a noite (22h às 7h). */
export function inQuietHours(time: string, from: string, to: string) {
  const t = toMin(time)
  const a = toMin(from)
  const b = toMin(to)
  if (a === b) return false
  return a < b ? t >= a && t < b : t >= a || t < b
}

/** "22:00" vira "22h"; "07:30" vira "7h30". */
export function hourLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
