import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { router } from 'expo-router'
import { ErrorState } from '../src/components'
import { REPORT_EMAIL, ReportScreen } from '../src/features/settings/screens/ReportScreen'
import { renderApp } from '../test-utils/render'

test('sem texto, não envia; com texto, abre o e-mail para a equipe (sem servidor)', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
  await renderApp(<ReportScreen />, { onboarded: true })
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  await fireEvent.changeText(screen.getByLabelText('O que aconteceu?'), 'O áudio não começou')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(open).toHaveBeenCalled())
  expect(String(open.mock.calls[0][0])).toContain(`mailto:${REPORT_EMAIL}`)
  expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain('O áudio não começou')
})

test('a tela de erro tem o atalho para reportar', async () => {
  await renderApp(<ErrorState onRetry={() => {}} />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Reportar um problema' }))
  expect(router.push).toHaveBeenCalledWith({ pathname: '/configuracoes/reportar', params: { tela: '/' } })
})
