import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { AppText, Avatar, Button, Card, Chip, ConfirmCard, EmptyState, IconButton, Page, SectionLabel, Tag, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { formatAgo } from '../../prayer/dates'
import { toISODate } from '../../prayer/data'
import { memberName, useCell } from '../CellContext'
import type { Cell, Poll } from '../data'
import { can } from '../permissions'
import { CellGuard } from './Guard'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Menu de denúncia: vai para a equipe do app e some na hora para quem denunciou (regra decidida). */
export function ReportButton({ what, onReport }: { what: string; onReport: () => void }) {
  const toast = useToast()
  return (
    <Button
      label="Denunciar"
      variant="text"
      size="sm"
      accessibilityHint={`Denuncia ${what} para a equipe do app`}
      onPress={() => {
        onReport()
        toast('Recebemos sua denúncia')
      }}
    />
  )
}

export function BoardScreen() {
  return <CellGuard title="Mural" action="participate">{(cell) => <Board cell={cell} />}</CellGuard>
}

function Board({ cell }: { cell: Cell }) {
  const toast = useToast()
  const { update } = useCell()
  const post = can(cell.myRole, 'postBoard')
  const [text, setText] = useState('')
  const [pollOpen, setPollOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const notices = cell.board.filter((b) => !cell.hidden.includes(b.id))
  const hide = (id: string) => update((c) => ({ ...c, hidden: [...c.hidden, id] }))

  return (
    <Page title="Mural">
      {post ? (
        <Card style={{ gap: 10 }}>
          <TextField label="Novo aviso" value={text} onChangeText={setText} placeholder="Escreva o aviso para a célula" multiline maxLength={500} />
          <Button
            label="Publicar aviso"
            disabled={!text.trim()}
            onPress={() => {
              update((c) => ({ ...c, board: [{ id: `b${Date.now()}`, authorId: 'me', text: text.trim(), at: toISODate(new Date()) }, ...c.board] }))
              setText('')
              toast('Aviso publicado')
            }}
          />
        </Card>
      ) : null}
      {notices.length === 0 ? <EmptyState text="Nenhum aviso no mural." /> : null}
      {notices.map((n) => (
        <Card key={n.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar name={memberName(cell, n.authorId) ?? '?'} size={28} />
            <AppText variant="small" style={{ fontFamily: fonts.semibold, flex: 1 }}>
              {memberName(cell, n.authorId)}
            </AppText>
            <AppText variant="small" tone="secondary">
              {formatAgo(n.at)}
            </AppText>
          </View>
          <AppText variant="body">{n.text}</AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            {post ? (
              <Button label="Apagar" variant="text" size="sm" onPress={() => update((c) => ({ ...c, board: c.board.filter((b) => b.id !== n.id) }))} />
            ) : n.authorId !== 'me' ? (
              <ReportButton what="este aviso" onReport={() => hide(n.id)} />
            ) : null}
          </View>
        </Card>
      ))}

      {cell.polls.map((p) => (
        <PollCard key={p.id} poll={p} canVote={can(cell.myRole, 'vote')} onVote={(i) => update((c) => ({ ...c, polls: c.polls.map((x) => (x.id === p.id ? vote(x, i) : x)) }))} />
      ))}

      {post ? (
        pollOpen ? (
          <Card style={{ gap: 10 }}>
            <AppText variant="bodyStrong" accessibilityRole="header">
              Nova enquete
            </AppText>
            <TextField label="Pergunta" value={question} onChangeText={setQuestion} placeholder="Ex.: Melhor dia para o passeio?" maxLength={120} />
            {options.map((o, i) => (
              <TextField key={i} label={`Opção ${i + 1}`} value={o} onChangeText={(v) => setOptions((x) => x.map((y, j) => (j === i ? v : y)))} maxLength={40} />
            ))}
            {options.length < 5 ? <Button label="Acrescentar opção" icon="plus" variant="text" size="sm" onPress={() => setOptions((x) => [...x, ''])} style={{ alignSelf: 'flex-start' }} /> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancelar" variant="outline" onPress={() => setPollOpen(false)} style={{ flex: 1 }} />
              <Button
                label="Publicar"
                disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
                onPress={() => {
                  update((c) => ({ ...c, polls: [{ id: `q${Date.now()}`, question: question.trim(), options: options.filter((o) => o.trim()).map((label) => ({ label: label.trim(), votes: 0 })) }, ...c.polls] }))
                  setPollOpen(false)
                  setQuestion('')
                  setOptions(['', ''])
                  toast('Enquete publicada')
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : (
          <Button label="Criar enquete" icon="plus" variant="outline" onPress={() => setPollOpen(true)} />
        )
      ) : null}
    </Page>
  )
}

function vote(p: Poll, i: number): Poll {
  const options = p.options.map((o, j) => ({ ...o, votes: o.votes - (p.myVote === j ? 1 : 0) + (i === j ? 1 : 0) }))
  return { ...p, options, myVote: i }
}

function PollCard({ poll, canVote, onVote }: { poll: Poll; canVote: boolean; onVote: (i: number) => void }) {
  const { colors } = useTheme()
  const total = poll.options.reduce((a, o) => a + o.votes, 0)
  return (
    <Card style={{ gap: 10 }}>
      <SectionLabel>Enquete</SectionLabel>
      <AppText variant="bodyStrong">{poll.question}</AppText>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={poll.question}>
        {poll.options.map((o, i) => {
          const pct = total ? Math.round((o.votes / total) * 100) : 0
          const mine = poll.myVote === i
          return (
            <Pressable
              key={o.label}
              disabled={!canVote}
              onPress={() => onVote(i)}
              accessibilityRole="radio"
              accessibilityState={{ checked: mine, disabled: !canVote }}
              accessibilityLabel={`${o.label}, ${pct} por cento, ${o.votes} ${o.votes === 1 ? 'voto' : 'votos'}`}
              style={{ minHeight: 48, borderRadius: 12, borderWidth: mine ? 2 : 1, borderColor: mine ? colors.primary : colors.lineStrong, overflow: 'hidden', justifyContent: 'center' }}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: colors.primarySoft }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
                {mine ? <Icon name="check" size={16} color={colors.primary} strokeWidth={2.5} /> : null}
                <AppText variant="body" style={{ flex: 1, fontFamily: mine ? fonts.semibold : fonts.regular }}>
                  {o.label}
                </AppText>
                <AppText variant="small" tone="secondary">{`${pct}%`}</AppText>
              </View>
            </Pressable>
          )
        })}
      </View>
      <AppText variant="small" tone="secondary">{`${total} ${total === 1 ? 'voto' : 'votos'}${poll.myVote !== undefined ? ' · Você votou' : ''}`}</AppText>
    </Card>
  )
}

export function MaterialsScreen() {
  const toast = useToast()
  const { update } = useCell()
  const { colors } = useTheme()
  return (
    <CellGuard title="Materiais" action="participate">
      {(cell) => {
        const manage = can(cell.myRole, 'manageMaterials')
        return (
          <Page title="Materiais">
            {cell.materials.length === 0 ? <EmptyState text="Nenhum material ainda." /> : null}
            {cell.materials.map((m) => (
              <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.kind === 'PDF' ? 'file' : 'image'} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" numberOfLines={2}>
                    {m.name}
                  </AppText>
                  <AppText variant="small" tone="secondary">{`${m.kind} · ${m.size} · ${m.date}`}</AppText>
                </View>
                <IconButton
                  icon="external"
                  label={`Abrir ${m.name}`}
                  onPress={() => {
                    toast(`Abrindo ${m.name}`)
                    if (m.uri) Linking.openURL(m.uri).catch(() => {})
                  }}
                />
                {manage ? <IconButton icon="trash" label={`Apagar ${m.name}`} onPress={() => update((c) => ({ ...c, materials: c.materials.filter((x) => x.id !== m.id) }))} /> : null}
              </Card>
            ))}
            {manage ? (
              <Button
                label="Adicionar material"
                icon="upload"
                variant="outline"
                onPress={async () => {
                  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
                  if (res.canceled || !res.assets[0]) return
                  const a = res.assets[0]
                  const kind = a.mimeType?.startsWith('image/') ? 'Imagem' : 'PDF'
                  const size = a.size ? `${(a.size / 1048576).toFixed(1).replace('.', ',')} MB` : ''
                  const d = new Date()
                  update((c) => ({ ...c, materials: [{ id: `mt${Date.now()}`, name: a.name, kind, size, date: `${d.getDate()} de ${MONTHS[d.getMonth()]}`, uri: a.uri }, ...c.materials] }))
                  toast('Material adicionado')
                }}
              />
            ) : null}
          </Page>
        )
      }}
    </CellGuard>
  )
}

export function PlaylistScreen() {
  const toast = useToast()
  const { update } = useCell()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [url, setUrl] = useState('')
  const { colors } = useTheme()
  const validUrl = !url.trim() || /^https:\/\/\S+$/.test(url.trim())
  return (
    <CellGuard title="Playlist da semana" action="participate">
      {(cell) => {
        const manage = can(cell.myRole, 'managePlaylist')
        return (
          <Page title="Playlist da semana">
            {cell.playlist.length === 0 ? <EmptyState text="Nenhuma música na playlist." /> : null}
            {cell.playlist.map((s, i) => (
              <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ color: colors.primary, fontFamily: fonts.semibold }}>{i + 1}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body">{s.title}</AppText>
                  <AppText variant="small" tone="secondary">
                    {s.artist}
                  </AppText>
                </View>
                <IconButton
                  icon="external"
                  label={`Ouvir ${s.title}`}
                  onPress={() => {
                    if (s.url) {
                      toast('Abrindo a música')
                      Linking.openURL(s.url).catch(() => {})
                    } else {
                      toast('Abrindo no Spotify')
                      Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`).catch(() => {})
                    }
                  }}
                />
                {manage ? <IconButton icon="trash" label={`Tirar ${s.title} da playlist`} onPress={() => update((c) => ({ ...c, playlist: c.playlist.filter((x) => x.id !== s.id) }))} /> : null}
              </Card>
            ))}
            {manage ? (
              <Card style={{ gap: 10 }}>
                <AppText variant="bodyStrong" accessibilityRole="header">
                  Acrescentar música
                </AppText>
                <TextField label="Nome da música" value={title} onChangeText={setTitle} maxLength={80} />
                <TextField label="Artista" value={artist} onChangeText={setArtist} maxLength={80} />
                <TextField label="Link (opcional)" value={url} onChangeText={setUrl} placeholder="https://open.spotify.com/..." autoCapitalize="none" keyboardType="url" error={validUrl ? undefined : 'Cole um link que comece com https://'} />
                <Button
                  label="Acrescentar"
                  disabled={!title.trim() || !validUrl}
                  onPress={() => {
                    update((c) => ({ ...c, playlist: [...c.playlist, { id: `pl${Date.now()}`, title: title.trim(), artist: artist.trim(), url: url.trim() || undefined }] }))
                    setTitle('')
                    setArtist('')
                    setUrl('')
                    toast('Música acrescentada')
                  }}
                />
              </Card>
            ) : null}
          </Page>
        )
      }}
    </CellGuard>
  )
}

export function BirthdaysScreen() {
  const { colors } = useTheme()
  const month = new Date().getMonth() + 1
  return (
    <CellGuard title="Aniversários" action="participate">
      {(cell) => {
        const list = cell.members.filter((m) => m.birthday && Number(m.birthday.slice(0, 2)) === month).sort((a, b) => (a.birthday! > b.birthday! ? 1 : -1))
        return (
          <Page title="Aniversários">
            <SectionLabel>{MONTHS[month - 1].replace(/^./, (x) => x.toUpperCase())}</SectionLabel>
            {list.length === 0 ? <EmptyState text="Nenhum aniversário este mês." /> : null}
            {list.map((m) => (
              <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="gift" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{m.name}</AppText>
                  <AppText variant="small" tone="secondary">{`${Number(m.birthday!.slice(3))} de ${MONTHS[month - 1]}${m.birthYear ? ` · ${new Date().getFullYear() - m.birthYear} anos` : ''}`}</AppText>
                </View>
              </Card>
            ))}
          </Page>
        )
      }}
    </CellGuard>
  )
}

export function HistoryScreen() {
  const { colors } = useTheme()
  return (
    <CellGuard title="Histórico" action="seeHistory">
      {(cell) => {
        const active = cell.members.filter((m) => m.active).length
        const metrics = [
          { label: 'Reuniões realizadas', value: String(cell.history.meetings) },
          { label: 'Presença média', value: `${cell.history.avgAttendance}%` },
          { label: 'Visitantes', value: String(cell.visitors.length + (cell.id === 'c-central' ? 5 : 0)) },
          { label: 'Pedidos respondidos', value: String(cell.history.answered) },
        ]
        return (
          <Page title="Histórico">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {metrics.map((m) => (
                <View key={m.label} style={{ width: '50%', padding: 6 }}>
                  <Card style={{ padding: 16, gap: 4 }} accessible accessibilityLabel={`${m.label}: ${m.value}`}>
                    <AppText style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.primary }}>{m.value}</AppText>
                    <AppText variant="small" tone="secondary">
                      {m.label}
                    </AppText>
                  </Card>
                </View>
              ))}
            </View>
            <Card style={{ gap: 6 }}>
              <AppText variant="bodyStrong">{cell.name}</AppText>
              <AppText variant="small" tone="secondary">{`Fundada em ${MONTHS[Number(cell.foundedAt.slice(5, 7)) - 1]} de ${cell.foundedAt.slice(0, 4)}`}</AppText>
              <AppText variant="small" tone="secondary">{`${active} pessoas ativas de ${cell.maxSize} no tamanho que você definiu`}</AppText>
            </Card>
            <Button label="Multiplicação" variant="outline" onPress={() => router.push('/celula/multiplicar')} />
          </Page>
        )
      }}
    </CellGuard>
  )
}

export function MultiplicationScreen() {
  return <CellGuard title="Multiplicação" action="multiply">{(cell) => <Multiplication cell={cell} />}</CellGuard>
}

function Multiplication({ cell }: { cell: Cell }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const people = cell.members.filter((m) => !m.isMe && m.role !== 'visitante')
  const suggested = people.find((m) => m.role === 'auxiliar') ?? people[0]
  const [leader, setLeader] = useState(suggested?.id ?? null)
  const [groupB, setGroupB] = useState<string[]>(() => people.slice(Math.ceil(people.length / 2)).map((m) => m.id))
  const [confirm, setConfirm] = useState(false)
  const inB = (id: string) => groupB.includes(id) || id === leader

  return (
    <Page title="Multiplicação">
      <Card style={{ gap: 10 }}>
        <SectionLabel>Tamanho máximo da célula</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton icon="arrowDown" label="Diminuir tamanho máximo" onPress={() => update((c) => ({ ...c, maxSize: Math.max(4, c.maxSize - 1) }))} />
          <AppText accessibilityLiveRegion="polite" accessibilityLabel={`Tamanho máximo ${cell.maxSize}`} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 28, color: colors.text }}>
            {cell.maxSize}
          </AppText>
          <IconButton icon="arrowUp" label="Aumentar tamanho máximo" onPress={() => update((c) => ({ ...c, maxSize: Math.min(40, c.maxSize + 1) }))} />
        </View>
        <AppText variant="small" tone="secondary">
          Avisamos quando a célula passar deste número de pessoas ativas.
        </AppText>
      </Card>

      {people.length < 2 ? (
        <AppText variant="body" tone="secondary">
          A célula ainda é pequena para dividir.
        </AppText>
      ) : (
        <>
          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Quem lidera a nova célula">
            <AppText variant="bodyStrong">Quem lidera a nova célula</AppText>
            {suggested ? <AppText variant="small" tone="secondary">{`Sugestão: ${suggested.name}, ${suggested.role === 'auxiliar' ? 'que já é auxiliar' : 'membro'}`}</AppText> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {people.map((m) => (
                <Chip key={m.id} label={m.name} selected={leader === m.id} onPress={() => setLeader(m.id)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <AppText variant="bodyStrong">Divisão das pessoas</AppText>
            <AppText variant="small" tone="secondary">
              Toque numa pessoa para trocar de grupo.
            </AppText>
            {people.map((m) => (
              <Pressable
                key={m.id}
                disabled={m.id === leader}
                onPress={() => setGroupB((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id]))}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}, ${inB(m.id) ? 'nova célula' : 'fica nesta célula'}${m.id === leader ? ', líder da nova célula' : ''}`}
                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}
              >
                <AppText variant="body" style={{ flex: 1 }}>
                  {m.name}
                </AppText>
                <Tag label={inB(m.id) ? (m.id === leader ? 'Nova célula, líder' : 'Nova célula') : 'Fica aqui'} tone={inB(m.id) ? 'primary' : 'neutral'} />
              </Pressable>
            ))}
          </View>
          {confirm ? (
            <ConfirmCard
              title="Confirmar a divisão?"
              message={`${people.filter((m) => inB(m.id)).length} pessoas vão para a nova célula. Todos serão avisados.`}
              confirmLabel="Dividir"
              danger={false}
              onCancel={() => setConfirm(false)}
              onConfirm={() => {
                const leaving = people.filter((m) => inB(m.id)).map((m) => m.id)
                const name = cell.members.find((m) => m.id === leader)?.name
                update((c) => ({ ...c, members: c.members.filter((m) => !leaving.includes(m.id)), schedule: c.schedule.map((s) => (s.memberId && leaving.includes(s.memberId) ? { ...s, memberId: null } : s)) }))
                toast(`Nova célula criada, liderada por ${name}`)
                router.back()
              }}
            />
          ) : (
            <Button label="Confirmar divisão" disabled={!leader} onPress={() => setConfirm(true)} />
          )}
        </>
      )}
    </Page>
  )
}

export function MyCellsScreen() {
  const toast = useToast()
  const { cells, cell, switchCell } = useCell()
  return (
    <Page title="Minhas células">
      {cells.map((c) => (
        <Card key={c.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="small" tone="secondary">{`${c.members.length} pessoas${c.archived ? ' · Arquivada' : ''}`}</AppText>
            </View>
            <Tag label={c.myRole === 'lider' ? 'Líder' : 'Participa'} />
          </View>
          {c.id === cell?.id ? (
            <AppText variant="small" tone="secondary">
              Aberta agora
            </AppText>
          ) : (
            <Button
              label="Abrir esta célula"
              variant="text"
              size="sm"
              onPress={() => {
                switchCell(c.id)
                toast(`${c.name} aberta`)
                router.dismissTo('/celula')
              }}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </Card>
      ))}
      <Button label="Entrar em outra célula" icon="plus" variant="outline" onPress={() => router.push('/celula/entrar')} />
      <Button label="Criar outra célula" icon="plus" variant="outline" onPress={() => router.push('/celula/criar')} />
    </Page>
  )
}
