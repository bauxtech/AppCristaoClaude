import { act, fireEvent, screen } from '@testing-library/react-native'
import * as Updates from 'expo-updates'
import { UpdateBanner } from '../src/components'
import { currentVersionLabel } from '../src/lib/appUpdate'
import { SettingsHome } from '../src/features/settings/screens/SettingsScreens'
import { renderApp } from '../test-utils/render'

jest.mock('expo-updates', () => ({ isEnabled: true, isEmbeddedLaunch: false, createdAt: null, checkForUpdateAsync: jest.fn(), fetchUpdateAsync: jest.fn(), reloadAsync: jest.fn(() => Promise.resolve()) }))

describe('versão nova do app', () => {
  test('com versão nova baixada, mostra a faixa e reinicia ao tocar', async () => {
    await renderApp(<UpdateBanner check={() => Promise.resolve(true)} />, { onboarded: true })
    await act(async () => {})
    expect(screen.getByText('Nova versão do acasa pronta')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar agora' }))
    expect(Updates.reloadAsync).toHaveBeenCalled()
  })

  test('sem versão nova, nada aparece', async () => {
    await renderApp(<UpdateBanner check={() => Promise.resolve(false)} />, { onboarded: true })
    await act(async () => {})
    expect(screen.queryByText('Nova versão do acasa pronta')).toBeNull()
  })

  test('diz qual versão está no celular', () => {
    expect(currentVersionLabel(new Date(2026, 9, 19, 22, 5), false)).toBe('atualização de 19/10, 22:05')
    expect(currentVersionLabel(null, true)).toBe('versão do APK')
  })
})

describe('procurar atualização nas Configurações', () => {
  // No teste o app roda como desenvolvimento, onde a atualização fica desligada.
  const g = global as unknown as { __DEV__: boolean }
  beforeEach(() => void (g.__DEV__ = false))
  afterEach(() => void (g.__DEV__ = true))

  test('sem versão nova, diz que já está na mais nova', async () => {
    ;(Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({ isAvailable: false })
    await renderApp(<SettingsHome />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Procurar atualização' }))
    expect(await screen.findByText('Você já está na versão mais nova.')).toBeTruthy()
  })

  test('com versão nova, baixa e oferece atualizar', async () => {
    ;(Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({ isAvailable: true })
    ;(Updates.fetchUpdateAsync as jest.Mock).mockResolvedValueOnce({ isNew: true })
    await renderApp(<SettingsHome />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Procurar atualização' }))
    await fireEvent.press(await screen.findByRole('button', { name: 'Atualizar agora' }))
    expect(Updates.reloadAsync).toHaveBeenCalled()
  })

  test('com erro, mostra o motivo', async () => {
    ;(Updates.checkForUpdateAsync as jest.Mock).mockRejectedValueOnce(new Error('sem internet'))
    await renderApp(<SettingsHome />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Procurar atualização' }))
    expect(await screen.findByText('Não deu para procurar: sem internet')).toBeTruthy()
  })
})
