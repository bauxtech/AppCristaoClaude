import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { CodeScreen } from '../src/features/onboarding/screens/CodeScreen'
import { PhoneScreen } from '../src/features/onboarding/screens/PhoneScreen'
import { TermsScreen } from '../src/features/onboarding/screens/TermsScreen'
import { TraditionScreen } from '../src/features/onboarding/screens/TraditionScreen'
import { WelcomeScreen } from '../src/features/onboarding/screens/WelcomeScreen'
import { CellStartScreen } from '../src/features/onboarding/screens/CellStartScreen'
import { renderApp } from '../test-utils/render'

beforeEach(() => jest.clearAllMocks())

test('boas-vindas: opções de acessibilidade são caixas marcáveis com nome', async () => {
  await renderApp(<WelcomeScreen />)
  const large = screen.getByRole('checkbox', { name: 'Fonte grande' })
  expect(large).not.toBeChecked()
  await fireEvent.press(large)
  expect(screen.getByRole('checkbox', { name: 'Fonte grande' })).toBeChecked()
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
