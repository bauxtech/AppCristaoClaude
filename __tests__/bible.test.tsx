import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { BOOKS, bookBySlug, slugify } from '../src/features/bible/books'
import { getTranslation, TRANSLATIONS_DATA } from '../src/features/bible/translations'
import { ChapterScreen } from '../src/features/bible/screens/ChapterScreen'
import { SearchScreen } from '../src/features/bible/screens/SearchScreen'
import { BooksScreen } from '../src/features/bible/screens/BooksScreen'
import { TranslationInfoScreen } from '../src/features/bible/screens/TranslationInfoScreen'
import { getChapter, parseReference, searchBible, verseText } from '../src/features/bible/text'
import { renderApp } from '../test-utils/render'

describe('texto bíblico', () => {
  test('tem os 66 livros', () => {
    expect(BOOKS).toHaveLength(66)
    expect(bookBySlug('1-pedro')?.name).toBe('1 Pedro')
    expect(bookBySlug('joao')?.name).toBe('João')
  })

  test('todos os livros e capítulos têm texto, com 31.102 versículos', () => {
    let total = 0
    for (const b of BOOKS) {
      for (let c = 1; c <= b.chapters; c++) {
        const { verses } = getChapter(slugify(b.name), c)
        expect(verses.length).toBeGreaterThan(0)
        total += verses.length
      }
    }
    expect(total).toBe(31102)
  })

  test('Salmos 23 tem 6 versículos', () => {
    const c = getChapter('salmos', 23)
    expect(c.complete).toBe(true)
    expect(c.verses.map((v) => v.v)).toEqual([1, 2, 3, 4, 5, 6])
    expect(verseText('João', 3, 16)).toMatch(/^Porque Deus amou ao mundo/)
  })

  test('versículo vazio na fonte não aparece (Salmos 46:3 foi juntado ao 2)', () => {
    expect(getChapter('salmos', 46).verses.map((v) => v.v)).not.toContain(3)
  })

  test('a tradução registra licença e crédito, e não se diz domínio público', () => {
    const t = getTranslation()
    expect(t.id).toBe('biblia-livre')
    expect(t.license).not.toBe('public-domain')
    expect(t.attribution).toMatch(/Almeida/)
    expect(TRANSLATIONS_DATA.map((x) => x.id)).not.toEqual(expect.arrayContaining(['ara', 'naa', 'ntlh', 'nvi']))
  })

  test('busca por palavra ignora acento e caixa', () => {
    const r = searchBible('ANSIOSOS', 200)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => /ansiosos/i.test(x.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))).toBe(true)
  })

  test('busca respeita o limite', () => {
    expect(searchBible('senhor', 50)).toHaveLength(50)
  })

  test('busca por referência', () => {
    expect(searchBible('João 3:16')).toHaveLength(1)
    expect(searchBible('joao 3:16')[0].book).toBe('João')
    expect(searchBible('Jo 3:16')[0].book).toBe('João')
    expect(parseReference('Jó 3')?.book).toBe('Jó')
    expect(parseReference('Hb 11:1')?.book).toBe('Hebreus')
    expect(parseReference('1 Sm 3')?.book).toBe('1 Samuel')
    expect(searchBible('Salmos 23')).toHaveLength(6)
    expect(parseReference('Salmos 151')).toBeNull()
  })

  test('busca com menos de 2 letras não retorna nada', () => {
    expect(searchBible('a')).toEqual([])
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
    expect(screen.getByRole('button', { name: /^Versículo 1\. Salmo de Davi: O SENHOR é meu pastor/ })).toBeTruthy()
  })

  test('grifar um versículo anuncia a cor, sem depender só dela', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: /^Versículo 1\./ }))
    await fireEvent.press(screen.getByRole('button', { name: 'Grifar' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Grifar em amarelo' }))
    expect(screen.getByRole('button', { name: /^Versículo 1\..*grifado em amarelo/ })).toBeTruthy()
  })

  test('abrir um capítulo guarda onde parou e a aba Bíblia oferece continuar', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ livro: 'romanos', capitulo: '8' })
    await renderApp(
      <>
        <ChapterScreen />
        <BooksScreen />
      </>,
      { onboarded: true },
    )
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar: Romanos 8' }))
    expect(router.push).toHaveBeenCalledWith('/biblia/romanos/8')
  })

  test('o fim do capítulo mostra o crédito da tradução, que abre a licença', async () => {
    await renderApp(<ChapterScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: /^Bíblia Livre · CC BY 3.0 BR/ }))
    expect(router.push).toHaveBeenCalledWith('/biblia/sobre-traducao')
    await renderApp(<TranslationInfoScreen />, { onboarded: true })
    expect(screen.getByText(/Diego Santos, Mario Sérgio e Marco Teles/)).toBeTruthy()
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
    await fireEvent.press(screen.getByRole('button', { name: 'Bíblia Livre' }))
    expect(screen.getByLabelText('Bíblia Livre, selecionada')).toBeTruthy()
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
