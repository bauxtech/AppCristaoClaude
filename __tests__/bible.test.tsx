import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { BOOKS, bookBySlug, slugify } from '../src/features/bible/books'
import { ChapterScreen } from '../src/features/bible/screens/ChapterScreen'
import { SearchScreen } from '../src/features/bible/screens/SearchScreen'
import { allVerses, getChapter, searchVerses } from '../src/features/bible/text'
import { renderApp } from '../test-utils/render'

const refs = allVerses((slug) => BOOKS.find((b) => slugify(b.name) === slug)?.name ?? slug)

describe('texto bíblico', () => {
  test('tem os 66 livros', () => {
    expect(BOOKS).toHaveLength(66)
    expect(bookBySlug('1-pedro')?.name).toBe('1 Pedro')
    expect(bookBySlug('joao')?.name).toBe('João')
  })

  test('Salmos 23 está completo, com 6 versículos', () => {
    const c = getChapter('salmos', 23)
    expect(c.complete).toBe(true)
    expect(c.verses.map((v) => v.v)).toEqual([1, 2, 3, 4, 5, 6])
  })

  test('busca por palavra ignora acento e caixa', () => {
    expect(searchVerses('ANSIOSOS', refs).map((r) => `${r.book} ${r.chapter}:${r.verse}`)).toEqual(['Filipenses 4:6'])
  })

  test('busca por referência', () => {
    expect(searchVerses('João 3:16', refs)).toHaveLength(1)
    expect(searchVerses('joao 3:16', refs)).toHaveLength(1)
  })

  test('busca com menos de 2 letras não retorna nada', () => {
    expect(searchVerses('a', refs)).toEqual([])
  })
})

describe('tela do capítulo', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ livro: 'salmos', capitulo: '23' })
    jest.mocked(router.replace).mockClear()
  })

  test('mostra os versículos com nome para o leitor de tela', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    expect(screen.getByRole('header', { name: 'Salmos 23' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Versículo 1\. O Senhor é o meu pastor/ })).toBeTruthy()
  })

  test('grifar um versículo anuncia a cor, sem depender só dela', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: /^Versículo 1\./ }))
    await fireEvent.press(screen.getByRole('button', { name: 'Grifar' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Grifar em amarelo' }))
    expect(screen.getByRole('button', { name: /^Versículo 1\..*grifado em amarelo/ })).toBeTruthy()
  })

  test('capítulo já lido aparece como lido', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    expect(screen.getByText('Capítulo lido')).toBeTruthy()
  })

  test('marcar como lido vai para o próximo capítulo', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ livro: 'salmos', capitulo: '24' })
    await renderApp(<ChapterScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar como lido e ir para Salmos 25' }))
    expect(router.replace).toHaveBeenCalledWith('/biblia/salmos/25')
  })

  test('traduções licenciadas aparecem como em breve', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Almeida' }))
    expect(screen.getByLabelText('Almeida, selecionada')).toBeTruthy()
    expect(screen.getByLabelText('NVI, em breve')).toBeTruthy()
  })

  test('capítulo que não existe mostra a tela de não encontrado', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ livro: 'salmos', capitulo: '151' })
    await renderApp(<ChapterScreen />, { onboarded: true })
    expect(screen.queryByRole('button', { name: /^Versículo/ })).toBeNull()
  })
})

test('a busca mostra resultado e abre o versículo', async () => {
  await renderApp(<SearchScreen />, { onboarded: true })
  await fireEvent.changeText(screen.getByLabelText('Palavra, tema ou referência'), 'pastor')
  const row = screen.getByRole('button', { name: /^Salmos 23:1/ })
  await fireEvent.press(row)
  expect(router.push).toHaveBeenCalledWith({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: 'salmos', capitulo: '23', v: '1' } })
})
