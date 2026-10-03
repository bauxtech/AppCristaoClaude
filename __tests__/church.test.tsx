import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { DIRECTORY, sampleCourses, sampleMinistries, searchDirectory } from '../src/features/church/data'
import { ChurchHubScreen } from '../src/features/church/screens/ChurchHubScreen'
import { CourseCompleteScreen, CourseDetailScreen, ReviewScreen } from '../src/features/church/screens/CourseScreens'
import { EditAccessibilityScreen, EditServicesScreen } from '../src/features/church/screens/EditScreens'
import { servicesByDay } from '../src/features/church/screens/format'
import { EventDetailScreen } from '../src/features/church/screens/MyChurchesScreen'
import { MinistriesScreen } from '../src/features/church/screens/MinistryScreens'
import { ManualChurchScreen, SearchChurchScreen } from '../src/features/church/screens/SearchScreens'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)
const withChurch = { onboarded: true, church: { churches: [{ church: DIRECTORY[0], relation: 'frequento' as const }], mainId: DIRECTORY[0].id } }

beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
})

describe('busca de igreja', () => {
  test('por nome, cidade e CNPJ, ignorando acento', () => {
    expect(searchDirectory('batista').map((c) => c.id)).toEqual(['1'])
    expect(searchDirectory('campinas')).toHaveLength(1)
    expect(searchDirectory('98.765')).toHaveLength(1)
    expect(searchDirectory('sao paulo').length).toBeGreaterThan(1)
  })

  test('filtro de Libras', () => {
    expect(searchDirectory('igreja', true).every((c) => c.accessibility.libras)).toBe(true)
  })

  test('busca sem resultado mostra o aviso e o cadastro à mão', async () => {
    await renderApp(<SearchChurchScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Nome, cidade ou CNPJ'), 'xyzxyz')
    expect(screen.getByText('Nenhuma igreja encontrada para "xyzxyz"')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cadastrar à mão' })).toBeTruthy()
  })
})

describe('aba Igreja', () => {
  test('sem igreja mostra o estado vazio', async () => {
    await renderApp(<ChurchHubScreen />, { onboarded: true })
    expect(screen.getByText('Nenhuma igreja cadastrada')).toBeTruthy()
  })

  test('com igreja mostra cultos e acessibilidade sem depender de cor', async () => {
    await renderApp(<ChurchHubScreen />, withChurch)
    expect(screen.getByLabelText('Domingo: 9h e 18h')).toBeTruthy()
    expect(screen.getByLabelText('Intérprete de Libras: Culto da manhã e da noite (domingo)')).toBeTruthy()
    expect(screen.getByLabelText('Audiodescrição ao vivo: Não disponível')).toBeTruthy()
  })

  test('horários agrupados por dia', () => {
    expect(servicesByDay(DIRECTORY[0].services)).toEqual([
      { day: 'Domingo', times: '9h e 18h' },
      { day: 'Quarta-feira', times: '19h30' },
    ])
  })

  test('cadastrar à mão exige nome e cidade', async () => {
    await renderApp(<ManualChurchScreen />, { onboarded: true })
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    await fireEvent.changeText(screen.getByLabelText('Nome da igreja (obrigatório)'), 'Igreja do Bairro')
    await fireEvent.changeText(screen.getByLabelText('Cidade (obrigatório)'), 'Recife, PE')
    expect(screen.getByRole('button', { name: 'Salvar' })).not.toBeDisabled()
  })

  test('igreja vinda do CNPJ não edita endereço', async () => {
    await renderApp(<EditServicesScreen />, withChurch)
    expect(screen.queryByLabelText('Endereço')).toBeNull()
    expect(screen.getByText('Nome e endereço vêm dos dados públicos do CNPJ e não são editados aqui.')).toBeTruthy()
  })

  test('informar acessibilidade pede em quais cultos tem Libras', async () => {
    await renderApp(<EditAccessibilityScreen />, withChurch)
    expect(screen.getByLabelText('Em quais cultos?')).toBeTruthy()
    await fireEvent.press(screen.getByRole('switch', { name: 'Intérprete de Libras' }))
    expect(screen.queryByLabelText('Em quais cultos?')).toBeNull()
  })

  test('salvar evento na agenda', async () => {
    params.mockReturnValue({ id: 'e1' })
    await renderApp(<EventDetailScreen />, withChurch)
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar na minha agenda' }))
    expect(screen.getByRole('button', { name: 'Tirar da minha agenda' })).toBeTruthy()
  })
})

describe('ministérios', () => {
  test('confirmar presença muda o botão', async () => {
    await renderApp(<MinistriesScreen />, { ...withChurch, church: { ...withChurch.church, ministries: sampleMinistries(new Date(2026, 9, 3)) } })
    await fireEvent.press(screen.getAllByRole('button', { name: 'Confirmar presença' })[0])
    expect(screen.getByRole('button', { name: 'Presença confirmada' })).toBeTruthy()
  })

  test('sem ministérios mostra o estado vazio', async () => {
    await renderApp(<MinistriesScreen />, { ...withChurch, church: { ...withChurch.church, ministries: [] } })
    expect(screen.getByText('Você ainda não cadastrou onde serve.')).toBeTruthy()
  })
})

describe('cursos', () => {
  const courses = sampleCourses(new Date())

  test('a aula 4 do curso de exemplo é no último sábado', () => {
    const d = new Date(`${courses[0].lessons[3].date}T12:00:00`)
    expect(d.getDay()).toBe(6)
  })

  test('cada aula abre a própria tela', async () => {
    params.mockReturnValue({ id: 'c1' })
    await renderApp(<CourseDetailScreen />, { ...withChurch, church: { ...withChurch.church, courses } })
    await fireEvent.press(screen.getByRole('button', { name: /^Aula 2, A vida cristã/ }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/igreja/curso/[id]/aula/[aula]', params: { id: 'c1', aula: 'l2' } })
  })

  test('revisão: marca acerto e erro e mostra o que rever', async () => {
    params.mockReturnValue({ id: 'c1' })
    await renderApp(<ReviewScreen />, { ...withChurch, church: { ...withChurch.church, courses } })
    for (const ok of [true, true, false]) {
      await fireEvent.press(screen.getByRole('button', { name: /^Pergunta:/ }))
      await fireEvent.press(screen.getByRole('button', { name: ok ? 'Acertei' : 'Errei' }))
    }
    expect(screen.getByLabelText('67 por cento de acertos, 2 de 3 cartões')).toBeTruthy()
    expect(screen.getByText('Por que Jesus orava à parte?')).toBeTruthy()
  })

  test('concluir o curso mostra o estado concluído', async () => {
    params.mockReturnValue({ id: 'c1' })
    await renderApp(<CourseCompleteScreen />, { ...withChurch, church: { ...withChurch.church, courses } })
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir curso' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }))
    expect(screen.getByRole('header', { name: 'Parabéns!' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar certificado' })).toBeTruthy()
  })
})
