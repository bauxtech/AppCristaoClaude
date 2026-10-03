import * as ImagePicker from 'expo-image-picker'
import { useRef, useState } from 'react'
import { Linking } from 'react-native'
import { AppText, Button, Sheet } from '../components'

// Foto pela câmera ou pela galeria, com explicação antes do aviso do sistema
// e um painel para quando a câmera foi negada.
// A galeria usa o seletor do próprio sistema, que não pede permissão.

type Source = 'camera' | 'library'
type Options = ImagePicker.ImagePickerOptions

export function useImagePicker() {
  const [sheet, setSheet] = useState<null | { kind: 'explain' | 'denied'; purpose: string }>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  function ask(kind: 'explain' | 'denied', purpose: string) {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setSheet({ kind, purpose })
    })
  }

  function close(ok: boolean) {
    setSheet(null)
    resolver.current?.(ok)
    resolver.current = null
  }

  async function cameraAllowed(purpose: string) {
    const now = await ImagePicker.getCameraPermissionsAsync()
    if (now.granted) return true
    if (!now.canAskAgain) {
      await ask('denied', purpose)
      return false
    }
    if (!(await ask('explain', purpose))) return false
    const res = await ImagePicker.requestCameraPermissionsAsync()
    if (res.granted) return true
    await ask('denied', purpose)
    return false
  }

  /** Devolve o endereço da foto ou nulo quando a pessoa desiste. */
  async function pickImage(source: Source, purpose: string, options: Options = {}): Promise<string | null> {
    if (source === 'camera' && !(await cameraAllowed(purpose))) return null
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ...options })
    return !res.canceled && res.assets[0] ? res.assets[0].uri : null
  }

  const permissionSheet = (
    <Sheet visible={!!sheet} onClose={() => close(false)} title={sheet?.kind === 'denied' ? 'A câmera está desligada' : 'Usar a câmera'}>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
        {sheet?.kind === 'denied'
          ? `Para tirar a foto ${sheet.purpose}, permita a câmera nos ajustes do celular. Você também pode escolher uma foto da galeria.`
          : `A câmera é usada só ${sheet?.purpose ?? ''}. O celular vai pedir sua permissão em seguida.`}
      </AppText>
      {sheet?.kind === 'denied' ? (
        <>
          <Button label="Abrir ajustes do celular" onPress={() => (close(false), Linking.openSettings())} />
          <Button label="Agora não" variant="outline" onPress={() => close(false)} />
        </>
      ) : (
        <>
          <Button label="Continuar" onPress={() => close(true)} />
          <Button label="Agora não" variant="outline" onPress={() => close(false)} />
        </>
      )}
    </Sheet>
  )

  return { pickImage, permissionSheet }
}
