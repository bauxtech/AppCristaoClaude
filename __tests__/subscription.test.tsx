import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Linking } from 'react-native'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { simulateStorePurchase } from '../src/lib/store'
import { accessFromServer, localAccess, previewState, trialDaysLeft, trialEnd } from '../src/features/subscription/plan'
import { FeatureGuard, PlanLockRow } from '../src/features/subscription/PlanLock'
import { MyPlanScreen, PlansScreen, TrialBanner } from '../src/features/subscription/screens/SubscriptionScreens'
import { AppText } from '../src/components'
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
  test('7 dias corridos contando o primeiro, sem forma de pagamento', () => {
    const end = trialEnd(day(2026, 10, 1).toISOString()).toISOString()
    expect(trialDaysLeft(end, day(2026, 10, 1))).toBe(7)
    expect(trialDaysLeft(end, day(2026, 10, 7, 23))).toBe(1)
    expect(trialDaysLeft(end, day(2026, 10, 8, 0))).toBe(0)
    const s = { trialStart: day(2026, 10, 1).toISOString(), introSeen: true, paywallSeen: false, plan: null }
    expect(localAccess(s, day(2026, 10, 7)).plan).toBe('trial')
    expect(localAccess(s, day(2026, 10, 8)).plan).toBe('free')
  })

  test('sem plano, nada além da Bíblia', () => {
    const a = localAccess(previewState('free'))
    expect(a.plan).toBe('free')
    expect(a.features).toEqual([])
  })

  test('cancelada fica ativa até o fim do período; pagamento falhou tem prazo', () => {
    const now = day(2026, 10, 3)
    expect(localAccess(previewState('canceledActive', now), now).plan).toBe('completo')
    expect(localAccess(previewState('canceledActive', now), day(2026, 11, 1)).plan).toBe('free')
    expect(localAccess(previewState('paymentFailed', now), now).plan).toBe('completo')
    expect(localAccess(previewState('paymentFailed', now), day(2026, 10, 11)).plan).toBe('free')
  })

  test('cada plano libera só o que é dele', () => {
    expect(localAccess(previewState('essencial')).features).not.toContain('sermon')
    expect(localAccess(previewState('completo')).features).toContain('sermon')
    expect(localAccess(previewState('completo')).features).not.toContain('cell_lead')
    expect(localAccess(previewState('lider')).features).toContain('cell_lead')
  })

  test('lê a resposta do servidor: plano, limites, células e em que plano está cada função', () => {
    const a = accessFromServer({
      plan: 'essencial',
      features: ['prayer', 'chat'],
      min_plan: { sermon: 'completo' },
      status: 'canceled_active',
      chat: { limit: 5, used: 2, resets_at: '2026-10-13T03:00:00Z' },
      cells: { c1: { active: true, can_use: false } },
    })
    expect(a).toMatchObject({ plan: 'essencial', storeStatus: 'canceledActive', chat: { limit: 5, used: 2 }, cells: { c1: { active: true, canUse: false } } })
    expect(a.minPlan.sermon).toBe('completo')
    expect(a.minPlan.cell_lead).toBe('lider')
    expect(accessFromServer({ plan: 'qualquer' }).plan).toBe('free')
  })
})

describe('contador e avisos do teste', () => {
  test('contador no dia 2', async () => {
    await renderApp(<TrialBanner />, { onboarded: true, subscription: previewState('trialDay2') })
    await fireEvent.press(screen.getByRole('button', { name: 'Faltam 6 dias do seu teste. Ver planos' }))
    expect(router.push).toHaveBeenCalledWith('/assinatura')
  })

  test('último dia: contador e cartão no Hoje', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, subscription: previewState('lastDay') })
    expect(screen.getByRole('button', { name: 'Seu teste termina hoje à meia-noite. Ver planos' })).toBeTruthy()
    expect(screen.getByText(/A Bíblia continua grátis e nada do que você criou é apagado/)).toBeTruthy()
  })

  test('assinante não vê contador', async () => {
    await renderApp(<TrialBanner />, { onboarded: true, subscription: previewState('completo') })
    expect(screen.queryByText(/teste/)).toBeNull()
  })

  test('pagamento falhou aparece no Hoje com prazo', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, subscription: previewState('paymentFailed') })
    expect(screen.getByText('Pagamento falhou na renovação')).toBeTruthy()
    expect(screen.getByText(/Regularize na loja até/)).toBeTruthy()
  })
})

describe('tela de planos', () => {
  test('três planos, o anual vem marcado e com a economia', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    expect(screen.getByRole('tab', { name: 'Anual, mais barato' }).props.accessibilityState.selected).toBe(true)
    expect(screen.getByLabelText('Plano Essencial, R$ 109,90 por ano. Economize 38% no anual')).toBeTruthy()
    expect(screen.getByLabelText('Plano Completo, R$ 199,90 por ano. Economize 33% no anual')).toBeTruthy()
    expect(screen.getByLabelText('Plano Líder, R$ 399,90 por ano. Economize 33% no anual')).toBeTruthy()
    await fireEvent.press(screen.getByRole('tab', { name: 'Mensal' }))
    expect(screen.getByLabelText('Plano Essencial, R$ 14,90 por mês')).toBeTruthy()
    for (const l of ['Restaurar compra', 'Termos de Uso', 'Privacidade']) expect(screen.getByRole('button', { name: l })).toBeTruthy()
  })

  test('o plano escolhido é anunciado e muda o botão', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    const lider = screen.getByLabelText(/^Plano Líder/)
    await fireEvent.press(lider)
    expect(screen.getByLabelText(/^Plano Líder/).props.accessibilityState.checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Assinar Líder anual' })).toBeTruthy()
  })

  test('cancelar na folha da loja volta sem erro; confirmar leva à confirmação', async () => {
    jest.useFakeTimers()
    await renderApp(<PlansScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Assinar Completo anual' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/erro/i)).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Assinar Completo anual' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar assinatura' }))
    jest.advanceTimersByTime(1000)
    expect(router.replace).toHaveBeenCalledWith('/assinatura/confirmada')
  })

  test('restaurar sem compra avisa; com compra em outro aparelho, restaura', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar compra' }))
    expect(await screen.findByText('Nenhuma compra encontrada para restaurar')).toBeTruthy()
    simulateStorePurchase({ plan: 'completo', billing: 'monthly' })
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar compra' }))
    expect(await screen.findByText('Compra restaurada')).toBeTruthy()
  })
})

