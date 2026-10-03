// Dados de exemplo da oração, iguais aos do protótipo.
// Os momentos guiados são escritos pela equipe do app. Até lá, todos os temas usam o roteiro do protótipo.

import type { IconName } from '../../components/Icon'
import { verseText } from '../bible/text'

export type ThemeId = 'manha' | 'noite' | 'ansiedade' | 'gratidao' | 'familia'

export const THEMES: { id: ThemeId; label: string; icon: IconName; durations: number[] }[] = [
  { id: 'manha', label: 'Manhã', icon: 'sun', durations: [5, 10] },
  { id: 'noite', label: 'Noite', icon: 'moon', durations: [5, 10] },
  { id: 'ansiedade', label: 'Ansiedade', icon: 'heart', durations: [3, 5] },
  { id: 'gratidao', label: 'Gratidão', icon: 'cup', durations: [3, 5, 10] },
  { id: 'familia', label: 'Família', icon: 'people', durations: [5, 10] },
]

export function themeById(id: string) {
  return THEMES.find((t) => t.id === id)
}

/** Roteiro do momento guiado. O versículo vem do texto bíblico do app. */
export function guidedSteps(_theme: ThemeId): string[] {
  return [
    'Respire fundo e aquiete o seu coração. Deus está aqui com você.',
    `"${verseText('Filipenses', 4, 6)}" Filipenses 4:6`,
    'Agradeça por três coisas específicas da sua semana.',
    'Apresente a Deus os que você ama. Ore pelo nome de cada um.',
    'Encerre pedindo sabedoria para as decisões desta semana.',
  ]
}

export type CampaignType = 'Oração' | 'Jejum' | 'Propósito'
export const CAMPAIGN_TYPES: CampaignType[] = ['Oração', 'Jejum', 'Propósito']

export interface DiaryEntry {
  id: string
  date: string
  text: string
}

export interface PrayerRequest {
  id: string
  title: string
  text: string
  createdAt: string
  shared: boolean
  prayedBy: string[]
  videoUri?: string
  answeredAt?: string
  testimony?: string
}

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  start: string
  end: string
  doneDays: number[]
  /** Texto de cada dia, quando a campanha tem roteiro. */
  days?: Record<number, { title: string; paragraphs: string[]; verse?: { book: string; chapter: number; verse: number } }>
}

const DAY = 86400000

function isoDaysAgo(now: Date, n: number) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n)
  return toISODate(d)
}

export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Exemplos do protótipo, com datas contadas a partir de hoje. */
export function sampleData(now: Date) {
  const diary: DiaryEntry[] = [
    { id: 'd1', date: isoDaysAgo(now, 0), text: 'Hoje fui grato por minha família, pela saúde e pela paz no trabalho. Sinto que Deus está me guiando em cada decisão.' },
    { id: 'd2', date: isoDaysAgo(now, 1), text: 'Pedi sabedoria para a reunião de amanhã. Sinto que Deus está no controle de tudo.' },
    { id: 'd3', date: isoDaysAgo(now, 5), text: 'Foi um dia difícil. Trouxe tudo para Deus em oração e sinto paz no coração.' },
  ]
  const requests: PrayerRequest[] = [
    { id: 'r1', title: 'Emprego para o João', createdAt: isoDaysAgo(now, 12), text: 'Senhor, abra as portas certas para o João encontrar um emprego digno e que ele possa usar seus dons para sua glória.', shared: false, prayedBy: ['João', 'Ana'] },
    { id: 'r2', title: 'Saúde da minha mãe', createdAt: isoDaysAgo(now, 5), text: 'Pai, cura minha mãe completamente. Que ela tenha saúde plena e possa ver tua glória em sua vida.', shared: true, prayedBy: ['Maria'] },
    { id: 'r3', title: 'Paz no meu casamento', createdAt: isoDaysAgo(now, 3), text: 'Senhor, restaura a paz e o amor no meu casamento. Que a tua presença seja o fundamento da nossa família.', shared: false, prayedBy: [] },
    { id: 'r4', title: 'Sabedoria na faculdade', createdAt: isoDaysAgo(now, 1), text: 'Pai, dá-me sabedoria e foco nos estudos. Que eu honre a ti com minha dedicação.', shared: false, prayedBy: [] },
    { id: 'r5', title: 'Vaga no novo emprego', createdAt: '2026-08-20', text: 'Consegui a vaga. Deus respondeu este pedido.', shared: false, prayedBy: [], answeredAt: '2026-09-15', testimony: 'Fui chamado para a entrevista inesperadamente e fui aprovado.' },
    { id: 'r6', title: 'Cura da gripe do filho', createdAt: '2026-08-30', text: 'Meu filho se recuperou rapidamente.', shared: true, prayedBy: [], answeredAt: '2026-09-02', testimony: 'Em três dias ele estava completamente bem, graças a Deus.' },
  ]
  const startFamily = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  const campaigns: Campaign[] = [
    {
      id: 'c1',
      name: '21 dias de oração pela família',
      type: 'Oração',
      start: toISODate(startFamily),
      end: toISODate(new Date(startFamily.getTime() + 20 * DAY)),
      doneDays: [1, 2, 3, 4, 5, 6],
      days: {
        7: {
          title: 'Unidade e amor na família',
          paragraphs: [
            'Senhor Deus, hoje oramos especialmente pela unidade da nossa família. Que o amor que vem de ti seja o alicerce de cada relacionamento dentro do nosso lar.',
            'Ensina-nos a perdoar como tu nos perdoaste, a servir com humildade e a celebrar as vitórias uns dos outros. Que nosso lar seja um reflexo do teu reino.',
          ],
          verse: { book: 'Efésios', chapter: 4, verse: 32 },
        },
      },
    },
    { id: 'c2', name: 'Jejum e oração pela cidade', type: 'Jejum', start: '2026-09-01', end: '2026-09-07', doneDays: [1, 2, 3, 4, 5, 6, 7] },
    { id: 'c3', name: 'Propósito de vida', type: 'Propósito', start: '2026-08-01', end: '2026-08-14', doneDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  ]
  return { diary, requests, campaigns }
}
