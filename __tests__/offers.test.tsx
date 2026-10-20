import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Text } from 'react-native'
import { NameScreen } from '../src/features/onboarding/screens/NameScreen'
import { isValidEmail } from '../src/features/onboarding/validation'
import { NotificationSettingsScreen } from '../src/features/settings/screens/NoticeScreens'
import { useSettings } from '../src/features/settings/SettingsContext'
import { openPlans } from '../src/features/subscription/PlanLock'
import { paywallSource } from '../src/features/subscription/paywallLog'
import { PlansScreen } from '../src/features/subscription/screens/SubscriptionScreens'
import { CellHubScreen } from '../src/features/cell/screens/CellHubScreen'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)

beforeEach(() => {
  jest.mocked(router.push).mockClear()
  params.mockReturnValue({})
})

/** Mostra as autorizações de ofertas guardadas, para conferir o que a tela gravou. */
function OffersProbe() {
  const s = useSettings()
  return <Text testID="offers">{JSON.stringify(s.offers)}</Text>
}

describe('frase da função na tela de planos', () => {
  test('o cadeado abre a tela de planos dizendo a função, o plano e a origem', () => {
    openPlans('sermon', 'completo')
    expect(router.push).toHaveBeenCalledWith('/assinatura?plano=completo&funcao=sermon&origem=cadeado')
  })

  test('a tela mostra o que a pessoa tentou fazer', async () => {
    params.mockReturnValue({ plano: 'completo', funcao: 'sermon', origem: 'cadeado' })
    await renderApp(<PlansScreen />, { onboarded: true })
    expect(screen.getByText('Para gravar e transcrever o culto, escolha o plano Completo.')).toBeTruthy()
  })

  test('função desconhecida no link não aparece', async () => {
    params.mockReturnValue({ plano: 'completo', funcao: 'qualquer' })
    await renderApp(<PlansScreen />, { onboarded: true })
    expect(screen.queryByText(/^Para /)).toBeNull()
  })

  test('origem: a que veio no link, o fim do teste, o cadeado ou outro caminho', () => {
    expect(paywallSource({ origem: 'regua-10' })).toBe('regua-10')
    expect(paywallSource({ origem: 'Não vale!' })).toBe('outro')
    expect(paywallSource({ fim: '1' })).toBe('fim-do-teste')
    expect(paywallSource({ funcao: 'chat' })).toBe('cadeado')
    expect(paywallSource({})).toBe('outro')
  })
})

describe('ofertas e novidades', () => {
  test('no cadastro, desligadas por padrão; marcar liga no celular e, com e-mail, por e-mail', async () => {
    await renderApp(
      <>
        <NameScreen />
        <OffersProbe />
      </>,
    )
    expect(screen.getByRole('checkbox', { name: /Ofertas e novidades/ }).props.accessibilityState.checked).toBe(false)
    await fireEvent.changeText(screen.getByLabelText('Seu e-mail (opcional)'), 'maria@exemplo.com')
    await fireEvent.press(screen.getByRole('checkbox', { name: /Ofertas e novidades/ }))
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(JSON.parse(screen.getByTestId('offers').props.children)).toEqual({ push: true, email: true })
    expect(router.push).toHaveBeenCalledWith('/objetivo')
  })

  test('sem marcar, nada é ligado', async () => {
    await renderApp(
      <>
        <NameScreen />
        <OffersProbe />
      </>,
    )
    await fireEvent.changeText(screen.getByLabelText('Seu e-mail (opcional)'), 'maria@exemplo.com')
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(JSON.parse(screen.getByTestId('offers').props.children)).toEqual({ push: false, email: false })
  })

  test('e-mail errado não deixa seguir e explica', async () => {
    await renderApp(<NameScreen />)
    await fireEvent.changeText(screen.getByLabelText('Seu e-mail (opcional)'), 'maria@')
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Digite um e-mail válido/)).toBeTruthy()
    expect(router.push).not.toHaveBeenCalled()
    expect(isValidEmail('maria@exemplo.com')).toBe(true)
  })

  test('nos avisos: no celular liga direto; por e-mail pede o e-mail antes', async () => {
    await renderApp(
      <>
        <NotificationSettingsScreen />
        <OffersProbe />
      </>,
      { onboarded: true, settings: {} },
    )
    expect(screen.getByRole('switch', { name: 'Ofertas no celular' }).props.accessibilityState.checked).toBe(false)
    expect(screen.getByRole('switch', { name: 'Ofertas por e-mail' }).props.accessibilityState.disabled).toBe(true)
    await fireEvent.press(screen.getByRole('switch', { name: 'Ofertas no celular' }))
    await fireEvent.changeText(screen.getByLabelText('Seu e-mail'), 'joao@exemplo.com')
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar e receber por e-mail' }))
    expect(JSON.parse(screen.getByTestId('offers').props.children)).toEqual({ push: true, email: true })
    expect(screen.getByRole('switch', { name: 'Ofertas por e-mail' }).props.accessibilityState.checked).toBe(true)
  })
})

describe('entrada pela página da célula', () => {
  test('enquanto o líder aprova, mostra o que o teste grátis libera', async () => {
    await renderApp(<CellHubScreen />, { onboarded: true, cellStatus: 'pending', sampleData: false })
    expect(screen.getByText(/Seu teste grátis está valendo/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Ver os planos' }))
    expect(router.push).toHaveBeenCalledWith('/assinatura?origem=entrada-celula')
  })
})
