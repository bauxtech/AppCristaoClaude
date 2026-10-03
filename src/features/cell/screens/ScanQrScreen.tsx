import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import { AppText, Button, Page } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { checkInviteCode, codeFromQr } from '../join'

export function ScanQrScreen() {
  const { colors } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  if (!permission) return <Page title="Ler QR code">{null}</Page>

  if (!permission.granted) {
    return (
      <Page title="Ler QR code">
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <Icon name="qr" size={40} color={colors.primary} />
          <AppText variant="title" style={{ textAlign: 'center' }}>
            Permita o uso da câmera
          </AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            A câmera lê o QR code que o líder mostrar.
          </AppText>
        </View>
        {permission.canAskAgain ? <Button label="Permitir câmera" onPress={requestPermission} /> : <Button label="Abrir ajustes do celular" onPress={() => Linking.openSettings()} />}
        <Button label="Digitar o código" variant="text" onPress={() => router.back()} />
      </Page>
    )
  }

  return (
    <Page title="Ler QR code">
      <View style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          accessibilityLabel="Câmera apontada para o QR code"
          onBarcodeScanned={({ data }) => {
            if (handled.current) return
            const code = codeFromQr(data)
            if (!code || checkInviteCode(code) !== 'ok') {
              setError('Este QR code não é de uma célula válida.')
              return
            }
            handled.current = true
            router.replace({ pathname: '/celula/confirmar', params: { codigo: code } })
          }}
        />
      </View>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
        Aponte a câmera para o QR code do líder.
      </AppText>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
      <Button label="Digitar o código" variant="text" onPress={() => router.back()} />
    </Page>
  )
}
