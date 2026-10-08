import type { SyncOp } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import { isUuid } from '../../lib/uuid'
import { bookBySlug } from '../bible/books'
import type { ChatContextRef } from './answer'
import type { Conversation, Message } from './ChatContext'
import { parseKey } from './remote'

// Histórico do chat no banco. Pergunta de fé é dado sensível (LGPD): só guarda com o consentimento de fé,
// e a regra do banco deixa cada pessoa ver só as próprias conversas. As mensagens quem grava é o servidor,
// junto com a resposta. O app grava a conversa (título e contexto) antes de perguntar.

/** Grava a conversa antes da pergunta, para o servidor poder guardar as mensagens nela. */
export async function saveConversation(c: Pick<Conversation, 'id' | 'title' | 'context'>, uid: string): Promise<boolean> {
  if (!supabase || !isUuid(c.id)) return false
  const { error } = await supabase.from('chat_conversations').upsert({ id: c.id, user_id: uid, title: c.title.slice(0, 120), context: c.context })
  return !error
}

export function deleteConversationOps(id: string): SyncOp[] {
  return isUuid(id) ? [{ kind: 'delete', table: 'chat_conversations', match: { id, user_id: '$uid' } }] : []
}

export function deleteAllOps(): SyncOp[] {
  return [{ kind: 'delete', table: 'chat_conversations', match: { user_id: '$uid' } }]
}

type RemoteVerse = { key: string; text: string }

export function toMessage(m: { id: string; role: 'user' | 'assistant'; text: string; verses: RemoteVerse[] | null }): Message {
  if (m.role === 'user') return { id: m.id, role: 'user', text: m.text }
  const verses = (m.verses ?? []).map((v) => {
    const k = parseKey(v.key)
    return { ...k, book: bookBySlug(k.book)?.name ?? k.book, text: v.text }
  })
  return { id: m.id, role: 'assistant', text: m.text, answer: { text: m.text, verses } }
}

/** Conversas do banco no lugar das do aparelho com o mesmo id. Conversas só do aparelho continuam. */
export function mergeChat(local: Conversation[], remote: Conversation[]): Conversation[] {
  const ids = new Set(remote.map((c) => c.id))
  return [...remote, ...local.filter((c) => !ids.has(c.id) && !isUuid(c.id))].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Lê as conversas e mensagens de quem está logado. */
export async function pullChat(uid: string): Promise<Conversation[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, context, created_at, chat_messages(id, role, text, verses, created_at)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return null
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: String(c.created_at).slice(0, 10),
    context: (c.context ?? null) as ChatContextRef | null,
    messages: ((c.chat_messages ?? []) as { id: string; role: 'user' | 'assistant'; text: string; verses: RemoteVerse[] | null; created_at: string }[])
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map(toMessage),
  }))
}
