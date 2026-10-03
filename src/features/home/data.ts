// Dados de exemplo da Home, iguais aos do protótipo.
// Saem daqui quando o fluxo "Hoje e Bíblia" ligar o app ao banco.

import type { IconName } from '../../components/Icon'

export const passage = {
  text: 'O Senhor é o meu pastor; nada me faltará.',
  reference: 'Salmos 23:1',
}

export const reflection = {
  minutes: 1,
  reference: 'Salmos 23',
  paragraphs: [
    'O cuidado de Deus não é uma promessa de ausência de dificuldades, mas de presença constante em meio a elas. O pastor não remove os vales escuros do caminho do rebanho. Ele atravessa os vales junto com eles.',
    'Quando Davi escreveu "nada me faltará", ele não estava descrevendo uma vida sem dor. Ele estava descrevendo uma vida em que a necessidade mais profunda, a presença de Deus, sempre é suprida. A vara e o cajado não são decoração; são instrumentos ativos de proteção e direção.',
    'Em que área da sua vida você está tentando atravessar o vale sozinho? O convite de hoje é simples: confie no Pastor. Não porque o caminho será fácil, mas porque Ele já conhece cada curva do terreno.',
  ],
  prayer: 'Senhor, que eu não busque apenas a ausência do sofrimento, mas a sua presença dentro dele. Que eu sinta o seu cajado me guiando hoje.',
}

/** Palavra para agora: o versículo vem sempre do texto bíblico do app; a frase é de exemplo até a IA escrever. */
export const wordForNow: Record<string, { book: string; chapter: number; verse: number; phrase: string }> = {
  Ansiedade: { book: 'Filipenses', chapter: 4, verse: 6, phrase: 'Leve a Deus o que está pesando agora, em poucas palavras.' },
  Gratidão: { book: 'Salmos', chapter: 23, verse: 1, phrase: 'Lembre de uma coisa boa de hoje e agradeça por ela.' },
  Cansaço: { book: 'Salmos', chapter: 23, verse: 2, phrase: 'Descansar também é confiar. Pare um minuto antes de seguir.' },
  Medo: { book: 'Salmos', chapter: 23, verse: 4, phrase: 'Você não atravessa este momento sozinho.' },
}

/** Dias de outubro de 2026 com leitura ou oração (exemplo). */
export const activeDaysThisMonth = [1, 2, 3]

export const moods = ['Ansiedade', 'Gratidão', 'Cansaço', 'Medo'] as const

export const prayerOfDay = { title: 'Gratidão pela vida', meta: '5 minutos · Texto e áudio' }

export const readingPlan = { name: 'Novo Testamento em 90 dias', day: 34, total: 90 }

export const commitments: { icon: IconName; title: string; when: string; href: string }[] = [
  { icon: 'people', title: 'Reunião da célula', when: 'Quarta, 20h', href: '/celula' },
  { icon: 'church', title: 'Culto', when: 'Domingo, 18h', href: '/igreja' },
  { icon: 'book', title: 'Aula do Curso de batismo', when: 'Sábado, 10h', href: '/igreja' },
  { icon: 'music', title: 'Louvor no ministério', when: 'Domingo, 9h', href: '/igreja' },
]

export const cellRequests = { count: 2 }

export const songOfDay = { title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United' }

/** Total de dias com leitura ou oração. Não existe sequência (regra decidida). */
export const totalDays = 48

export const unreadNotifications = 3
