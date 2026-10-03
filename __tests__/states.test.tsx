import { act, fireEvent, screen } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import { Text } from 'react-native'
import { Button, ConnectionFrame, OFFLINE_TEXT } from '../src/components'
import { ChatScreen } from '../src/features/chat/screens/ChatScreen'
import { SearchChurchScreen } from '../src/features/church/screens/SearchScreens'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { useImagePicker } from '../src/lib/useImagePicker'
import { PlansScreen } from '../src/features/subscription/screens/SubscriptionScreens'
import { SYNC_MS, useConnection } from '../src/state/connection'
import { renderApp } from '../test-utils/render'

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file://foto.jpg' }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file://galeria.jpg' }] })),
}))

describe('sem internet', () => {
  test('faixa no topo e Sincronizando quando volta', async () => {
    jest.useFakeTimers()
    function Toggle() {
      const c = useConnection()
      return <Button label="Voltar a internet" onPress={() => c.setDemo(null)} />
    }
    await renderApp(
      <ConnectionFrame>
        <Toggle />
      </ConnectionFrame>,
      { onboarded: true, demo: 'offline' },
    )
    expect(screen.getByText(OFFLINE_TEXT)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar a internet' }))
    expect(screen.getByText('Sincronizando')).toBeTruthy()
    await act(async () => {
      jest.advanceTimersByTime(SYNC_MS + 100)
    })
    expect(screen.queryByText('Sincronizando')).toBeNull()
    jest.useRealTimers()
  })

  test('chat avisa que precisa de internet e mantém o histórico', async () => {
    await renderApp(<ChatScreen />, { onboarded: true, demo: 'offline' })
    expect(screen.getByText('O chat precisa de internet')).toBeTruthy()
    // O campo continua aberto: quem escreve sobre se machucar ainda vê o CVV.
    expect(screen.getByText(/CVV, telefone 188/)).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Sua pergunta sobre a Bíblia'), 'quero morrer')
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pergunta' }))
    expect(screen.getAllByText(/188/).length).toBeGreaterThan(1)
  })

  test('busca de igreja sem internet mostra erro com tentar de novo e cadastrar à mão', async () => {
    await renderApp(<SearchChurchScreen />, { onboarded: true, demo: 'offline' })
    await fireEvent.changeText(screen.getByLabelText('Nome, cidade ou CNPJ'), 'Batista')
    expect(screen.getByText('A busca precisa de internet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cadastrar à mão' })).toBeTruthy()
  })
})

describe('erro e carregando', () => {
  test('carregando mostra esqueleto no lugar da passagem', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, demo: 'loading' })
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0)
    expect(screen.queryByText('Passagem do dia')).toBeNull()
  })

  test('erro tem mensagem curta e Tentar de novo', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, demo: 'error' })
    expect(screen.getByText('Não foi possível carregar a passagem do dia.')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByText('Passagem do dia')).toBeTruthy()
  })
})

describe('modo simplificado', () => {
  test('o Hoje mostra menos cartões', async () => {
    await renderApp(<HomeScreen />, { onboarded: true, settings: { simple: true } })
    expect(screen.getByText('Passagem do dia')).toBeTruthy()
    expect(screen.queryByText('Música do dia')).toBeNull()
  })
})

describe('permissão da câmera', () => {
  function Picker() {
    const { pickImage, permissionSheet } = useImagePicker()
    return (
      <>
        <Button label="Tirar foto" onPress={() => void pickImage('camera', 'para a sua foto de perfil').then(setResult)} />
        <Text>{result}</Text>
        {permissionSheet}
      </>
    )
  }
  let result = ''
  const setResult = (v: string | null) => {
    result = v ?? 'nada'
  }

  test('explica antes do aviso do sistema', async () => {
    jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: true } as never)
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as never)
    await renderApp(<Picker />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }))
    expect(await screen.findByText(/A câmera é usada só para a sua foto de perfil/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    await act(async () => {})
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled()
    expect(result).toBe('file://foto.jpg')
  })

  test('negada mostra como ligar nos ajustes', async () => {
    jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never)
    await renderApp(<Picker />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }))
    expect(await screen.findByText('A câmera está desligada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Abrir ajustes do celular' })).toBeTruthy()
  })
})

describe('compra fora da prévia', () => {
  test('a folha de exemplo não libera o plano sem cobrança', async () => {
    await renderApp(<PlansScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Assinar' }))
    expect(screen.getByText('A compra pela loja ainda não está ligada neste app.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirmar assinatura' })).toBeDisabled()
  })
})
