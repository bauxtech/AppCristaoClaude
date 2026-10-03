import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, EmptyState, IconButton, Page } from '../../../components'
import { formatDuration } from '../../../lib/date'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useSermons } from '../SermonContext'

const BARS = Array.from({ length: 40 }, (_, i) => 25 + ((i * 37) % 60))

/** Marca onde a pregação começa e termina antes de transcrever. */
export function TrimScreen() {
  const { colors } = useTheme()
  const { draft, createFromDraft } = useSermons()
  const total = draft?.durationSec ?? 0
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(total)
  if (!draft) return <Page title="Ajustar gravação"><EmptyState text="Nenhuma gravação para ajustar." /></Page>
  const step = total > 600 ? 60 : 10
  const transcribe = () => {
    const s = createFromDraft({ start, end: total ? end : 0 })
    if (s) router.replace({ pathname: '/culto/[id]', params: { id: s.id } })
  }

  if (!total) {
    return (
      <Page title="Transcrever áudio" onBack={() => router.back()}>
        <AppText variant="body">O áudio importado vai ser transcrito inteiro.</AppText>
        <Button label="Transcrever" onPress={transcribe} />
      </Page>
    )
  }

  const Row = ({ label, value, set, min, max }: { label: string; value: number; set: (v: number) => void; min: number; max: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText variant="bodyStrong" style={{ width: 56 }}>
        {label}
      </AppText>
      <IconButton icon="chevronLeft" label={`${label}: voltar ${step === 60 ? '1 minuto' : '10 segundos'}`} onPress={() => set(Math.max(min, value - step))} />
      <AppText accessibilityLiveRegion="polite" accessibilityLabel={`${label} em ${formatDuration(value)}`} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.semibold, color: colors.primary }}>
        {formatDuration(value)}
      </AppText>
      <IconButton icon="chevronRight" label={`${label}: avançar ${step === 60 ? '1 minuto' : '10 segundos'}`} onPress={() => set(Math.min(max, value + step))} />
    </View>
  )

  return (
    <Page title="Ajustar gravação">
      <AppText variant="body" tone="secondary">{`Gravação de ${formatDuration(total)}. Marque onde a pregação começa e termina. Só esse trecho vai para o texto.`}</AppText>
      <Card accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2 }}>
          {BARS.map((h, i) => {
            const at = (i / BARS.length) * total
            const inside = at >= start && at <= end
            return <View key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, backgroundColor: inside ? colors.primary : colors.line }} />
          })}
        </View>
      </Card>
      <Row label="Início" value={start} set={setStart} min={0} max={Math.max(0, end - step)} />
      <Row label="Fim" value={end} set={setEnd} min={Math.min(total, start + step)} max={total} />
      <AppText variant="small" tone="secondary">{`Trecho escolhido: ${formatDuration(end - start)}`}</AppText>
      <Button label="Transcrever" onPress={transcribe} />
    </Page>
  )
}
