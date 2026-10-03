import {
  AudioQuality,
  IOSOutputFormat,
  requestNotificationPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio'
import { router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform, ScrollView, View } from 'react-native'
import { AppText, Button, Card, SectionLabel, Tag, TopBar, useToast } from '../../components'
import { Icon } from '../../components/Icon'
import { formatDuration } from '../../lib/date'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'
import { evaluateSession, formatMegabytes, type Heartbeat } from './evaluate'
import { deleteRecording, fileSize, loadSessions, saveSessions, type StoredSession } from './storage'

// Voz em AAC mono, 64 kbps: cerca de 29 MB por hora. Suficiente para transcrever uma pregação.
const OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
}

const HEARTBEAT_MS = 60_000

type Permission = 'unknown' | 'granted' | 'denied'

export function RecordingTestScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const recorder = useAudioRecorder(OPTIONS)
  const state = useAudioRecorderState(recorder, 500)
  const player = useAudioPlayer(null)
  const playerStatus = useAudioPlayerStatus(player)

  const [permission, setPermission] = useState<Permission>('unknown')
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)

  const startedAt = useRef<number | null>(null)
  const heartbeats = useRef<Heartbeat[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    setSessions(loadSessions())
    const sub = AppState.addEventListener('change', (s) => {
      appState.current = s
    })
    return () => {
      sub.remove()
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      setPermission('denied')
      return
    }
    setPermission('granted')
    // No Android 13 ou mais novo, o aviso fixo "Gravando" precisa da permissão de notificação.
    if (Platform.OS === 'android') await requestNotificationPermissionsAsync().catch(() => null)

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      allowsBackgroundRecording: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    })
    await recorder.prepareToRecordAsync()
    recorder.record()

    startedAt.current = Date.now()
    heartbeats.current = []
    timer.current = setInterval(() => {
      heartbeats.current.push({
        at: Date.now(),
        recordedMs: recorder.getStatus().durationMillis,
        appState: appState.current,
      })
    }, HEARTBEAT_MS)
  }, [recorder])

  const stop = useCallback(async () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    const recordedMs = recorder.getStatus().durationMillis
    await recorder.stop()
    await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false, shouldPlayInBackground: false })

    const uri = recorder.uri
    const session: StoredSession = {
      id: String(Date.now()),
      startedAt: startedAt.current ?? Date.now(),
      endedAt: Date.now(),
      recordedMs,
      sizeBytes: fileSize(uri),
      uri,
      platform: `${Platform.OS} ${String(Platform.Version)}`,
      heartbeats: heartbeats.current,
    }
    const next = [session, ...sessions]
    setSessions(next)
    saveSessions(next)
    startedAt.current = null
    toast('Gravação salva')
  }, [recorder, sessions, toast])

  const togglePlay = useCallback(
    (s: StoredSession) => {
      if (!s.uri) return
      if (playingId === s.id && playerStatus.playing) {
        player.pause()
        return
      }
      if (playingId !== s.id) {
        player.replace({ uri: s.uri })
        setPlayingId(s.id)
      }
      player.play()
    },
    [player, playerStatus.playing, playingId],
  )

  const remove = useCallback(
    (s: StoredSession) => {
      if (playingId === s.id) player.pause()
      deleteRecording(s.uri)
      const next = sessions.filter((x) => x.id !== s.id)
      setSessions(next)
      saveSessions(next)
      toast('Gravação apagada')
    },
    [player, playingId, sessions, toast],
  )

  const recording = state.isRecording

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Teste de gravação" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <Card>
          <SectionLabel>Como fazer</SectionLabel>
          {[
            'Toque em Gravar e permita o uso do microfone.',
            'Bloqueie a tela e deixe o celular parado por 60 minutos, perto de alguém falando ou de um vídeo tocando.',
            'Desbloqueie, volte para esta tela e toque em Parar.',
            'Veja o resultado abaixo e ouça o começo, o meio e o fim.',
          ].map((t, i) => (
            <AppText key={t} variant="body" style={{ marginBottom: 6 }}>
              {`${i + 1}. ${t}`}
            </AppText>
          ))}
        </Card>

        <Card style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel={recording ? 'Gravando' : 'Parado'}>
            <Icon name={recording ? 'mic' : 'stop'} size={18} color={recording ? colors.danger : colors.textSecondary} />
            <AppText variant="bodyStrong" style={{ color: recording ? colors.danger : colors.textSecondary }}>
              {recording ? 'Gravando' : 'Parado'}
            </AppText>
          </View>
          <AppText
            accessibilityLabel={`Tempo gravado: ${formatDuration(state.durationMillis / 1000)}`}
            style={{ fontFamily: fonts.semibold, fontSize: 44, lineHeight: 52, color: colors.text, fontVariant: ['tabular-nums'] }}
          >
            {formatDuration(state.durationMillis / 1000)}
          </AppText>
          {recording ? (
            <Button label="Parar" icon="stop" onPress={stop} style={{ alignSelf: 'stretch' }} />
          ) : (
            <Button label="Gravar" icon="mic" onPress={start} style={{ alignSelf: 'stretch' }} />
          )}
          {Platform.OS === 'android' && recording ? (
            <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
              Enquanto grava, o Android mostra um aviso fixo na barra de notificações. Ele precisa ficar lá.
            </AppText>
          ) : null}
        </Card>

        {permission === 'denied' ? (
          <Card>
            <AppText variant="bodyStrong" style={{ marginBottom: 4 }}>
              Microfone negado
            </AppText>
            <AppText variant="body" tone="secondary" style={{ marginBottom: 12 }}>
              Para gravar, libere o microfone para este app nos ajustes do celular.
            </AppText>
            <Button label="Abrir ajustes" variant="outline" onPress={() => Linking.openSettings()} />
          </Card>
        ) : null}

        <SectionLabel>Resultados</SectionLabel>
        {sessions.length === 0 ? (
          <AppText variant="body" tone="secondary">
            Nenhuma gravação ainda.
          </AppText>
        ) : (
          sessions.map((s) => {
            const r = evaluateSession(s)
            const isPlaying = playingId === s.id && playerStatus.playing
            return (
              <Card key={s.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {new Date(s.startedAt).toLocaleString('pt-BR')}
                  </AppText>
                  <Tag label={r.passed ? 'Passou' : 'Não passou'} tone={r.passed ? 'primary' : 'danger'} />
                </View>
                <AppText variant="body">{r.reason}</AppText>
                <AppText variant="small" tone="secondary">
                  {`Áudio gravado: ${formatDuration(r.recordedSeconds)}\nTempo de relógio: ${formatDuration(r.wallSeconds)}\nPerdido: ${formatDuration(r.lostSeconds)}\nMinutos com a tela bloqueada: ${r.backgroundMinutes}\nMaior intervalo sem anotação: ${formatDuration(r.longestGapSeconds)}\nArquivo: ${formatMegabytes(s.sizeBytes)}\nAparelho: ${s.platform}`}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label={isPlaying ? 'Pausar' : 'Ouvir'}
                    icon={isPlaying ? 'pause' : 'play'}
                    variant="soft"
                    size="sm"
                    onPress={() => togglePlay(s)}
                    disabled={!s.uri}
                    style={{ flex: 1 }}
                  />
                  <Button label="Apagar" variant="outline" size="sm" onPress={() => remove(s)} style={{ flex: 1 }} />
                </View>
              </Card>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}
