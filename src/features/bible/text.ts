// Texto bíblico do app, guardado dentro do próprio app: funciona sem internet e não depende de API.
// A tradução e a licença ficam em translations.ts. Nenhum versículo aqui é gerado por IA.

import { BOOKS, slugify } from './books'
import { DEFAULT_TRANSLATION, getTranslation } from './translations'

export interface Verse {
  v: number
  text: string
}

export function chapterKey(bookSlug: string, chapter: number) {
  return `${bookSlug}:${chapter}`
}

function bookChapters(bookSlug: string, translation = DEFAULT_TRANSLATION): string[][] {
  const load = getTranslation(translation).books[bookSlug]
  return load ? load() : []
}

/** Versículos do capítulo. Versículo vazio na fonte (texto juntado ao anterior) não aparece. */
export function getChapter(bookSlug: string, chapter: number, translation = DEFAULT_TRANSLATION): { verses: Verse[]; complete: boolean } {
  const ch = bookChapters(bookSlug, translation)[chapter - 1]
  if (!ch) return { verses: [], complete: false }
  return { verses: ch.map((text, i) => ({ v: i + 1, text })).filter((x) => x.text), complete: true }
}

export interface VerseRef {
  book: string
  bookSlug: string
  chapter: number
  verse: number
  text: string
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

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

// Texto sem acento de cada livro, montado na primeira busca e guardado na memória.
const plainCache = new Map<string, string[][]>()
function plainBook(slug: string, translation: string, chapters: string[][]) {
  const key = `${translation}:${slug}`
  let p = plainCache.get(key)
  if (!p) {
    p = chapters.map((vs) => vs.map(plain))
    plainCache.set(key, p)
  }
  return p
}

/** "Jo 3:16", "joão 3", "salmos 23:1": devolve a referência, se a busca for uma. */
export function parseReference(query: string): { bookSlug: string; book: string; chapter: number; verse?: number } | null {
  const raw = query.trim().toLowerCase()
  const m = plain(raw).match(/^(\d?\s*[a-z]+)\.?\s+(\d+)(?:\s*[:.]\s*(\d+))?$/)
  if (!m) return null
  const name = m[1].replace(/\s+/g, ' ')
  const typed = raw.split(/[\s.]+\d/)[0].replace(/\s+/g, '')
  // "Jó" com acento é Jó; "jo" sem acento fica com João (abreviação repetida: vale a do livro mais adiante).
  const b =
    BOOKS.find((x) => x.abbr.toLowerCase() === typed || x.name.toLowerCase() === raw.replace(/\s*\d+([:.]\d+)?$/, '')) ??
    BOOKS.find((x) => plain(x.name) === name) ??
    [...BOOKS].reverse().find((x) => plain(x.abbr) === name.replace(' ', '')) ??
    BOOKS.find((x) => name.length >= 3 && plain(x.name).startsWith(name))
  if (!b) return null
  const chapter = Number(m[2])
  if (chapter < 1 || chapter > b.chapters) return null
  return { bookSlug: slugify(b.name), book: b.name, chapter, verse: m[3] ? Number(m[3]) : undefined }
}

/**
 * Busca por palavra, trecho ou referência em toda a Bíblia, sem internet.
 * Ignora acentos e maiúsculas. Para no limite para não travar a tela.
 */
export function searchBible(query: string, limit = 100, translation = DEFAULT_TRANSLATION): VerseRef[] {
  const q = query.trim()
  if (q.length < 2) return []
  const ref = parseReference(q)
  if (ref) {
    const { verses } = getChapter(ref.bookSlug, ref.chapter, translation)
    return verses
      .filter((v) => !ref.verse || v.v === ref.verse)
      .slice(0, limit)
      .map((v) => ({ book: ref.book, bookSlug: ref.bookSlug, chapter: ref.chapter, verse: v.v, text: v.text }))
  }
  const pq = plain(q)
  const out: VerseRef[] = []
  for (const b of BOOKS) {
    const slug = slugify(b.name)
    const chapters = bookChapters(slug, translation)
    const plains = plainBook(slug, translation, chapters)
    for (let c = 0; c < chapters.length; c++) {
      const vs = chapters[c]
      for (let v = 0; v < vs.length; v++) {
        if (vs[v] && plains[c][v].includes(pq)) {
          out.push({ book: b.name, bookSlug: slug, chapter: c + 1, verse: v + 1, text: vs[v] })
          if (out.length >= limit) return out
        }
      }
    }
  }
  return out
}
