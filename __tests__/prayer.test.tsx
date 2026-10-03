import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { router, useLocalSearchParams } from 'expo-router'
import { campaignInfo } from '../src/features/prayer/campaign'
import { sampleData, toISODate } from '../src/features/prayer/data'
import { brToISO, formatDiaryDate, maskDate } from '../src/features/prayer/dates'
import { titleFrom } from '../src/features/prayer/PrayerContext'
import { CampaignDayScreen } from '../src/features/prayer/screens/CampaignDayScreen'
import { DiaryScreen } from '../src/features/prayer/screens/DiaryScreen'
import { NewRequestScreen } from '../src/features/prayer/screens/NewRequestScreen'
import { PrayerHomeScreen } from '../src/features/prayer/screens/PrayerHomeScreen'
import { RequestDetailScreen } from '../src/features/prayer/screens/RequestDetailScreen'
import { RequestsScreen } from '../src/features/prayer/screens/RequestsScreen'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)

beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.back).mockClear()
})

describe('datas', () => {
  test('máscara e conversão de DD/MM/AAAA', () => {
    expect(maskDate('03102026')).toBe('03/10/2026')
    expect(brToISO('03/10/2026')).toBe('2026-10-03')
    expect(brToISO('31/02/2026')).toBeNull()
    expect(brToISO('3/10/2026')).toBeNull()
  })

  test('diário mostra Hoje e Ontem', () => {
    const now = new Date(2026, 9, 3)
    expect(formatDiaryDate('2026-10-03', now)).toBe('Hoje, 3 de outubro')
    expect(formatDiaryDate('2026-10-02', now)).toBe('Ontem, 2 de outubro')
    expect(formatDiaryDate('2026-09-28', now)).toBe('28 de setembro')
  })

  test('título do pedido corta na palavra, sem reticências', () => {
    const t = titleFrom('Senhor, peço pela minha família que está passando por um momento muito difícil agora')
    expect(t.length).toBeLessThanOrEqual(48)
    expect(t).not.toMatch(/…|\.\.\./)
  })
})

