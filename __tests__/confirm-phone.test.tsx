import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import * as supa from '../src/lib/supabase'
import { ConfirmPhoneScreen } from '../src/features/subscription/screens/SubscriptionScreens'
import { renderApp } from '../test-utils/render'

describe('por que o código do celular não saiu', () => {
  test('número que já é de outra conta, excesso de pedidos e falha geral', () => {
    expect(supa.phoneCodeProblem({ code: 'phone_exists', status: 422, message: 'Phone number already registered' })).toBe('exists')
    expect(supa.phoneCodeProblem({ status: 422, message: 'A user with this phone number has already been registered' })).toBe('exists')
    expect(supa.phoneCodeProblem({ code: 'over_sms_send_rate_limit', status: 429, message: 'Too many requests' })).toBe('wait')
    expect(supa.phoneCodeProblem(new Error('network'))).toBe('failed')
  })
})

describe('confirmar celular para o teste', () => {
  afterEach(() => jest.restoreAllMocks())

  test('número de uma conta que já existe: explica e leva para sair e entrar pelo celular', async () => {
    jest.spyOn(supa, 'sendPhoneChangeCode').mockRejectedValue({ code: 'phone_exists', status: 422, message: 'Phone number already registered' })
    await renderApp(<ConfirmPhoneScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Celular com DDD'), '71999992011')
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText(/Este número já tem uma conta no acasa/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Sair e entrar pelo celular' }))
    expect(router.push).toHaveBeenCalledWith('/configuracoes/sair')
  })

  test('outra falha não sugere sair da conta', async () => {
    jest.spyOn(supa, 'sendPhoneChangeCode').mockRejectedValue(new Error('network'))
    await renderApp(<ConfirmPhoneScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Celular com DDD'), '71999992011')
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText(/Não foi possível enviar o código agora/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sair e entrar pelo celular' })).toBeNull()
  })
})
