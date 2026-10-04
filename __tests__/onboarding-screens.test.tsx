import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { CodeScreen } from '../src/features/onboarding/screens/CodeScreen'
import { PhoneScreen } from '../src/features/onboarding/screens/PhoneScreen'
import { TermsScreen } from '../src/features/onboarding/screens/TermsScreen'
import { TraditionScreen } from '../src/features/onboarding/screens/TraditionScreen'
import { IntroScreen, INTRO_STEPS } from '../src/features/onboarding/screens/IntroScreen'
import { LoginScreen } from '../src/features/onboarding/screens/LoginScreen'
import { Splash } from '../src/features/onboarding/Splash'
import { PROGRESS_STEPS } from '../src/features/onboarding/data'
import { OnboardingProvider, useOnboarding } from '../src/features/onboarding/OnboardingContext'
import { act } from '@testing-library/react-native'
import { useEffect } from 'react'
import { CellStartScreen } from '../src/features/onboarding/screens/CellStartScreen'
import { renderApp } from '../test-utils/render'

beforeEach(() => jest.clearAllMocks())

describe('abertura', () => {
  test('splash mostra o nome e passa sozinho em 2 segundos', async () => {
    jest.useFakeTimers()
    const done = jest.fn()
    await renderApp(<Splash onDone={done} />)
    expect(screen.getByRole('header', { name: 'App Cristão' })).toBeTruthy()
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })
    expect(done).toHaveBeenCalled()
    jest.useRealTimers()
  })

  test('apresentação: 5 passos com título, texto e ilustração descrita', async () => {
    await renderApp(<IntroScreen />)
    expect(INTRO_STEPS).toHaveLength(5)
    expect(screen.getByText('Leia a Bíblia todo dia')).toBeTruthy()
    expect(screen.getByLabelText('Ilustração: uma Bíblia aberta e uma barra de progresso.')).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    expect(screen.getByRole('tab', { name: 'Passo 1 de 5: Leia a Bíblia todo dia' }).props.accessibilityState.selected).toBe(true)
    await fireEvent.press(screen.getByRole('tab', { name: 'Passo 3 de 5: Grave o culto e guarde o resumo' }))
    expect(screen.getByRole('tab', { name: 'Passo 3 de 5: Grave o culto e guarde o resumo' }).props.accessibilityState.selected).toBe(true)
  })

  test('Criar conta e Entrar abrem a tela de acesso com o título certo', async () => {
    function Both() {
      return (
        <>
          <IntroScreen />
          <LoginScreen />
        </>
      )
    }
    await renderApp(<Both />)
    expect(screen.getByRole('header', { name: 'Criar conta' })).toBeTruthy()
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar' })[0])
    expect(router.push).toHaveBeenCalledWith('/entrar')
    expect(screen.getAllByRole('header', { name: 'Entrar' }).length).toBeGreaterThan(0)
  })

  test('a tela de acesso não conta na barra do cadastro', () => {
    expect(PROGRESS_STEPS).toHaveLength(9)
    expect(PROGRESS_STEPS[0]).toBe('celular')
  })
})

test('entrar: quem já tem conta vai direto para o Hoje', async () => {
  function LoginMode() {
    const { setDraft } = useOnboarding()
    useEffect(() => setDraft({ mode: 'login', ddd: '11', number: '987654321' }), []) // eslint-disable-line react-hooks/exhaustive-deps
    return <CodeScreen />
  }
  await renderApp(<LoginMode />)
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '123456')
  await fireEvent.press(screen.getByRole('button', { name: 'Verificar' }))
  expect(router.replace).toHaveBeenCalledWith('/')
  expect(router.push).not.toHaveBeenCalledWith('/termos')
})

test('entrar: número sem conta oferece criar conta', async () => {
  function LoginMode() {
    const { setDraft } = useOnboarding()
    useEffect(() => setDraft({ mode: 'login', ddd: '21', number: '912345678' }), []) // eslint-disable-line react-hooks/exhaustive-deps
    return <CodeScreen />
  }
  await renderApp(<LoginMode />)
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '123456')
  await fireEvent.press(screen.getByRole('button', { name: 'Verificar' }))
  expect(screen.getByText('Não há conta com este número')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Criar conta com este número' }))
  expect(router.push).toHaveBeenCalledWith('/termos')
})

test('celular: número inválido mostra o erro em texto e não avança', async () => {
  await renderApp(<PhoneScreen />)
  await fireEvent.changeText(screen.getByLabelText('DDD'), '11')
  await fireEvent.changeText(screen.getByLabelText('Número'), '1234')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
  expect(screen.getByText(/Número de celular inválido/)).toBeTruthy()
  expect(router.push).not.toHaveBeenCalled()
})

test('celular: número válido segue para o código', async () => {
  await renderApp(<PhoneScreen />)
  await fireEvent.changeText(screen.getByLabelText('DDD'), '21')
  await fireEvent.changeText(screen.getByLabelText('Número'), '912345678')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
  expect(router.push).toHaveBeenCalledWith('/codigo')
})

test('código: errado mostra a mensagem; certo avança para os termos', async () => {
  await renderApp(<CodeScreen />)
  const input = screen.getByLabelText('Código de 6 números')
  await fireEvent.changeText(input, '999999')
  await fireEvent.press(screen.getByRole('button', { name: 'Verificar' }))
  expect(screen.getByText('Código incorreto. Confira e digite de novo.')).toBeTruthy()
  await fireEvent.changeText(input, '123456')
  await fireEvent.press(screen.getByRole('button', { name: 'Verificar' }))
  expect(router.push).toHaveBeenCalledWith('/termos')
})

test('código: reenviar bloqueia por 30 segundos', async () => {
  await renderApp(<CodeScreen />)
  await fireEvent.press(screen.getByRole('button', { name: 'Reenviar código' }))
  expect(screen.getByRole('button', { name: 'Reenviar código em 30s' })).toBeDisabled()
})

test('termos: sem marcar 18 anos, avisa que o app é para maiores de 18', async () => {
  await renderApp(<TermsScreen />)
  await fireEvent.press(screen.getByRole('checkbox', { name: /^Termos de Uso/ }))
  await fireEvent.press(screen.getByRole('checkbox', { name: /^Dados de fé/ }))
  await fireEvent.press(screen.getByRole('button', { name: 'Aceitar e continuar' }))
  expect(screen.getByText(/só para maiores de 18 anos/)).toBeTruthy()
  expect(router.push).not.toHaveBeenCalled()
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Tenho 18 anos ou mais' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Aceitar e continuar' }))
  expect(router.push).toHaveBeenCalledWith('/nome')
})

test('tradição: só a tradução de domínio público pode ser escolhida', async () => {
  await renderApp(<TraditionScreen />)
  expect(screen.getByRole('button', { name: 'Almeida' })).toBeSelected()
  expect(screen.queryByRole('button', { name: 'NVI' })).toBeNull()
  expect(screen.getByLabelText(/Em breve: NVI/)).toBeTruthy()
})

test('célula: código de convite inválido avisa; válido leva para aguardando aprovação', async () => {
  await renderApp(<CellStartScreen />)
  await fireEvent.press(screen.getByRole('radio', { name: /^Entrar por convite/ }))
  await fireEvent.changeText(screen.getByLabelText('Código do convite'), 'ZZZ999')
  await fireEvent.press(screen.getByRole('button', { name: 'Começar' }))
  expect(screen.getByText(/Código inválido ou vencido/)).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código do convite'), 'abc-123')
  await fireEvent.press(screen.getByRole('button', { name: 'Começar' }))
  expect(router.replace).toHaveBeenCalledWith('/aguardando-aprovacao')
})
