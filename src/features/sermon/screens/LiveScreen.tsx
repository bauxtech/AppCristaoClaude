import { setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio'
import { router, useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, ConfirmCard, MIN_TOUCH } from '../../../components'
import { Icon } from '../../../components/Icon'
import { formatDuration } from '../../../lib/date'
import { VOICE_RECORDING } from '../../../lib/recording'
import { palettes } from '../../../theme/colors'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts, size } from '../../../theme/typography'
import { useSermons } from '../SermonContext'

const ON_DARK = '#FFFFFF'
const SOFT = 'rgba(255,255,255,0.78)'

/** Tela da gravação: tempo, pausar, marcar momento, nota rápida. Voltar pede confirmação. */
export function LiveScreen() {
  const t = useTheme()
  const colors = { ...palettes[t.highContrast ? 'highContrastDark' : 'dark'], bg: t.colors.darkSurface }
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { draft, setDraft } = useSermons()
  const recorder = useAudioRecorder(VOICE_RECORDING)
  const state = useAudioRecorderState(recorder, 500)
  const [paused, setPaused] = useState(false)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<{ ts: number; text: string }[]>([])
  const [moments, setMoments] = useState<{ ts: number; label: string }[]>([])
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finishing = useRef(false)
  const secs = Math.floor((state.durationMillis ?? 0) / 1000)

  useEffect(() => {
    ;(async () => {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })
        await recorder.prepareToRecordAsync()
        recorder.record()
      } catch {
        setError('Não foi possível começar a gravar. Volte e tente de novo.')
      }
    })()
    return () => {
      if (!finishing.current) recorder.stop().catch(() => {})
      setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false, shouldPlayInBackground: false }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Voltar pelo gesto ou pelo botão do Android também pergunta antes de descartar.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (finishing.current) return
        e.preventDefault()
        setConfirm(true)
      }),
    [navigation],
  )

  async function finish() {
    finishing.current = true
    const duration = Math.floor(recorder.getStatus().durationMillis / 1000)
    await recorder.stop().catch(() => {})
    setDraft(draft ? { ...draft, uri: recorder.uri, durationSec: duration, notes, moments } : null)
    router.replace('/culto/ajustar')
  }

  function discard() {
    finishing.current = true
    recorder.stop().catch(() => {})
    setDraft(null)
    router.back()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" accessibilityLabel="Descartar gravação" style={{ width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={22} color={ON_DARK} strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} accessible accessibilityRole="timer" accessibilityLabel={`${paused ? 'Pausado' : 'Gravando'}, ${formatDuration(secs)}`}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: paused ? colors.accent : '#EF4444' }} />
          <AppText style={{ color: ON_DARK, fontFamily: fonts.semibold }}>{`${paused ? 'Pausado' : 'Gravando'} ${formatDuration(secs)}`}</AppText>
        </View>
        <Pressable
          onPress={() => {
            if (paused) recorder.record()
            else recorder.pause()
            setPaused(!paused)
          }}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Retomar' : 'Pausar'}
          style={{ minHeight: MIN_TOUCH, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center' }}
        >
          <AppText style={{ color: ON_DARK, fontFamily: fonts.semibold, fontSize: size.small }}>{paused ? 'Retomar' : 'Pausar'}</AppText>
        </Pressable>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Encerrar gravação" style={{ minHeight: MIN_TOUCH, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.primary, justifyContent: 'center' }}>
          <AppText style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: size.small }}>Encerrar</AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {confirm ? (
          <ConfirmCard title="Descartar gravação?" message="O áudio gravado até agora será perdido." confirmLabel="Descartar" onCancel={() => setConfirm(false)} onConfirm={discard} />
        ) : null}
        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
        <View style={{ borderRadius: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.08)', gap: 6 }}>
          <AppText style={{ color: SOFT, fontSize: size.small }}>Legenda ao vivo</AppText>
          <AppText style={{ color: ON_DARK }}>A legenda ao vivo e os versículos citados aparecem aqui quando a transcrição estiver ligada ao servidor. O áudio está sendo gravado.</AppText>
        </View>
        {[...moments.map((m) => ({ ts: m.ts, text: m.label, kind: 'Momento marcado' })), ...notes.map((n) => ({ ts: n.ts, text: n.text, kind: 'Nota' }))]
          .sort((a, b) => a.ts - b.ts)
          .map((x, i) => (
            <View key={i} style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <AppText style={{ color: SOFT, fontSize: size.small }}>{`${x.kind} · ${formatDuration(x.ts)}`}</AppText>
              <AppText style={{ color: ON_DARK }}>{x.text}</AppText>
            </View>
          ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Nota rápida"
          placeholderTextColor={SOFT}
          accessibilityLabel="Nota rápida"
          returnKeyType="send"
          onSubmitEditing={() => {
            if (!note.trim()) return
            setNotes((x) => [...x, { ts: secs, text: note.trim() }])
            setNote('')
          }}
          style={{ flex: 1, minHeight: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.1)', color: ON_DARK, fontFamily: fonts.regular, fontSize: size.body }}
        />
        <Pressable
          onPress={() => setMoments((x) => [...x, { ts: secs, label: 'Momento marcado' }])}
          accessibilityRole="button"
          accessibilityLabel="Marcar este momento"
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="star" size={22} color={colors.primaryText} />
        </Pressable>
      </View>
    </View>
  )
}
