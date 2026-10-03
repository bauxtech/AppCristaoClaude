import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Linking } from 'react-native'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { simulateStorePurchase } from '../src/lib/store'
import { previewState, subStatus, trialDaysLeft } from '../src/features/subscription/plan'
import { BlockedScreen, MyPlanScreen, PlansScreen, TrialBanner } from '../src/features/subscription/screens/SubscriptionScreens'
import { renderApp } from '../test-utils/render'

// A folha de exemplo da loja só confirma na prévia.
jest.mock('../src/lib/preview', () => ({ IS_PREVIEW: true }))

beforeEach(() => {
  jest.useRealTimers()
  jest.mocked(router.push).mockClear()
  jest.mocked(router.replace).mockClear()
  simulateStorePurchase(null)
})

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h)

describe('regras do teste grátis', () => {
  test('7 dias contando o primeiro, sem forma de pagamento', () => {
    const start = day(2026, 10, 1).toISOString()
    expect(trialDaysLeft(start, day(2026, 10, 1))).toBe(7)
    expect(trialDaysLeft(start, day(2026, 10, 7, 23))).toBe(1)
    expect(trialDaysLeft(start, day(2026, 10, 8, 0))).toBe(0)
    expect(subStatus({ trialStart: start, introSeen: true, plan: null }, day(2026, 10, 7))).toBe('trial')
    expect(subStatus({ trialStart: start, introSeen: true, plan: null }, day(2026, 10, 8))).toBe('blocked')
  })

  test('cancelada fica ativa até o fim do período; pagamento falhou tem prazo', () => {
    const now = day(2026, 10, 3)
    expect(subStatus(previewState('canceledActive', now), now)).toBe('canceledActive')
    expect(subStatus(previewState('canceledActive', now), day(2026, 11, 1))).toBe('blocked')
    expect(subStatus(previewState('paymentFailed', now), now)).toBe('paymentFailed')
    expect(subStatus(previewState('paymentFailed', now), day(2026, 10, 11))).toBe('blocked')
  })
})

describe('contador e avisos do teste', () => {
  test('contador no dia 2', async () => {
    await renderApp(<TrialBanner />, { onboarded: true, subscription: previewState('trialDay2') })
    await fireEvent.press(screen.getByRole('button', { name: 'Faltam 6 dias do seu teste. Ver plano' }))
    expect(router.push).toHaveBeenCalledWith('/assinatura')
  })

  test('último dia: contador e cartão no Hoje', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, subscription: previewState('lastDay') })
    expect(screen.getByRole('button', { name: 'Seu teste termina amanhã. Ver plano' })).toBeTruthy()
    expect(screen.getByText('Assine para continuar sem interrupções. Seu progresso fica salvo.')).toBeTruthy()
  })

  test('assinante não vê contador', async () => {
    await renderApp(<TrialBanner />, { onboarded: true, subscription: previewState('active') })
    expect(screen.queryByText(/teste/)).toBeNull()
  })

  test('pagamento falhou aparece no Hoje com prazo', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, subscription: previewState('paymentFailed') })
    expect(screen.getByText('Pagamento falhou na renovação')).toBeTruthy()
    expect(screen.getByText(/Regularize na loja até/)).toBeTruthy()
  })
})

describe('tela de planos', () => {
  test('um plano, mensal ou anual, preço de exemplo e um botão só', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    expect(screen.getByLabelText('Plano Anual, R$ 00,00 por ano')).toBeTruthy()
    await fireEvent.press(screen.getByRole('tab', { name: 'Mensal' }))
    expect(screen.getByLabelText('Plano Mensal, R$ 00,00 por mês')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Assinar' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Restaurar compra' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Termos de Uso' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Privacidade' })).toBeTruthy()
  })

  test('cancelar na folha da loja volta sem erro; confirmar leva à confirmação', async () => {
    jest.useFakeTimers()
    await renderApp(<PlansScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Assinar' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/erro/i)).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Assinar' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar assinatura' }))
    jest.advanceTimersByTime(1000)
    expect(router.replace).toHaveBeenCalledWith('/assinatura/confirmada')
  })

  test('restaurar sem compra avisa; com compra em outro aparelho, restaura', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar compra' }))
    expect(await screen.findByText('Nenhuma compra encontrada para restaurar')).toBeTruthy()
    simulateStorePurchase('monthly')
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar compra' }))
    expect(await screen.findByText('Compra restaurada')).toBeTruthy()
  })
})

describe('bloqueio', () => {
  test('mantém restaurar, baixar dados, sair, excluir e ajuda', async () => {
    await renderApp(<BlockedScreen />, { onboarded: true, subscription: previewState('blocked') })
    expect(screen.getByText('Seu teste terminou')).toBeTruthy()
    for (const l of ['Assinar', 'Restaurar compra', 'Baixar meus dados', 'Sair da conta', 'Excluir conta', 'Ajuda']) expect(screen.getByRole('button', { name: l })).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }))
    expect(router.push).toHaveBeenCalledWith('/configuracoes/excluir')
  })
})

describe('meu plano', () => {
  test('ativa: valor, próxima cobrança e gerenciar na loja', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('active') })
    expect(screen.getByText('Ativa')).toBeTruthy()
    expect(screen.getByLabelText(/^Próxima cobrança:/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Gerenciar assinatura' }))
    expect(open).toHaveBeenCalled()
  })

  test('cancelada e ainda ativa', async () => {
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('canceledActive') })
    expect(screen.getByText('Sua assinatura foi cancelada, mas continua ativa até o fim do período pago.')).toBeTruthy()
    expect(screen.getByLabelText(/^Acesso até:/)).toBeTruthy()
  })

  test('no teste: dias que faltam e ver plano', async () => {
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('trialDay2') })
    expect(screen.getByText(/Faltam 6 dias/)).toBeTruthy()
  })
})
