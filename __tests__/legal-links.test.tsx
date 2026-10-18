import { fireEvent, screen } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { LegalTextScreen } from '../src/features/onboarding/screens/LegalTextScreen'
import { HelpScreen } from '../src/features/settings/screens/SettingsScreens'
import { LEGAL_URLS } from '../src/lib/legal'
import { renderApp } from '../test-utils/render'

const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
beforeEach(() => open.mockClear())

test('os links levam aos textos completos no site do acasa', () => {
  expect(LEGAL_URLS.terms).toBe('https://www.acasa.app.br/termos')
  expect(LEGAL_URLS.privacy).toBe('https://www.acasa.app.br/privacidade')
})

test('o resumo dos termos abre os termos e a privacidade completos', async () => {
  await renderApp(<LegalTextScreen kind="terms" />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Ler os Termos de uso completos' }))
  expect(open).toHaveBeenCalledWith(LEGAL_URLS.terms)
  await fireEvent.press(screen.getByRole('button', { name: 'Ler a Política de privacidade' }))
  expect(open).toHaveBeenCalledWith(LEGAL_URLS.privacy)
})

test('o texto do consentimento diz exatamente o que depende dele', async () => {
  await renderApp(<LegalTextScreen kind="faith" />, { onboarded: true })
  expect(screen.getByText(/diário de oração, os seus pedidos de oração, o histórico do chat bíblico/)).toBeTruthy()
})

test('em Ajuda, a Política de privacidade abre o site', async () => {
  await renderApp(<HelpScreen />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: /Política de privacidade/ }))
  expect(open).toHaveBeenCalledWith(LEGAL_URLS.privacy)
})
