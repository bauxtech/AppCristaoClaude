import { fromRow, toVerseRef } from '../src/features/sermon/remote'

test('versículo do servidor vira referência com o nome do livro do app', () => {
  expect(toVerseRef('joao:10:11')).toEqual({ book: 'João', chapter: 10, verse: 11 })
  expect(toVerseRef('salmos:23:1')).toEqual({ book: 'Salmos', chapter: 23, verse: 1 })
})

test('culto pronto traz título, transcrição, resumo, pontos, aplicação e versículos', () => {
  const r = fromRow({
    status: 'ready',
    title: 'O cuidado de Deus',
    transcript: 'Boa noite, igreja.',
    summary: { summary: 'Resumo', points: ['Um', 'Dois'], application: 'Ore com alguém', verses: [{ key: 'mateus:6:34' }] },
  })
  expect(r).toEqual({ theme: 'O cuidado de Deus', transcript: 'Boa noite, igreja.', summary: 'Resumo', points: ['Um', 'Dois'], application: 'Ore com alguém', verses: [{ book: 'Mateus', chapter: 6, verse: 34 }] })
})

test('falha mostra o motivo que o servidor guardou; motivo desconhecido vira erro genérico', () => {
  expect(fromRow({ status: 'failed', title: '', transcript: null, summary: { reason: 'limit' } })).toBe('limit')
  expect(fromRow({ status: 'failed', title: '', transcript: null, summary: { reason: 'Transcrição falhou: 429 insufficient_quota' } })).toBe('error')
  expect(fromRow({ status: 'failed', title: '', transcript: null, summary: null })).toBe('error')
  expect(fromRow({ status: 'processing', title: '', transcript: null, summary: null })).toBe('processing')
})
