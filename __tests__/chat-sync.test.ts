import { deleteAllOps, deleteConversationOps, mergeChat, toMessage } from '../src/features/chat/sync'
import { uuid } from '../src/lib/uuid'

test('mensagem do banco vira mensagem do app com o nome do livro e o texto do versículo', () => {
  const m = toMessage({ id: 'x', role: 'assistant', text: 'Resposta', verses: [{ key: 'mateus:6:34', text: 'Não andeis ansiosos' }] })
  expect(m.answer?.verses).toEqual([{ book: 'Mateus', chapter: 6, verse: 34, text: 'Não andeis ansiosos' }])
  expect(toMessage({ id: 'y', role: 'user', text: 'Pergunta', verses: null })).toEqual({ id: 'y', role: 'user', text: 'Pergunta' })
})

test('conversas do banco substituem as do aparelho; as de antes do servidor continuam', () => {
  const id = uuid()
  const local = [
    { id, title: 'Local', createdAt: '2026-10-07', context: null, messages: [] },
    { id: 'c-antiga', title: 'Antiga', createdAt: '2026-10-01', context: null, messages: [] },
  ]
  const remote = [{ id, title: 'Do banco', createdAt: '2026-10-07', context: null, messages: [] }]
  expect(mergeChat(local, remote).map((c) => c.title)).toEqual(['Do banco', 'Antiga'])
})

test('apagar conversa vai só com o id da própria pessoa; apagar tudo apaga só as dela', () => {
  const id = uuid()
  expect(deleteConversationOps(id)).toEqual([{ kind: 'delete', table: 'chat_conversations', match: { id, user_id: '$uid' } }])
  expect(deleteConversationOps('c-antiga')).toEqual([])
  expect(deleteAllOps()).toEqual([{ kind: 'delete', table: 'chat_conversations', match: { user_id: '$uid' } }])
})