describe('campanhas', () => {
  test('a campanha de exemplo está no dia 7 de 21', () => {
    const now = new Date()
    const c = sampleData(now).campaigns[0]
    const info = campaignInfo(c, now)
    expect(info).toMatchObject({ total: 21, today: 7, status: 'active', todayDone: false })
  })

  test('campanha passada aparece como concluída', () => {
    const c = sampleData(new Date()).campaigns[1]
    expect(campaignInfo(c, new Date(2026, 9, 3)).status).toBe('done')
  })

  test('concluir o dia marca o dia na campanha', async () => {
    params.mockReturnValue({ id: 'c1' })
    await renderApp(<CampaignDayScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir o dia' }))
    expect(screen.getAllByText('Dia 7 concluído').length).toBeGreaterThan(0)
  })
})

test('a oração mostra os 5 temas e os pedidos ativos', async () => {
  await renderApp(<PrayerHomeScreen />, { onboarded: true })
  for (const t of ['Manhã', 'Noite', 'Ansiedade', 'Gratidão', 'Família']) {
    expect(screen.getByRole('button', { name: new RegExp(`^${t},`) })).toBeTruthy()
  }
  expect(screen.getByRole('button', { name: 'Pedidos, 4 ativos' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Gratidão, 3, 5 ou 10 minutos' }))
  expect(router.push).toHaveBeenCalledWith({ pathname: '/oracao/momento/[tema]', params: { tema: 'gratidao' } })
})

describe('diário', () => {
  test('fica travado até desbloquear e salva a entrada no topo', async () => {
    await renderApp(<DiaryScreen />, { onboarded: true })
    expect(screen.getByRole('header', { name: 'Diário protegido' })).toBeTruthy()
    expect(screen.queryByLabelText('Nova entrada')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar biometria' })).toBeTruthy())
    await fireEvent.press(screen.getByRole('button', { name: 'Usar biometria' }))
    await waitFor(() => expect(screen.getByLabelText('Nova entrada')).toBeTruthy())
    await fireEvent.changeText(screen.getByLabelText('Nova entrada'), 'Agradeci pelo dia.')
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }))
    const entries = screen.getAllByRole('button', { name: /^Hoje, / })
    expect(entries[0].props.accessibilityLabel).toMatch(/Agradeci pelo dia\.$/)
  })

  test('biometria recusada mantém o diário travado', async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: false, error: 'authentication_failed' })
    await renderApp(<DiaryScreen />, { onboarded: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar biometria' })).toBeTruthy())
    await fireEvent.press(screen.getByRole('button', { name: 'Usar biometria' }))
    await waitFor(() => expect(screen.getByText('Não foi possível confirmar. Tente de novo.')).toBeTruthy())
    expect(screen.queryByLabelText('Nova entrada')).toBeNull()
  })

  test('sem a proteção ligada, abre direto', async () => {
    await renderApp(<DiaryScreen />, { onboarded: true, prayer: { diaryLock: false } })
    expect(screen.getByLabelText('Nova entrada')).toBeTruthy()
  })
})

describe('pedidos', () => {
  test('sem célula, a chave de compartilhar fica desligada e explica o motivo', async () => {
    await renderApp(<NewRequestScreen />, { onboarded: true, cellStatus: 'none' })
    const sw = screen.getByRole('switch', { name: 'Compartilhar com a célula' })
    expect(sw).toBeDisabled()
    expect(sw).not.toBeChecked()
    expect(screen.getByText('Entre numa célula para compartilhar pedidos.')).toBeTruthy()
  })

  test('sem célula, nenhum pedido aparece como compartilhado', async () => {
    await renderApp(<RequestsScreen />, { onboarded: true, cellStatus: 'none' })
    expect(screen.queryByText('Célula')).toBeNull()
  })

  test('salvar pedido guarda e volta para a lista', async () => {
    await renderApp(
      <>
        <NewRequestScreen />
        <RequestsScreen />
      </>,
      { onboarded: true, cellStatus: 'member' },
    )
    expect(screen.getByRole('button', { name: 'Salvar pedido' })).toBeDisabled()
    await fireEvent.changeText(screen.getByLabelText('Seu pedido'), 'Proteção na viagem de sábado. Que tudo corra bem.')
    await fireEvent.press(screen.getByRole('switch', { name: 'Compartilhar com a célula' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar pedido' }))
    expect(router.back).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^Proteção na viagem de sábado\. Criado hoje\. Compartilhado com a célula/ })).toBeTruthy()
  })

  test('marcar como respondido valida a data e guarda o testemunho', async () => {
    params.mockReturnValue({ id: 'r1' })
    await renderApp(<RequestDetailScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar como respondido' }))
    const date = screen.getByLabelText('Data em que foi respondido')
    expect(date.props.value).toBe(toISODate(new Date()).split('-').reverse().join('/'))
    await fireEvent.changeText(date, '31022026')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText('Digite a data no formato DD/MM/AAAA.')).toBeTruthy()
    expect(router.back).not.toHaveBeenCalled()
    await fireEvent.changeText(date, toISODate(new Date()).split('-').reverse().join(''))
    await fireEvent.changeText(screen.getByLabelText('Testemunho curto (opcional)'), 'Ele foi contratado.')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(router.back).toHaveBeenCalled()
    expect(screen.getByText('"Ele foi contratado."')).toBeTruthy()
  })

  test('mostra quem orou por você', async () => {
    params.mockReturnValue({ id: 'r1' })
    await renderApp(<RequestDetailScreen />, { onboarded: true })
    expect(screen.getByText('João orou por você')).toBeTruthy()
    expect(screen.getByText('Ana orou por você')).toBeTruthy()
  })
})

test('nenhum texto da oração usa emoji', async () => {
  await renderApp(<PrayerHomeScreen />, { onboarded: true })
  const emoji = /\p{Extended_Pictographic}/u
  const texts = screen.getAllByText(/./).map((n) => [n.props.children].flat().join(''))
  expect(texts.filter((t) => emoji.test(t))).toEqual([])
})
