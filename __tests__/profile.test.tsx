import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Linking } from 'react-native'
import { FavoriteSongsScreen, PlaylistScreen } from '../src/features/music/screens/MusicScreens'
import { ProfileHome } from '../src/features/profile/screens/ProfileHome'
import { BooksMapScreen, CellPreviewScreen, EditProfileScreen, ExportNotesScreen, FavoritesScreen, JourneyScreen, MilestoneScreen, NotesScreen } from '../src/features/profile/screens/ProfileScreens'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)
beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
  jest.mocked(router.back).mockClear()
})

describe('perfil de conta nova', () => {
  test('tudo zerado, com a explicação', async () => {
    await renderApp(<ProfileHome />, { onboarded: true, sampleData: false })
    expect(screen.getByRole('button', { name: '0 dias com leitura ou oração' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '0% da Bíblia lida' })).toBeTruthy()
    expect(screen.getByText('Sua caminhada começa aqui')).toBeTruthy()
  })

  test('jornada vazia convida a registrar', async () => {
    await renderApp(<JourneyScreen />, { onboarded: true, sampleData: false })
    expect(screen.getByText(/Registre os marcos da sua fé/)).toBeTruthy()
  })

  test('anotações vazias', async () => {
    await renderApp(<NotesScreen />, { onboarded: true, sampleData: false })
    expect(screen.getByText(/Nenhuma anotação ainda/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled()
  })
})

describe('mapa dos livros', () => {
  test('cada livro diz o estado e abre na Bíblia', async () => {
    await renderApp(<BooksMapScreen />, { onboarded: true })
    expect(screen.getByRole('button', { name: 'Gênesis, concluído' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Números, não iniciado' })).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Gênesis, concluído' }))
    expect(router.push).toHaveBeenCalledWith('/biblia/genesis')
  })
})

describe('jornada', () => {
  test('salvar marco valida a data', async () => {
    await renderApp(<MilestoneScreen />, { onboarded: true, sampleData: false })
    await fireEvent.press(screen.getByRole('button', { name: 'Batismo' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar marco' }))
    expect(screen.getByText('Digite a data no formato DD/MM/AAAA.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Data'), '12072020')
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar marco' }))
    expect(router.back).toHaveBeenCalled()
  })
})

describe('anotações', () => {
  test('juntam Bíblia e notas pessoais, com filtro e busca', async () => {
    await renderApp(<NotesScreen />, {
      onboarded: true,
      profileData: { notes: [{ id: 'n1', source: 'Célula', ref: 'Reunião', text: 'Oração diária', date: '2026-09-30' }] },
    })
    expect(screen.getByRole('button', { name: /^Célula\. Reunião\. Oração diária/ })).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Bíblia' }))
    expect(screen.queryByRole('button', { name: /^Célula\. Reunião/ })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Todas' }))
    await fireEvent.changeText(screen.getByLabelText('Buscar nas anotações'), 'diaria')
    expect(screen.getByRole('button', { name: /^Célula\. Reunião\. Oração diária/ })).toBeTruthy()
  })

  test('PDF não inclui o diário travado', async () => {
    await renderApp(<ExportNotesScreen />, { onboarded: true })
    expect(screen.getByRole('checkbox', { name: /Diário de oração\. Desbloqueie o diário/ })).toBeDisabled()
  })
})

describe('favoritos e grifos', () => {
  test('conta nova mostra como favoritar', async () => {
    await renderApp(<FavoritesScreen />, { onboarded: true, sampleData: false })
    expect(screen.getByText(/Nenhum versículo favorito/)).toBeTruthy()
  })
})

describe('privacidade na célula', () => {
  test('esconder o aniversário tira da prévia', async () => {
    await renderApp(<CellPreviewScreen />, { onboarded: true, profileData: { birthday: '1998-03-15' } })
    expect(screen.getByText('Aniversário: 15 de março')).toBeTruthy()
    await fireEvent.press(screen.getByRole('switch', { name: 'Mostrar aniversário' }))
    expect(screen.queryByText('Aniversário: 15 de março')).toBeNull()
  })
})

describe('editar perfil', () => {
  test('menor de 18 recebe o aviso', async () => {
    await renderApp(<EditProfileScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Teste')
    const y = new Date().getFullYear() - 10
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), `0101${y}`)
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText('O app é só para maiores de 18 anos.')).toBeTruthy()
  })
})

describe('música', () => {
  test('favoritar leva para as favoritas e os links abrem fora do app', async () => {
    params.mockReturnValue({ momento: 'manha' })
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderApp(
      <>
        <PlaylistScreen />
        <FavoriteSongsScreen />
      </>,
      { onboarded: true, sampleData: false },
    )
    expect(screen.getByText(/Você ainda não favoritou nenhuma música/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Favoritar Reckless Love' }))
    expect(screen.getAllByRole('button', { name: 'Tirar Reckless Love das favoritas' })).toHaveLength(2)
    expect(screen.queryByText(/Você ainda não favoritou nenhuma música/)).toBeNull()
    await fireEvent.press(screen.getAllByRole('button', { name: 'Deezer' })[0])
    expect(open).toHaveBeenCalledWith(expect.stringContaining('deezer.com/search/'))
  })
})
