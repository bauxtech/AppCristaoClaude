import { BOOKS, slugify } from '../bible/books'
import { allVerses, searchVerses, type VerseRef } from '../bible/text'
import type { Sermon } from '../sermon/data'
import { isDivided, isOffTopic, plain } from './rules'

export interface Answer {
  text: string
  verses: { book: string; chapter: number; verse: number; text: string }[]
  /** Igrejas pensam diferente sobre o tema. */
  divided?: boolean
  /** Trecho do culto citado. */
  sermonQuote?: string
  /** Resposta montada na prévia, sem o servidor. */
  preview?: boolean
}

export type ChatContextRef = { kind: 'passage'; label: string } | { kind: 'sermon'; id: string; label: string }

const STOP = new Set(['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'que', 'e', 'em', 'um', 'uma', 'sobre', 'para', 'por', 'com', 'qual', 'quais', 'como', 'diz', 'biblia', 'significa', 'fala', 'falam', 'me', 'explique', 'o que', 'versiculos', 'versiculo', 'disse', 'pastor'])

/** Palavras da pergunta. Palavras longas viram o começo delas, para "ansiedade" achar "ansiosos". */
function keywords(q: string) {
  return plain(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length >= 6 ? w.slice(0, 4) : w))
}

const refs: VerseRef[] = allVerses((slug) => BOOKS.find((b) => slugify(b.name) === slug)?.name ?? slug)

/**
 * A resposta de verdade vem do servidor (Claude), citando só o texto bíblico do app.
 * Na prévia, monta a resposta com os versículos do app que combinam com a pergunta, sem inventar explicação.
 */
export async function askBible(question: string, ctx: ChatContextRef | null, sermon: Sermon | null): Promise<Answer> {
  await new Promise((r) => setTimeout(r, 900))
  if (isOffTopic(question)) {
    return { text: 'Este chat só fala de Bíblia e fé cristã. Posso ajudar com alguma pergunta sobre a Bíblia?', verses: [] }
  }
  const words = keywords(question)
  const pool = new Map<string, VerseRef>()
  const fromCtx = ctx?.kind === 'passage' ? searchVerses(ctx.label, refs) : []
  for (const v of fromCtx) pool.set(`${v.book}${v.chapter}:${v.verse}`, v)
  for (const w of words) for (const v of searchVerses(w, refs)) pool.set(`${v.book}${v.chapter}:${v.verse}`, v)
  const verses = [...pool.values()].slice(0, 3).map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }))

  let sermonQuote: string | undefined
  if (sermon) {
    const sentences = sermon.transcript.split(/(?<=[.!?])\s+/)
    sermonQuote = sentences.find((s) => words.some((w) => plain(s).includes(w))) ?? sentences[0]
  }

  const parts: string[] = []
  if (sermonQuote) parts.push(`No culto "${sermon!.theme}", a pregação diz: "${sermonQuote}"`)
  parts.push(
    verses.length
      ? 'Estes são os versículos do texto bíblico do app que tratam do que você perguntou.'
      : 'Não encontrei versículos sobre isso no texto bíblico da prévia. A Bíblia completa entra no app antes do lançamento.',
  )
  return { text: parts.join('\n\n'), verses, divided: isDivided(question), sermonQuote, preview: true }
}

/** A pergunta por voz vira texto no servidor. Na prévia, ainda não. */
export async function transcribeQuestion(_uri: string): Promise<string> {
  throw new Error('preview')
}
