// Texto bíblico de exemplo: só os versículos que aparecem no protótipo.
// Tradução de exemplo "Almeida". O texto completo de domínio público substitui este arquivo
// quando a Bíblia for carregada no app. Nenhum versículo aqui é gerado por IA.

import { slugify } from './books'

export interface Verse {
  v: number
  text: string
}

/** Chave: "slug-do-livro:capítulo". */
const CHAPTERS: Record<string, Verse[]> = {
  'salmos:23': [
    { v: 1, text: 'O Senhor é o meu pastor; nada me faltará.' },
    { v: 2, text: 'Ele me faz repousar em pastos verdejantes. Leva-me para junto das águas de descanso.' },
    { v: 3, text: 'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.' },
    { v: 4, text: 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo; o teu bordão e o teu cajado me consolam.' },
    { v: 5, text: 'Preparas uma mesa perante mim na presença dos meus inimigos; unges a minha cabeça com óleo; o meu cálice transborda.' },
    { v: 6, text: 'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do Senhor por longos dias.' },
  ],
  'joao:3': [{ v: 16, text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' }],
  'joao:10': [{ v: 11, text: 'Eu sou o bom pastor; o bom pastor dá a sua vida pelas ovelhas.' }],
  'filipenses:4': [
    { v: 6, text: 'Não estejais ansiosos por coisa alguma; antes, em tudo fazei conhecidas as vossas necessidades a Deus em oração e súplica, com ação de graças.' },
    { v: 13, text: 'Tudo posso naquele que me fortalece.' },
    { v: 19, text: 'O meu Deus suprirá todas as vossas necessidades segundo as suas riquezas em glória em Cristo Jesus.' },
  ],
  'isaias:40': [{ v: 11, text: 'Como pastor ele apascenta o seu rebanho, ajunta os cordeiros com os braços.' }],
  'ezequiel:34': [{ v: 23, text: 'Levantarei sobre elas um único pastor que as apascentará, o meu servo Davi.' }],
  'hebreus:13': [{ v: 20, text: 'O Deus da paz que pelo sangue da aliança eterna trouxe dentre os mortos o grande pastor das ovelhas.' }],
  '1-pedro:2': [{ v: 25, text: 'Porque andáveis desgarrados como ovelhas, mas agora vos convertestes ao Bispo e Pastor das vossas almas.' }],
  'mateus:18': [{ v: 20, text: 'Porque onde estiverem dois ou três reunidos em meu nome, estou no meio deles.' }],
  'proverbios:31': [{ v: 10, text: 'Quem pode achar a mulher virtuosa? O seu valor excede muito ao de rubis.' }],
  'efesios:4': [{ v: 32, text: 'Portanto, sede bondosos e compassivos uns para com os outros, perdoando-vos mutuamente, assim como Deus vos perdoou em Cristo.' }],
}

/** Capítulos com o texto inteiro na prévia. Nos outros, só alguns versículos. */
const COMPLETE = new Set(['salmos:23'])

export function chapterKey(bookSlug: string, chapter: number) {
  return `${bookSlug}:${chapter}`
}

export function getChapter(bookSlug: string, chapter: number): { verses: Verse[]; complete: boolean } {
  const key = chapterKey(bookSlug, chapter)
  return { verses: CHAPTERS[key] ?? [], complete: COMPLETE.has(key) }
}

export interface VerseRef {
  book: string
  bookSlug: string
  chapter: number
  verse: number
  text: string
}

export function allVerses(bookName: (slug: string) => string): VerseRef[] {
  return Object.entries(CHAPTERS).flatMap(([key, verses]) => {
    const [slug, ch] = key.split(':')
    return verses.map((v) => ({ book: bookName(slug), bookSlug: slug, chapter: Number(ch), verse: v.v, text: v.text }))
  })
}

/** Referências cruzadas de exemplo do protótipo (para Salmos 23). */
export const CROSS_REFS: { book: string; chapter: number; verse: number }[] = [
  { book: 'Filipenses', chapter: 4, verse: 19 },
  { book: 'João', chapter: 10, verse: 11 },
  { book: 'Isaías', chapter: 40, verse: 11 },
  { book: 'Ezequiel', chapter: 34, verse: 23 },
  { book: 'Hebreus', chapter: 13, verse: 20 },
  { book: '1 Pedro', chapter: 2, verse: 25 },
]

export function verseText(bookName: string, chapter: number, verse: number) {
  return getChapter(slugify(bookName), chapter).verses.find((v) => v.v === verse)?.text ?? ''
}

/** Busca por palavra ou por referência ("Jo 3:16", "salmos 23"). */
export function searchVerses(query: string, refs: VerseRef[]): VerseRef[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const pq = plain(q)
  return refs.filter((r) => plain(r.text).includes(pq) || plain(`${r.book} ${r.chapter}:${r.verse}`).includes(pq))
}
