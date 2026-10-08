import { deleteAllOps, deleteConversationOps, mergeChat, messageRows, toMessage } from '../src/features/chat/sync'
import { uuid } from '../src/lib/uuid'

test('mensagem do banco vira mensagem do app com o nome do livro e o texto do versículo', () => {
  const m = toMessage({ id: 'x', role: 'assistant', text: 'Resposta', verses: [{ key: 'mateus:6:34', text: 'Não andeis ansiosos' }] })
  expect(m.answer?.verses).toEqual([{ book: 'Mateus', chapter: 6, verse: 34, text: 'Não andeis ansiosos' }])
  expect(toMessage({ id: 'y', role: 'user', text: 'Pergunta', verses: null })).toEqual({ id: 'y', role: 'user', text: 'Pergunta' })
})

test('conversas do banco substituem as do aparelho; as que só existem no aparelho continuam', () => {
  const id = uuid()
  const local = [
    { id, title: 'Local', createdAt: '2026-10-07', context: null, messages: [] },
    { id: uuid(), title: 'Feita sem consentimento', createdAt: '2026-10-06', context: null, messages: [] },
    { id: 'c-antiga', title: 'Antiga', createdAt: '2026-10-01', context: null, messages: [] },
  ]
  const remote = [{ id, title: 'Do banco', createdAt: '2026-10-07', context: null, messages: [] }]
  const merged = mergeChat(local, remote)
  expect(merged.map((c) => c.title)).toEqual(['Do banco', 'Feita sem consentimento', 'Antiga'])
  expect(merged[0].synced).toBe(true)
  expect(merged[1].synced).toBeUndefined()
})

test('conversa só do aparelho vira linhas do banco com a chave do versículo, sem as mensagens que falharam', () => {
  const c = {
    id: uuid(),
    title: 'Ansiedade',
    createdAt: '2026-10-08',
    context: null,
    messages: [
      { id: 'u1', role: 'user' as const, text: 'O que Jesus disse?' },
      { id: 'a1', role: 'assistant' as const, text: 'Resposta', answer: { text: 'Resposta', verses: [{ book: 'Mateus', chapter: 6, verse: 34, text: 'Não andeis ansiosos' }] } },
      { id: 'a2', role: 'assistant' as const, text: 'x', failed: true },
    ],
  }
  const rows = messageRows(c, 'u')
  expect(rows).toHaveLength(2)
  expect(rows[1].verses).toEqual([{ key: 'mateus:6:34', text: 'Não andeis ansiosos' }])
})

test('apagar conversa vai só com o id da própria pessoa; apagar tudo apaga só as dela', () => {
  const id = uuid()
  expect(deleteConversationOps(id)).toEqual([{ kind: 'delete', table: 'chat_conversations', match: { id, user_id: '$uid' } }])
  expect(deleteConversationOps('c-antiga')).toEqual([])
  expect(deleteAllOps()).toEqual([{ kind: 'delete', table: 'chat_conversations', match: { user_id: '$uid' } }])
})
