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
const mockApple = jest.fn()
jest.mock('../src/lib/apple', () => ({ APPLE_READY: true, signInWithApple: () => mockApple() }))
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
  mockApple.mockResolvedValue({ uid: 'u2', name: 'Bia', email: 'x@privaterelay.appleid.com' })
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

describe('Entrar com Apple', () => {
  test('sem conta: avisa com o texto da Apple e não desfaz o Google', async () => {
    mockSignOutGoogle.mockClear()
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Apple' })[0])
    expect(await screen.findByText('Não achamos conta com essa Apple ID')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Não criar conta' }))
    expect(mockSignOutGoogle).not.toHaveBeenCalled()
    expect(mockSignOutRemote).toHaveBeenCalled()
  })

  test('Criar conta com esta Apple ID segue o cadastro', async () => {
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Apple' })[0])
    await fireEvent.press(await screen.findByRole('button', { name: 'Criar conta com esta Apple ID' }))
    expect(router.push).toHaveBeenCalledWith('/termos')
  })

  test('com conta: abre a conta com o nome que a Apple mandou', async () => {
    mockLoad.mockResolvedValue('ok')
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Apple' })[0])
    expect(mockLoad).toHaveBeenCalledWith('u2', { name: 'Bia', email: 'x@privaterelay.appleid.com' })
  })

  test('falha: avisa que não deu para entrar com a Apple', async () => {
    mockApple.mockResolvedValue('failed')
    await renderApp(<AsLogin />)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Entrar com Apple' })[0])
    expect(await screen.findByText('Não foi possível entrar com a Apple. Tente de novo.')).toBeTruthy()
  })
})
