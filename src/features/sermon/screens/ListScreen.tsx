import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Card, EmptyState, IconButton, Page, ProgressBar, Tag, TapCard, useToast } from '../../../components'
import { formatDuration } from '../../../lib/date'
import { formatMeetingDay } from '../../cell/meetings'
import { useChurch } from '../../church/ChurchContext'
import { MONTHLY_LIMIT, usedThisMonth } from '../data'
import { useSermons } from '../SermonContext'
import { useSettings } from '../../settings/SettingsContext'

export function UsageCard() {
  const { sermons } = useSermons()
  const used = usedThisMonth(sermons)
  const full = used >= MONTHLY_LIMIT
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="bodyStrong">{`${used} de ${MONTHLY_LIMIT} cultos usados neste mês`}</AppText>
        {full ? <Tag label="Limite atingido" tone="danger" /> : null}
      </View>
      <ProgressBar value={used} max={MONTHLY_LIMIT} label={`${used} de ${MONTHLY_LIMIT} cultos usados neste mês`} />
      {full ? (
        <AppText variant="small" tone="secondary">
          O plano inclui 5 cultos por mês. A contagem volta no dia 1.
        </AppText>
      ) : null}
    </Card>
  )
}

export function SermonListScreen() {
  const toast = useToast()
  const { sermons, setDraft } = useSermons()
  const { recordingDefault } = useSettings()
  const { main } = useChurch()
  const full = usedThisMonth(sermons) >= MONTHLY_LIMIT

  async function importAudio() {
    if (full) return toast('Limite de 5 cultos neste mês atingido')
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true })
    if (res.canceled || !res.assets[0]) return
    setDraft({ uri: res.assets[0].uri, durationSec: 0, notes: [], moments: [], keepAudio: recordingDefault === 'audio', source: 'importado', church: main?.name ?? '' })
    router.push('/culto/ajustar')
  }

  return (
    <Page title="Cultos gravados" right={<IconButton icon="search" label="Buscar nos cultos" onPress={() => router.push('/culto/busca')} />}>
      <UsageCard />
      <Button label="Gravar culto" icon="mic" disabled={full} onPress={() => router.push('/culto/gravar')} />
      <Button label="Importar áudio" icon="upload" variant="outline" disabled={full} onPress={importAudio} />
      {sermons.length === 0 ? <EmptyState text="Nenhum culto gravado ainda. Grave o próximo culto para ver o texto e o resumo aqui." /> : null}
      {sermons.map((s) => (
        <TapCard
          key={s.id}
          label={`${s.theme || 'Culto sem tema'}, ${formatMeetingDay(s.date)}${s.status === 'processing' ? ', processando' : s.status === 'failed' ? ', transcrição falhou' : ''}`}
          onPress={() => router.push({ pathname: '/culto/[id]', params: { id: s.id } })}
        >
          <AppText variant="small" tone="secondary">
            {formatMeetingDay(s.date)}
          </AppText>
          <AppText variant="bodyStrong">{s.theme || 'Culto sem tema'}</AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {s.status === 'processing' ? <Tag label="Processando" tone="neutral" /> : null}
            {s.status === 'failed' ? <Tag label="Falhou" tone="danger" /> : null}
            {s.status === 'ready' ? <AppText variant="small" tone="secondary">{`${formatDuration(s.trim.end - s.trim.start)} · ${s.verses.length} ${s.verses.length === 1 ? 'versículo' : 'versículos'}`}</AppText> : null}
            {s.source === 'importado' ? <Tag label="Importado" tone="neutral" /> : null}
          </View>
        </TapCard>
      ))}
    </Page>
  )
}
