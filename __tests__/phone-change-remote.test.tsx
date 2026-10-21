import { fireEvent, screen } from '@testing-library/react-native'
import { AccountScreen } from '../src/features/settings/screens/SettingsScreens'
import { renderApp } from '../test-utils/render'

const mockSend = jest.fn()
const mockVerify = jest.fn()
jest.mock('../src/lib/supabase', () => ({
  ...jest.requireActual('../src/lib/supabase'),
  IS_REMOTE: true,
  sendPhoneChangeCode: (p: string) => mockSend(p),
  verifyPhoneChange: (p: string, c: string) => mockVerify(p, c),
}))

beforeEach(() => jest.clearAllMocks())

async function openCode() {
  await renderApp(<AccountScreen />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Trocar número' }))
  await fireEvent.changeText(screen.getByLabelText('DDD'), '21')
  await fireEvent.changeText(screen.getByLabelText('Celular'), '988887777')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
}

describe('trocar número com o servidor', () => {
  test('o SMS sai pelo servidor e o código de exemplo não vale', async () => {
    mockSend.mockResolvedValue(undefined)
    mockVerify.mockRejectedValueOnce(new Error('token inválido'))
    await openCode()
    expect(mockSend).toHaveBeenCalledWith('+5521988887777')
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '123456')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Código errado ou vencido. Tente de novo.')).toBeTruthy()
    expect(screen.queryByText('Número atualizado')).toBeNull()
  })

  test('código certo no servidor troca o número', async () => {
    mockSend.mockResolvedValue(undefined)
    mockVerify.mockResolvedValue(undefined)
    await openCode()
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '482913')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(mockVerify).toHaveBeenCalledWith('+5521988887777', '482913')
    expect((await screen.findAllByText('Número atualizado')).length).toBeGreaterThan(0)
  })

  test('número que já tem conta: não avança e explica', async () => {
    mockSend.mockRejectedValue({ code: 'phone_exists', status: 422, message: 'Phone number already registered' })
    await openCode()
    expect(await screen.findByText(/Este número já é de outra conta no acasa. Use outro número./)).toBeTruthy()
    expect(screen.queryByLabelText('Código de 6 números')).toBeNull()
  })
})
