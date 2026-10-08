import { router, useLocalSearchParams } from 'expo-router'
import { NotesLockedInline, useNotesLocked } from '../../settings/NotesLock'
import { useState } from 'react'
import { Share, View } from 'react-native'
import { AppText, Button, Card, ConfirmCard, EmptyState, IconButton, Page, SectionLabel, Segmented, Sheet, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { formatDuration } from '../../../lib/date'
import { useTheme } from '../../../theme/ThemeProvider'
import { useAudio } from '../../audio/AudioContext'
import { slugify } from '../../bible/books'
import { useCell } from '../../cell/CellContext'
import { formatMeetingDay } from '../../cell/meetings'
import { toISODate } from '../../prayer/data'
import { formatBR } from '../../prayer/dates'
import { verseLabel, type Sermon } from '../data'
import { useSermons } from '../SermonContext'
import { SuggestedSong } from '../../music/screens/MusicScreens'

const FAIL_TEXT: Record<NonNullable<Sermon['failReason']>, string> = {
  too_big: 'O áudio passou de 25 MB, o limite da transcrição.',
  no_audio: 'O áudio não foi encontrado no aparelho.',
  limit: 'Você já usou os 5 cultos deste mês.',
  no_access: 'A transcrição faz parte da assinatura.',
  empty: 'Não deu para entender a fala do áudio. Confira se o som foi gravado.',
  no_login: 'Entre na sua conta de novo para transcrever.',
  error: 'Não foi possível processar agora. Tente de novo.',
}

function useSermon() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { sermons } = useSermons()
  return sermons.find((s) => s.id === id)
}

export function summaryText(s: Sermon) {
  return [`${s.theme}${s.preacher ? `, ${s.preacher}` : ''}`, s.summary, ...s.points.map((p) => `- ${p}`), s.verses.length ? `Versículos: ${s.verses.map(verseLabel).join(', ')}` : ''].filter(Boolean).join('\n')
}

export function ResultScreen() {
  const s = useSermon()
  const { retry } = useSermons()
  const { colors } = useTheme()
  if (!s) return <Page title="Culto"><EmptyState text="Este culto foi excluído." /></Page>
  if (s.status === 'processing') {
    return (
      <Page title="Processando">
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }} accessibilityLiveRegion="polite">
          <Icon name="clock" size={28} color={colors.primary} />
          <AppText variant="title">Transformando a pregação em texto</AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            Pode sair do app. Avisamos quando ficar pronto.
          </AppText>
        </Card>
        <Button label="Voltar para os cultos" variant="outline" onPress={() => router.dismissTo('/culto')} />
      </Page>
    )
  }
  if (s.status === 'failed') {
    return (
      <Page title="Culto">
        <Card style={{ gap: 8, borderColor: colors.danger }}>
          <AppText variant="title">A transcrição falhou</AppText>
          <AppText variant="body" tone="secondary">
            {FAIL_TEXT[s.failReason ?? 'error']}
            {s.audioUri ? ' O áudio continua guardado no aparelho.' : ''}
          </AppText>
        </Card>
        <Button label="Tentar de novo" onPress={() => retry(s.id)} />
      </Page>
    )
  }
  return <Ready s={s} />
}

