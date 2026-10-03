import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, EmptyState, Page, ProgressBar, SectionLabel, TapCard, TextField, useToast } from '../../../components'
import { formatDuration } from '../../../lib/date'
import { useTheme } from '../../../theme/ThemeProvider'
import { formatMeetingDay } from '../../cell/meetings'
import { brToISO, formatBR, maskDate } from '../../prayer/dates'
import { searchSermons } from '../data'
import { useSermons } from '../SermonContext'

function useSermon() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { sermons } = useSermons()
  return sermons.find((s) => s.id === id)
}

export function EditDataScreen() {
  const toast = useToast()
  const s = useSermon()
  const { update } = useSermons()
  const [church, setChurch] = useState(s?.church ?? '')
  const [preacher, setPreacher] = useState(s?.preacher ?? '')
  const [theme, setTheme] = useState(s?.theme ?? '')
  const [date, setDate] = useState(s ? formatBR(s.date) : '')
  const [error, setError] = useState<string | undefined>()
  if (!s) return <Page title="Dados do culto"><EmptyState text="Este culto foi excluído." /></Page>
  return (
    <Page title="Dados do culto">
      <TextField label="Igreja" value={church} onChangeText={setChurch} maxLength={100} />
      <TextField label="Pregador" value={preacher} onChangeText={setPreacher} maxLength={80} />
      <TextField label="Tema" value={theme} onChangeText={setTheme} maxLength={100} />
      <TextField label="Data" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <Button
        label="Salvar"
        onPress={() => {
          const iso = brToISO(date)
          if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
          update(s.id, { church: church.trim(), preacher: preacher.trim(), theme: theme.trim(), date: iso })
          toast('Dados salvos')
          router.back()
        }}
      />
    </Page>
  )
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

/** Ouvir de novo, pulando para os momentos marcados. */
export function PlayerScreen() {
  const { colors } = useTheme()
  const s = useSermon()
  const player = useAudioPlayer(s?.audioUri ?? null)
  const status = useAudioPlayerStatus(player)
  const [speed, setSpeed] = useState(1)
  if (!s || !s.audioUri) return <Page title="Ouvir"><EmptyState text="O áudio deste culto não está mais guardado. O texto continua no resultado." /></Page>
  const dur = status.duration || s.durationSec
  return (
    <Page title="Ouvir gravação">
      <Card style={{ gap: 12, alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <AppText variant="bodyStrong">{s.theme || 'Culto'}</AppText>
        <AppText variant="small" tone="secondary">{`${formatDuration(status.currentTime)} de ${formatDuration(dur)}`}</AppText>
        <View style={{ alignSelf: 'stretch' }}>
          <ProgressBar value={status.currentTime} max={dur || 1} label={`${formatDuration(status.currentTime)} de ${formatDuration(dur)}`} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="Voltar 15 segundos" variant="outline" size="sm" onPress={() => player.seekTo(Math.max(0, status.currentTime - 15))} />
          <Button label={status.playing ? 'Pausar' : 'Tocar'} icon={status.playing ? 'pause' : 'play'} size="sm" onPress={() => (status.playing ? player.pause() : player.play())} />
          <Button label="Avançar 15 segundos" variant="outline" size="sm" onPress={() => player.seekTo(status.currentTime + 15)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }} accessibilityRole="radiogroup" accessibilityLabel="Velocidade">
          {SPEEDS.map((v) => (
            <Chip
              key={v}
              label={`${String(v).replace('.', ',')}x`}
              selected={speed === v}
              onPress={() => {
                setSpeed(v)
                player.setPlaybackRate(v)
              }}
            />
          ))}
        </View>
      </Card>
      <Card style={{ gap: 4 }}>
        <SectionLabel>Momentos marcados</SectionLabel>
        {s.moments.length === 0 ? <AppText variant="body" tone="secondary">Nenhum momento marcado.</AppText> : null}
        {s.moments.map((m, i) => (
          <Pressable
            key={i}
            onPress={() => {
              player.seekTo(Math.max(0, m.ts - s.trim.start))
              player.play()
            }}
            accessibilityRole="button"
            accessibilityLabel={`Ouvir a partir de ${formatDuration(m.ts)}, ${m.label}`}
            style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <AppText variant="small" tone="brand">
              {formatDuration(m.ts)}
            </AppText>
            <AppText variant="body">{m.label}</AppText>
          </Pressable>
        ))}
      </Card>
    </Page>
  )
}

export function SearchSermonsScreen() {
  const { sermons } = useSermons()
  const [q, setQ] = useState('')
  const results = searchSermons(sermons, q)
  return (
    <Page title="Buscar nos cultos">
      <TextField label="Palavra, tema ou pregador" value={q} onChangeText={setQ} placeholder="Ex.: perdão" autoFocus autoCorrect={false} />
      {q.trim().length >= 2 && results.length === 0 ? <EmptyState text={`Nenhum culto com "${q.trim()}".`} /> : null}
      {results.map(({ sermon, snippet }) => (
        <TapCard key={sermon.id} label={`${sermon.theme}, ${formatMeetingDay(sermon.date)}. ${snippet}`} onPress={() => router.push({ pathname: '/culto/[id]', params: { id: sermon.id } })}>
          <AppText variant="small" tone="secondary">
            {formatMeetingDay(sermon.date)}
          </AppText>
          <AppText variant="bodyStrong">{sermon.theme}</AppText>
          <AppText variant="small" tone="secondary">
            {snippet}
          </AppText>
        </TapCard>
      ))}
    </Page>
  )
}
