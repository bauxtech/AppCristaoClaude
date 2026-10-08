import { verseText } from '../bible/text'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { enqueue, flush, pendingOps, useUserId } from '../../lib/sync'
import { uuid } from '../../lib/uuid'
import { useFaithConsent } from '../settings/SettingsContext'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import type { Answer, ChatContextRef } from './answer'
import { DAILY_LIMIT } from './rules'
import { deleteAllOps, deleteConversationOps, mergeChat, pullChat, pushConversation } from './sync'
import { fetchFaithConsentRemote } from '../../lib/account'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  answer?: Answer
  failed?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  context: ChatContextRef | null
  messages: Message[]
  /** A conversa inteira já está no banco. Sem isso, ela é enviada quando houver consentimento e rede. */
  synced?: boolean
}

interface ChatState {
  conversations: Conversation[]
  usage: { date: string; count: number }
}

interface ChatValue {
  conversations: Conversation[]
  remaining: number
  newConversation: (context: ChatContextRef | null) => Conversation
  addMessage: (convId: string, m: Message) => void
  replaceMessage: (convId: string, msgId: string, m: Partial<Message>) => void
  countQuestion: () => void
  /** O servidor guardou pergunta e resposta: a conversa está igual no banco. */
  markSynced: (convId: string) => void
  removeConversation: (id: string) => void
  clearAll: () => void
  /** Só na prévia: usa todas as perguntas de hoje. */
  fillTodayLimit: () => void
}

const Ctx = createContext<ChatValue | null>(null)

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function sample(): Conversation[] {
  const t = today()
  return [
    {
      id: 'h1',
      title: 'Salmos 23, o Senhor é meu pastor',
      createdAt: t,
      context: { kind: 'passage', label: 'Salmos 23' },
      messages: [
        { id: 'm1', role: 'user', text: 'O que significa "O Senhor é meu pastor"?' },
        {
          id: 'm2',
          role: 'assistant',
          text: 'Estes são os versículos do texto bíblico do app que tratam do que você perguntou.',
          answer: { text: '', verses: [{ book: 'Salmos', chapter: 23, verse: 1, text: verseText('Salmos', 23, 1) }], preview: true },
        },
      ],
    },
  ]
}

export function ChatProvider({ children, initial }: { children: ReactNode; initial?: Partial<ChatState> }) {
  const { sampleData } = useSession()
  const [state, setState] = useState<ChatState>(() => {
    const base: ChatState = { conversations: sampleData ? sample() : [], usage: { date: today(), count: 0 } }
    if (initial) return { ...base, conversations: [], ...initial }
    return getItem<ChatState>('chat', base)
  })
  useEffect(() => {
    if (!initial) setItem('chat', state)
  }, [state, initial])
  const stateRef = useRef(state)
  stateRef.current = state
  useDataReset((s) => setState({ conversations: s ? sample() : [], usage: { date: today(), count: 0 } }))

  // Ao entrar, traz as conversas guardadas no banco. Sem consentimento de fé, o banco não guarda conversas.
  const uid = useUserId()
  const faith = useFaithConsent()
  useEffect(() => {
    if (!uid || sampleData || initial || !faith) return
    let alive = true
    ;(async () => {
      await flush()
      // O consentimento do banco vale mais que o do aparelho (pode ter sido retirado em outro celular).
      if ((await fetchFaithConsentRemote(uid)) === false) return
      // Primeiro envia o que está só no aparelho; depois traz do banco, sem perder nada local.
      for (const c of stateRef.current.conversations.filter((x) => !x.synced && x.messages.length)) {
        if (!alive) return
        if (await pushConversation(c, uid)) setState((s) => ({ ...s, conversations: s.conversations.map((x) => (x.id === c.id ? { ...x, synced: true } : x)) }))
      }
      if (pendingOps().length) return
      const remote = await pullChat(uid)
      if (alive && remote) setState((s) => ({ ...s, conversations: mergeChat(s.conversations, remote) }))
    })().catch(() => {})
    return () => {
      alive = false
    }
  }, [uid, sampleData, faith]) // eslint-disable-line react-hooks/exhaustive-deps
  const remote = !sampleData && !initial

  const used = state.usage.date === today() ? state.usage.count : 0

  const value = useMemo<ChatValue>(
    () => ({
      conversations: state.conversations,
      remaining: Math.max(0, DAILY_LIMIT - used),
      newConversation: (context) => {
        const c: Conversation = { id: uuid(), title: context?.label ?? 'Nova conversa', createdAt: today(), context, messages: [] }
        setState((s) => ({ ...s, conversations: [c, ...s.conversations] }))
        return c
      },
      addMessage: (convId, m) =>
        setState((s) => ({
          ...s,
          conversations: s.conversations.map((c) =>
            c.id === convId ? { ...c, synced: false, title: c.messages.length === 0 && m.role === 'user' && !c.context ? m.text.slice(0, 60) : c.title, messages: [...c.messages, m] } : c,
          ),
        })),
      replaceMessage: (convId, msgId, m) =>
        setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === convId ? { ...c, messages: c.messages.map((x) => (x.id === msgId ? { ...x, ...m } : x)) } : c)) })),
      markSynced: (convId) => setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === convId ? { ...c, synced: true } : c)) })),
      fillTodayLimit: () => setState((s) => ({ ...s, usage: { date: today(), count: DAILY_LIMIT } })),
      countQuestion: () => setState((s) => ({ ...s, usage: { date: today(), count: (s.usage.date === today() ? s.usage.count : 0) + 1 } })),
      removeConversation: (id) => {
        if (remote) enqueue(...deleteConversationOps(id))
        setState((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id) }))
      },
      clearAll: () => {
        if (remote) enqueue(...deleteAllOps())
        setState((s) => ({ ...s, conversations: [] }))
      },
    }),
    [state, used, remote],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChat() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useChat fora do ChatProvider')
  return v
}