function Ready({ s }: { s: Sermon }) {
  const { colors } = useTheme()
  const toast = useToast()
  const audio = useAudio()
  const { cell, update: updateCell } = useCell()
  const { remove, deleteAudio } = useSermons()
  const [tab, setTab] = useState<'resumo' | 'texto' | 'notas'>('resumo')
  const notesLocked = useNotesLocked()
  const [sheet, setSheet] = useState<'options' | 'send' | null>(null)
  const [confirm, setConfirm] = useState<'delete' | 'audio' | null>(null)
  const isLeader = cell?.myRole === 'lider' && !cell.archived

  function toPlan() {
    if (!cell) return
    updateCell((c) => ({
      ...c,
      planTitle: s.theme,
      planRef: s.verses.map(verseLabel).join(', '),
      plan: [
        { id: `p${Date.now()}1`, title: 'Quebra-gelo', content: '', minutes: 10 },
        { id: `p${Date.now()}2`, title: 'Louvor', content: '', minutes: 15 },
        { id: `p${Date.now()}3`, title: 'Palavra', content: [`Tema: ${s.theme} (baseado no culto de ${formatMeetingDay(s.date).toLowerCase()})`, s.verses.length ? `Texto base: ${s.verses.map(verseLabel).join(', ')}` : ''].filter(Boolean).join('\n'), minutes: 20 },
        { id: `p${Date.now()}4`, title: 'Perguntas para reflexão', content: s.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'), minutes: 10 },
        { id: `p${Date.now()}5`, title: 'Oração', content: 'Pedidos do grupo.', minutes: 10 },
      ],
    }))
    toast('Roteiro da célula montado. Revise e salve')
    router.push('/celula/roteiro-editar')
  }

  return (
    <Page title="Resultado" right={<IconButton icon="more" label="Mais opções do culto" onPress={() => setSheet('options')} />}>
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 16, gap: 4 }}>
        <AppText variant="small" tone="secondary">{[s.church, formatMeetingDay(s.date)].filter(Boolean).join(' · ')}</AppText>
        <AppText variant="bodyStrong">{s.theme || 'Culto sem tema'}</AppText>
        <AppText variant="small" tone="secondary">{`${s.preacher ? `${s.preacher} · ` : ''}${formatDuration(s.trim.end - s.trim.start)} · ${s.verses.length} ${s.verses.length === 1 ? 'versículo citado' : 'versículos citados'}`}</AppText>
        <AppText variant="small" tone="secondary">{s.audioUri && s.audioExpiresAt ? `Áudio guardado até ${formatBR(s.audioExpiresAt)}. O texto fica para sempre.` : 'Só o texto foi guardado.'}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {s.audioUri ? <Button label="Ouvir gravação" icon="play" size="sm" onPress={() => router.push({ pathname: '/culto/[id]/ouvir', params: { id: s.id } })} /> : null}
          <Button label="Ouvir resumo" icon="volume" variant="outline" size="sm" onPress={() => audio.play({ title: s.theme, text: [s.summary, ...s.points].join('. ') })} />
        </View>
      </View>
      {s.sample ? <AppText variant="small" tone="secondary">Na prévia, o texto e o resumo são de exemplo. A transcrição real chega quando o servidor estiver ligado.</AppText> : null}

      <Segmented label="Parte do resultado" value={tab} onChange={setTab} options={[{ id: 'resumo', label: 'Resumo' }, { id: 'texto', label: 'Transcrição' }, { id: 'notas', label: 'Notas' }]} />

      {tab === 'resumo' ? (
        <>
          <Card style={{ gap: 8 }}>
            <SectionLabel>Resumo</SectionLabel>
            <AppText variant="body">{s.summary || 'Sem resumo.'}</AppText>
          </Card>
          {s.points.length ? (
            <Card style={{ gap: 8 }}>
              <SectionLabel>Pontos principais</SectionLabel>
              {s.points.map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 }} />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {p}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}
          {s.application ? (
            <Card style={{ gap: 8 }}>
              <SectionLabel>Aplicação</SectionLabel>
              <AppText variant="body">{s.application}</AppText>
            </Card>
          ) : null}
          <Card style={{ gap: 4 }}>
            <SectionLabel>Versículos citados</SectionLabel>
            {s.verses.length === 0 ? <AppText variant="body" tone="secondary">Nenhum versículo encontrado.</AppText> : null}
            {s.verses.map((v) => (
              <Button
                key={verseLabel(v)}
                label={verseLabel(v)}
                variant="text"
                onPress={() => router.push({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: slugify(v.book), capitulo: String(v.chapter), v: v.verse ? String(v.verse) : '' } })}
                style={{ alignSelf: 'flex-start' }}
              />
            ))}
          </Card>
          {isLeader ? <Button label="Transformar em roteiro da célula" onPress={toPlan} /> : null}
          {cell ? <Button label="Enviar resumo para a célula" variant="outline" onPress={() => setSheet('send')} /> : null}
          <Button label="Perguntar sobre este culto" icon="chat" variant="outline" onPress={() => router.push({ pathname: '/chat', params: { culto: s.id } })} />
          <SuggestedSong moment="culto" />
        </>
      ) : null}

      {tab === 'texto' ? (
        <Card>
          <AppText variant="bible">{s.transcript || 'Sem texto.'}</AppText>
        </Card>
      ) : null}

      {tab === 'notas' && notesLocked ? <NotesLockedInline /> : null}
      {tab === 'notas' && !notesLocked ? (
        <>
          <Card style={{ gap: 8 }}>
            <SectionLabel>Notas</SectionLabel>
            {s.notes.length === 0 ? <AppText variant="body" tone="secondary">Você não fez notas neste culto.</AppText> : null}
            {s.notes.map((n, i) => (
              <View key={i}>
                <AppText variant="small" tone="brand">
                  {formatDuration(n.ts)}
                </AppText>
                <AppText variant="body">{n.text}</AppText>
              </View>
            ))}
          </Card>
          <Card style={{ gap: 8 }}>
            <SectionLabel>Momentos marcados</SectionLabel>
            {s.moments.length === 0 ? <AppText variant="body" tone="secondary">Nenhum momento marcado.</AppText> : null}
            {s.moments.map((m, i) => (
              <AppText key={i} variant="body">{`${formatDuration(m.ts)} · ${m.label}`}</AppText>
            ))}
            {s.audioUri && s.moments.length ? <Button label="Ouvir a partir dos momentos" variant="text" onPress={() => router.push({ pathname: '/culto/[id]/ouvir', params: { id: s.id } })} style={{ alignSelf: 'flex-start' }} /> : null}
          </Card>
        </>
      ) : null}

      {confirm === 'delete' ? (
        <ConfirmCard
          title="Excluir este culto?"
          message="O texto, o resumo e o áudio são apagados."
          confirmLabel="Excluir"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            remove(s.id)
            toast('Culto excluído')
            router.dismissTo('/culto')
          }}
        />
      ) : null}
      {confirm === 'audio' ? (
        <ConfirmCard
          title="Apagar o áudio?"
          message="O texto, o resumo e as notas continuam."
          confirmLabel="Apagar áudio"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            deleteAudio(s.id)
            setConfirm(null)
            toast('Áudio apagado. O texto continua')
          }}
        />
      ) : null}

      <Sheet visible={sheet === 'options'} onClose={() => setSheet(null)} title="Mais opções">
        <Button label="Editar dados do culto" variant="outline" onPress={() => (setSheet(null), router.push({ pathname: '/culto/[id]/dados', params: { id: s.id } }))} />
        {s.audioUri ? <Button label="Apagar o áudio e ficar só com o texto" variant="outline" onPress={() => (setSheet(null), setConfirm('audio'))} /> : null}
        <Button label="Compartilhar resumo" variant="outline" onPress={() => (setSheet(null), Share.share({ message: summaryText(s) }).catch(() => {}))} />
        <Button label="Excluir culto" variant="dangerSoft" onPress={() => (setSheet(null), setConfirm('delete'))} />
      </Sheet>

      <Sheet visible={sheet === 'send'} onClose={() => setSheet(null)} title="Enviar resumo para a célula">
        <Card>
          <AppText variant="small">{summaryText(s)}</AppText>
        </Card>
        <AppText variant="small" tone="secondary">
          {isLeader ? 'O resumo vai para o mural da célula.' : 'Só o líder publica no mural. Você pode mandar o resumo pelo WhatsApp ou outro app.'}
        </AppText>
        <Button
          label={isLeader ? 'Publicar no mural' : 'Enviar por outro app'}
          onPress={() => {
            setSheet(null)
            if (isLeader) {
              updateCell((c) => ({ ...c, board: [{ id: `b${Date.now()}`, authorId: 'me', text: summaryText(s), at: toISODate(new Date()) }, ...c.board] }))
              toast('Resumo publicado no mural')
            } else Share.share({ message: summaryText(s) }).catch(() => {})
          }}
        />
        <Button label="Cancelar" variant="text" onPress={() => setSheet(null)} />
      </Sheet>
    </Page>
  )
}
