import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { askBible } from '../src/features/chat/answer'
import { isCrisis, isOffTopic } from '../src/features/chat/rules'
import { ChatScreen } from '../src/features/chat/screens/ChatScreen'
import { ChatHistoryScreen } from '../src/features/chat/screens/HistoryScreen'
import { BOOKS } from '../src/features/bible/books'
import { verseText } from '../src/features/bible/text'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)

beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
})

describe('regras de segurança', () => {
  test('reconhece fala sobre se machucar, com e sem acento', () => {
    for (const t of ['Eu quero me machucar', 'penso em suicídio', 'nao quero mais viver', 'Quero morrer']) expect(isCrisis(t)).toBe(true)
    expect(isCrisis('O que é o perdão?')).toBe(false)
  })

  test('fora do tema', () => {
    expect(isOffTopic('Me passa uma receita de bolo')).toBe(true)
    expect(isOffTopic('O que a Bíblia diz sobre perdão?')).toBe(false)
  })
})

describe('respostas', () => {
  test('cita só versículos do texto bíblico do app', async () => {
    const a = await askBible('Quais versículos falam sobre ansiedade?', null, null)
    expect(a.verses.length).toBeGreaterThan(0)
    for (const v of a.verses) {
      expect(BOOKS.some((b) => b.name === v.book)).toBe(true)
      expect(verseText(v.book, v.chapter, v.verse)).toBe(v.text)
    }
  })

  test('assunto fora do tema recebe a recusa e nenhum versículo', async () => {
    const a = await askBible('Qual o resultado do futebol?', null, null)
    expect(a.text).toMatch(/só fala de Bíblia/)
    expect(a.verses).toEqual([])
  })

  test('tema que divide as igrejas recebe o aviso', async () => {
    expect((await askBible('O que a Bíblia diz sobre batismo?', null, null)).divided).toBe(true)
  })
})

describe('tela do chat', () => {
  test('falar em se machucar mostra o CVV 188 na hora', async () => {
    await renderApp(<ChatScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Sua pergunta sobre a Bíblia'), 'não quero mais viver')
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pergunta' }))
    expect(screen.getByLabelText('Telefone 1 8 8')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ligar para o 188' })).toBeTruthy()
  })

  test('pergunta e resposta com versículo que abre a Bíblia', async () => {
    await renderApp(<ChatScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Perguntar: Quais versículos falam sobre ansiedade?' }))
    const link = await waitFor(() => screen.getByRole('link', { name: /^Filipenses 4:6\./ }), { timeout: 3000 })
    await fireEvent.press(link)
    expect(router.push).toHaveBeenCalledWith({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: 'filipenses', capitulo: '4', v: '6' } })
  })

  test('aberto da Bíblia mostra a passagem no topo', async () => {
    params.mockReturnValue({ passagem: 'Salmos 23:1' })
    await renderApp(<ChatScreen />, { onboarded: true })
    expect(screen.getByText('Sobre Salmos 23:1')).toBeTruthy()
  })

  test('mostra quantas perguntas restam e bloqueia no limite', async () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    await renderApp(<ChatScreen />, { onboarded: true, chat: { usage: { date, count: 17 } } })
    expect(screen.getByText('3 perguntas restantes hoje')).toBeTruthy()
  })

  test('limite atingido', async () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    await renderApp(<ChatScreen />, { onboarded: true, chat: { usage: { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, count: 20 } } })
    expect(screen.getByText('Você usou as 20 perguntas de hoje')).toBeTruthy()
    expect(screen.queryByLabelText('Sua pergunta sobre a Bíblia')).toBeNull()
  })
})

describe('histórico', () => {
  test('vazio', async () => {
    await renderApp(<ChatHistoryScreen />, { onboarded: true })
    expect(screen.getByText('Nenhuma conversa ainda. As conversas com o chat aparecem aqui.')).toBeTruthy()
  })

  test('apagar pede confirmação', async () => {
    const conv = { id: 'x1', title: 'Perdão', createdAt: '2026-10-03', context: null, messages: [{ id: 'm', role: 'user' as const, text: 'O que é perdão?' }] }
    await renderApp(<ChatHistoryScreen />, { onboarded: true, chat: { conversations: [conv] } })
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar a conversa Perdão' }))
    expect(screen.getByRole('header', { name: 'Apagar esta conversa?' })).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar' }))
    expect(screen.getByText('Nenhuma conversa ainda. As conversas com o chat aparecem aqui.')).toBeTruthy()
  })
})
