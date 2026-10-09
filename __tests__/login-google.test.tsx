import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { LoginScreen } from '../src/features/onboarding/screens/LoginScreen'
import { useOnboarding } from '../src/features/onboarding/OnboardingContext'
import { renderApp } from '../test-utils/render'

const mockSignIn = jest.fn()
const mockSignOutGoogle = jest.fn(async () => {})
const mockSignOutRemote = jest.fn(async () => {})
const mockLoad = jest.fn()

jest.mock('../src/lib/google', () => ({
  GOOGLE_READY: true,
  signInWithGoogle: () => mockSignIn(),
  signOutGoogle: () => mockSignOutGoogle(),
}))
jest.mock('../src/lib/supabase', () => ({ ...jest.requireActual('../src/lib/supabase'), signOutRemote: () => mockSignOutRemote() }))
jest.mock('../src/features/onboarding/useAccountLoader', () => ({ useAccountLoader: () => ({ load: mockLoad }) }))

function AsLogin() {
  const { draft, setDraft } = useOnboarding()
  useEffect(() => setDraft({ mode: 'login' }), [])
  return draft.mode === 'login' ? <LoginScreen /> : null
}

beforeEach(() => {
  mockSignIn.mockResolvedValue({ uid: 'u1', name: 'Ana', email: 'ana@exemplo.com' })
  mockLoad.mockResolvedValue('no_account')
})

describe('Entrar com Google sem conta', () => {
  test('avisa em vez de abrir o cadastro sozinho', async () => {
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Google' })[0])
    expect(await screen.findByText('Não achamos conta com esse Google')).toBeTruthy()
    expect(screen.getByText('Se você se cadastrou pelo celular, entre pelo celular.')).toBeTruthy()
    expect(router.push).not.toHaveBeenCalledWith('/termos')
  })

  test('Criar conta segue o cadastro', async () => {
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Google' })[0])
    await fireEvent.press(await screen.findByRole('button', { name: 'Criar conta com este Google' }))
    expect(router.push).toHaveBeenCalledWith('/termos')
  })

  test('Não criar conta desfaz o login do Google e do servidor', async () => {
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Google' })[0])
    await fireEvent.press(await screen.findByRole('button', { name: 'Não criar conta' }))
    expect(mockSignOutGoogle).toHaveBeenCalled()
    expect(mockSignOutRemote).toHaveBeenCalled()
    expect(screen.queryByText('Não achamos conta com esse Google')).toBeNull()
  })

  test('no Criar conta, Google sem conta segue direto para os termos', async () => {
    await renderApp(<LoginScreen />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Google' })[0])
    await screen.findByRole('header', { name: 'Criar conta' })
    expect(router.push).toHaveBeenCalledWith('/termos')
  })
})
