import { act, fireEvent, screen } from '@testing-library/react-native'
import * as Updates from 'expo-updates'
import { UpdateBanner } from '../src/components'
import { currentVersionLabel } from '../src/lib/appUpdate'
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
