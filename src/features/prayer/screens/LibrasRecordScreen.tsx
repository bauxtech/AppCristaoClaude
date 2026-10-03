import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import { AppText, Button } from '../../../components'
import { Icon } from '../../../components/Icon'
import { formatDuration } from '../../../lib/date'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { usePrayer } from '../PrayerContext'
import { PrayerPage } from './parts'

const MAX_SECONDS = 120

/** Gravar o pedido em vídeo, em Libras. Sem som: só a imagem importa. */
export function LibrasRecordScreen() {
  const { colors } = useTheme()
  const prayer = usePrayer()
  const [permission, requestPermission] = useCameraPermissions()
  const camera = useRef<CameraView>(null)
  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    return () => clearInterval(t)
  }, [recording])

  async function start() {
    if (!camera.current) return
    setError(null)
    elapsedRef.current = 0
    setElapsed(0)
    setRecording(true)
    try {
      const video = await camera.current.recordAsync({ maxDuration: MAX_SECONDS })
      setRecording(false)
      if (video?.uri) {
        prayer.setDraftVideo({ uri: video.uri, seconds: elapsedRef.current })
        router.back()
      }
    } catch {
      setRecording(false)
      setError('Não foi possível gravar. Tente de novo.')
    }
  }

  function stop() {
    camera.current?.stopRecording()
  }

  if (!permission) return <PrayerPage title="Gravar em Libras">{null}</PrayerPage>

  if (!permission.granted) {
    return (
      <PrayerPage title="Gravar em Libras">
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <Icon name="video" size={40} color={colors.primary} />
          <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            Permita o uso da câmera
          </AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            A câmera grava o seu pedido em Libras. O vídeo fica no seu pedido e só vai para a célula se você compartilhar.
          </AppText>
        </View>
        {permission.canAskAgain ? (
          <Button label="Permitir câmera" onPress={requestPermission} />
        ) : (
          <Button label="Abrir ajustes do celular" onPress={() => Linking.openSettings()} />
        )}
        <Button label="Usar texto" variant="text" onPress={() => router.back()} />
      </PrayerPage>
    )
  }

  return (
    <PrayerPage title="Gravar em Libras">
      <View style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: '#000' }}>
        <CameraView ref={camera} style={{ flex: 1 }} facing="front" mode="video" mute onCameraReady={() => setReady(true)} accessibilityLabel="Visualização da câmera" />
        {recording ? (
          <View
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`Gravando, ${formatDuration(elapsed)}`}
            style={{ position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
            <AppText style={{ color: '#FFFFFF', fontFamily: fonts.semibold }}>{`Gravando ${formatDuration(elapsed)}`}</AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {`Até ${MAX_SECONDS / 60} minutos. O vídeo é gravado sem som.`}
      </AppText>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
      {recording ? (
        <Button label="Parar gravação" icon="stop" variant="danger" onPress={stop} />
      ) : (
        <Button label="Gravar pedido em vídeo" icon="video" disabled={!ready} onPress={start} />
      )}
      <Button label="Usar texto" variant="text" disabled={recording} onPress={() => router.back()} />
    </PrayerPage>
  )
}
