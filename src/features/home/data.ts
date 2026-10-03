// Dados de exemplo da Home, iguais aos do protótipo.
// Saem daqui quando o fluxo "Hoje e Bíblia" ligar o app ao banco.

import type { IconName } from '../../components/Icon'

export const passage = {
  text: 'O Senhor é o meu pastor; nada me faltará.',
  reference: 'Salmos 23:1',
}

export const reflection = {
  minutes: 1,
  preview:
    'O cuidado de Deus não é uma promessa de ausência de dificuldades, mas de presença constante em meio a elas. O pastor não remove os vales escuros do caminho do rebanho.',
}

export const moods = ['Ansiedade', 'Gratidão', 'Cansaço', 'Medo'] as const

export const prayerOfDay = { title: 'Gratidão pela vida', meta: '5 minutos · Texto e áudio' }

export const readingPlan = { name: 'Novo Testamento em 90 dias', day: 34, total: 90 }

export const commitments: { icon: IconName; title: string; when: string }[] = [
  { icon: 'people', title: 'Reunião da célula', when: 'Quarta, 20h' },
  { icon: 'church', title: 'Culto', when: 'Domingo, 18h' },
  { icon: 'book', title: 'Aula do Curso de batismo', when: 'Sábado, 10h' },
  { icon: 'music', title: 'Louvor no ministério', when: 'Domingo, 9h' },
]

export const cellRequests = { count: 2 }

export const songOfDay = { title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United' }

/** Total de dias com leitura ou oração. Não existe sequência (regra decidida). */
export const totalDays = 48

export const unreadNotifications = 3