describe('bloqueio por função', () => {
  test('cadeado diz em que plano está e abre a tela de planos nesse plano', async () => {
    await renderApp(<PlanLockRow feature="sermon" label="Gravar culto" />, { onboarded: true, subscription: previewState('essencial') })
    await fireEvent.press(screen.getByRole('button', { name: 'Gravar culto. Bloqueado. No plano Completo' }))
    expect(router.push).toHaveBeenCalledWith('/assinatura?plano=completo&funcao=sermon&origem=cadeado')
  })

  test('tela de função fora do plano mostra o bloqueio', async () => {
    await renderApp(
      <FeatureGuard feature="cell_lead">
        <AppText>Criar célula</AppText>
      </FeatureGuard>,
      { onboarded: true, subscription: previewState('completo') },
    )
    expect(screen.getAllByText('Criar e conduzir célula').length).toBeGreaterThan(0)
    expect(screen.getByText(/No plano Líder/)).toBeTruthy()
    expect(screen.getByText('O que você já criou continua guardado. A Bíblia continua grátis.')).toBeTruthy()
    expect(screen.queryByText('Criar célula')).toBeNull()
  })

  test('no plano certo, a tela abre', async () => {
    await renderApp(
      <FeatureGuard feature="cell_lead">
        <AppText>Criar célula</AppText>
      </FeatureGuard>,
      { onboarded: true, subscription: previewState('lider') },
    )
    expect(screen.getByText('Criar célula')).toBeTruthy()
  })

  test('dia 8: a tela de planos traz o botão para seguir só com a Bíblia', async () => {
    const params = jest.mocked(require('expo-router').useLocalSearchParams)
    params.mockReturnValue({ fim: '1' })
    try {
      await renderApp(<PlansScreen />, { onboarded: true, subscription: previewState('free') })
      expect(screen.getByText('Seu teste terminou')).toBeTruthy()
      await fireEvent.press(screen.getByRole('button', { name: 'Agora não, seguir só com a Bíblia' }))
      expect(router.replace).toHaveBeenCalledWith('/')
    } finally {
      params.mockReturnValue({})
    }
  })
})

describe('meu plano', () => {
  test('ativa: plano, valor, próxima cobrança, limites e gerenciar na loja', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('completo') })
    expect(screen.getByText('Completo, mensal')).toBeTruthy()
    expect(screen.getByLabelText(/^Próxima cobrança:/)).toBeTruthy()
    expect(screen.getByLabelText('Chat bíblico: 10 perguntas por dia')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Gerenciar assinatura' }))
    expect(open).toHaveBeenCalled()
  })

  test('cancelada e ainda ativa', async () => {
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('canceledActive') })
    expect(screen.getByText('Sua assinatura foi cancelada, mas continua ativa até o fim do período pago.')).toBeTruthy()
    expect(screen.getByLabelText(/^Acesso até:/)).toBeTruthy()
  })

  test('no teste: dias que faltam', async () => {
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('trialDay2') })
    expect(screen.getByText(/Faltam 6 dias/)).toBeTruthy()
  })

  test('sem plano: a Bíblia continua e o que foi criado fica para leitura', async () => {
    await renderApp(<MyPlanScreen />, { onboarded: true, subscription: previewState('free') })
    expect(screen.getByText('Grátis, só a Bíblia')).toBeTruthy()
    expect(screen.getByText('A Bíblia continua grátis. O que você criou continua guardado, só para leitura.')).toBeTruthy()
  })
})

describe('correções da revisão de segurança', () => {
  test('sem plano: o chat continua mostrando as conversas, só a pergunta fica com cadeado', async () => {
    const { ChatScreen } = require('../src/features/chat/screens/ChatScreen')
    await renderApp(<ChatScreen />, { onboarded: true, subscription: previewState('free') })
    expect(screen.getByRole('button', { name: 'Fazer uma pergunta. Bloqueado. No plano Essencial' })).toBeTruthy()
    expect(screen.queryByLabelText('Sua pergunta sobre a Bíblia')).toBeNull()
    expect(screen.getByText(/CVV, telefone 188/)).toBeTruthy()
  })

  test('assinante do Completo mensal consegue passar para o anual', async () => {
    await renderApp(<PlansScreen />, { onboarded: true, subscription: previewState('completo') })
    expect(screen.getByRole('button', { name: 'Trocar para o anual' })).toBeTruthy()
    await fireEvent.press(screen.getByRole('tab', { name: 'Mensal' }))
    expect(screen.getByRole('button', { name: 'Este é o seu plano' })).toBeDisabled()
  })

  test('último dia do teste diz que termina hoje à meia-noite', async () => {
    await renderApp(<TrialBanner />, { onboarded: true, subscription: previewState('lastDay') })
    expect(screen.getByRole('button', { name: 'Seu teste termina hoje à meia-noite. Ver planos' })).toBeTruthy()
  })
})
