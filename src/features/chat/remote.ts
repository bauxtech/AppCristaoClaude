import { callFunction } from '../../lib/supabase'
import { bookBySlug } from '../bible/books'
import type { Answer } from './answer'

// Resposta do servidor (supabase/functions/chat). As regras ficam lá: CVV, assinatura, limite e versículos do app.
type Remote =
  | { kind: 'crisis'; phone: '188' }
  | { kind: 'no_access' }
  | { kind: 'limit'; limit: number }
  | { kind: 'off_topic' }
  | { kind: 'answer'; text: string; verses: { key: string; text: string }[]; divided: boolean; remaining: number }

export class ChatBlocked extends Error {
  constructor(public reason: 'crisis' | 'no_access' | 'limit') {
    super(reason)
  }
}

/** "1-pedro:5:7" vira { book: '1-pedro', chapter: 5, verse: 7 }. */
export function parseKey(key: string) {
  const [book, chapter, verse] = key.split(':')
  return { book, chapter: Number(chapter), verse: Number(verse) }
}

export async function askRemote(question: string, conversationId: string | null, context: string | null): Promise<Answer> {
  const r = await callFunction<Remote>('chat', { question, conversationId, context })
  if (r.kind === 'crisis' || r.kind === 'no_access' || r.kind === 'limit') throw new ChatBlocked(r.kind)
  if (r.kind === 'off_topic') return { text: 'Este chat só fala de Bíblia e fé cristã. Posso ajudar com alguma pergunta sobre a Bíblia?', verses: [] }
  return {
    text: r.text,
    divided: r.divided,
    verses: r.verses.map((v) => {
      const k = parseKey(v.key)
      return { ...k, book: bookBySlug(k.book)?.name ?? k.book, text: v.text }
    }),
  }
}
