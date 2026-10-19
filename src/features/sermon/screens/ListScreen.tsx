import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Card, EmptyState, IconButton, Page, ProgressBar, Tag, TapCard, useToast } from '../../../components'
import { formatDuration } from '../../../lib/date'
import { formatMeetingDay } from '../../cell/meetings'
import { useChurch } from '../../church/ChurchContext'
import { useSermonQuota } from '../quota'
import { PlanLockRow } from '../../subscription/PlanLock'
import { longDate } from '../../settings/screens/AccountScreens'
import { useSermons } from '../SermonContext'
import { useSettings } from '../../settings/SettingsContext'

/** Cultos usados no período do plano. No limite: aviso com a data de renovação e o plano com mais cultos. */
export function UsageCard() {
  const { sermons } = useSermons()
  const q = useSermonQuota(sermons)
  if (!q.canRecord) return null
  const text = `${q.used} de ${q.limit} cultos usados neste período`
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
          {text}
        </AppText>
        {q.full ? <Tag label="Limite atingido" tone="danger" /> : null}
      </View>
      <ProgressBar value={q.used} max={q.limit} label={text} />
      {q.full ? (
        <>
          <AppText variant="small" tone="secondary">
            {`Seu plano permite ${q.limit} cultos por período. ${q.resetsAt ? `Renova em ${longDate(q.resetsAt)}.` : 'Renova no começo do próximo período.'}`}
          </AppText>
          {q.limit < 8 ? <Button label="Mais cultos no plano Líder" variant="text" size="sm" onPress={() => router.push('/assinatura?plano=lider&origem=culto-limite' as '/assinatura')} /> : null}
        </>
      ) : null}
    </Card>
  )
}

export function SermonListScreen() {
  const toast = useToast()
  const { sermons, setDraft } = useSermons()
  const { recordingDefault } = useSettings()
  const { main } = useChurch()
  const q = useSermonQuota(sermons)
  const full = q.full

  async function importAudio() {
    if (full) return toast(`Limite de ${q.limit} cultos neste período atingido`)
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true })
    if (res.canceled || !res.assets[0]) return
    setDraft({ uri: res.assets[0].uri, durationSec: 0, notes: [], moments: [], keepAudio: recordingDefault === 'audio', source: 'importado', church: main?.name ?? '' })
    router.push('/culto/ajustar')
  }

  return (
    <Page title="Cultos gravados" right={<IconButton icon="search" label="Buscar nos cultos" onPress={() => router.push('/culto/busca')} />}>
      <UsageCard />
      {q.canRecord ? (
        <>
          <Button label="Gravar culto" icon="mic" disabled={full} onPress={() => router.push('/culto/gravar')} />
          <Button label="Importar áudio" icon="upload" variant="outline" disabled={full} onPress={importAudio} />
        </>
      ) : (
        <PlanLockRow feature="sermon" label="Gravar e transcrever culto" />
      )}
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
