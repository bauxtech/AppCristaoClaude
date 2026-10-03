import * as ImagePicker from 'expo-image-picker'
import * as Print from 'expo-print'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useState, type ReactNode } from 'react'
import { Image, Pressable, View } from 'react-native'
import { AppText, Avatar, Button, Card, Chip, ConfirmCard, EmptyState, Page, SectionLabel, Segmented, SelectCard, Sheet, Switch, Tag, TapCard, TextField, TopBar, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useSession } from '../../../state/session'
import { useImagePicker } from '../../../lib/useImagePicker'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { HIGHLIGHTS, useBible } from '../../bible/BibleContext'
import { BOOKS, slugify } from '../../bible/books'
import { bookProgress } from '../../bible/screens/BooksScreen'
import { verseText } from '../../bible/text'
import { useChurch } from '../../church/ChurchContext'
import { brToISO, formatBR, formatDayMonth, maskDate } from '../../prayer/dates'
import { usePrayer } from '../../prayer/PrayerContext'
import { useSermons } from '../../sermon/SermonContext'
import { NotesLock } from '../../prayer/screens/DiaryLock'
import { useSettings } from '../../settings/SettingsContext'
import { MILESTONE_TYPES, NOTE_SOURCES, useProfile, type NoteSource } from '../ProfileContext'
import { TOTAL_CHAPTERS } from './ProfileHome'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function ageFrom(iso: string, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1
  return age
}

export function EditProfileScreen() {
  const toast = useToast()
  const session = useSession()
  const profile = useProfile()
  const [name, setName] = useState(session.profile.name)
  const [birthday, setBirthday] = useState(profile.birthday ? formatBR(profile.birthday) : '')
  const [error, setError] = useState<string | undefined>()
  const [sheet, setSheet] = useState(false)

  const { pickImage, permissionSheet } = useImagePicker()

  async function pick(camera: boolean) {
    setSheet(false)
    const uri = await pickImage(camera ? 'camera' : 'library', 'para a sua foto de perfil', { allowsEditing: true, aspect: [1, 1], quality: 0.6 })
    if (uri) {
      profile.setPhoto(uri)
      toast('Foto trocada')
    }
  }

  return (
    <Page title="Editar perfil">
      {permissionSheet}
      <View style={{ alignItems: 'center', gap: 10 }}>
        {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 88, height: 88, borderRadius: 44 }} accessibilityLabel="Sua foto" /> : <Avatar name={name || '?'} size={88} />}
        <Button label={profile.photoUri ? 'Trocar foto' : 'Adicionar foto'} variant="outline" size="sm" onPress={() => setSheet(true)} />
      </View>
      <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" maxLength={80} />
      <TextField label="Data de nascimento" value={birthday} onChangeText={(v) => (setBirthday(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} hint="A célula vê o dia e o mês, se você deixar." />
      <Button
        label="Salvar"
        disabled={!name.trim()}
        onPress={() => {
          let iso: string | undefined
          if (birthday) {
            const parsed = brToISO(birthday)
            if (!parsed) return setError('Digite a data no formato DD/MM/AAAA.')
            if (ageFrom(parsed) < 18) return setError('O app é só para maiores de 18 anos.')
            iso = parsed
          }
          session.updateProfile({ name: name.trim() })
          profile.setBirthday(iso)
          toast('Perfil salvo')
          router.back()
        }}
      />
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Foto do perfil">
        <Button label="Tirar foto" icon="camera" variant="outline" onPress={() => pick(true)} />
        <Button label="Escolher da galeria" icon="image" variant="outline" onPress={() => pick(false)} />
        {profile.photoUri ? <Button label="Remover foto" variant="dangerSoft" onPress={() => (profile.setPhoto(undefined), setSheet(false), toast('Foto removida'))} /> : null}
        <Button label="Cancelar" variant="text" onPress={() => setSheet(false)} />
      </Sheet>
    </Page>
  )
}

export function BooksMapScreen() {
  const { colors } = useTheme()
  const { readChapters } = useBible()
  const stats = BOOKS.map((b) => ({ b, read: bookProgress(b, readChapters) }))
  const done = stats.filter((s) => s.read === s.b.chapters).length
  const started = stats.filter((s) => s.read > 0 && s.read < s.b.chapters).length
  return (
    <Page title="Mapa dos 66 livros">
      <AppText variant="body" tone="secondary">{`${done} concluídos · ${started} em andamento · ${66 - done - started} não iniciados`}</AppText>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }} accessible accessibilityLabel="Legenda: concluído tem visto, em andamento tem borda azul, não iniciado fica cinza">
        {[
          ['Concluído', colors.primary, true],
          ['Em andamento', colors.primarySoft, false],
          ['Não iniciado', colors.card, false],
        ].map(([l, c, check]) => (
          <View key={String(l)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: String(c), borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>{check ? <Icon name="check" size={10} color={colors.primaryText} strokeWidth={3} /> : null}</View>
            <AppText variant="small" tone="secondary">
              {String(l)}
            </AppText>
          </View>
        ))}
      </View>
      {(['AT', 'NT'] as const).map((t) => (
        <View key={t} style={{ gap: 8 }}>
          <SectionLabel>{t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
            {stats
              .filter((s) => s.b.testament === t)
              .map(({ b, read }) => {
                const isDone = read === b.chapters
                const partial = read > 0 && !isDone
                return (
                  <View key={b.name} style={{ width: `${100 / 6}%`, padding: 3 }}>
                    <Pressable
                      onPress={() => router.push(`/biblia/${slugify(b.name)}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.name}, ${isDone ? 'concluído' : partial ? `${read} de ${b.chapters} capítulos` : 'não iniciado'}`}
                      style={{ aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? colors.primary : partial ? colors.primarySoft : colors.card, borderWidth: partial ? 2 : 1, borderColor: partial ? colors.primary : colors.line }}
                    >
                      <AppText style={{ fontSize: 12, fontFamily: fonts.semibold, color: isDone ? colors.primaryText : partial ? colors.primary : colors.textSecondary }}>{b.abbr}</AppText>
                    </Pressable>
                  </View>
                )
              })}
          </View>
        </View>
      ))}
    </Page>
  )
}

function monthYear(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS[m - 1].replace(/^./, (x) => x.toUpperCase())} de ${y}`
}

export function JourneyScreen() {
  const { colors } = useTheme()
  const { milestones } = useProfile()
  const { courses } = useChurch()
  const items = [
    ...milestones.map((m) => ({ id: m.id, date: m.date, title: m.type, desc: m.desc, editable: true })),
    ...courses.filter((c) => c.milestone && c.completedAt).map((c) => ({ id: `curso-${c.id}`, date: c.completedAt!, title: 'Curso concluído', desc: c.name, editable: false })),
  ].sort((a, b) => (a.date > b.date ? 1 : -1))
  return (
    <Page title="Minha jornada">
      {items.length === 0 ? <EmptyState text="Registre os marcos da sua fé: conversão, batismo, casamento, ministério. Você escolhe o que registrar." /> : null}
      {items.map((m) => {
        const body = (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={m.editable ? 'flag' : 'award'} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" tone="secondary">
                {monthYear(m.date)}
              </AppText>
              <AppText variant="bodyStrong">{m.title}</AppText>
              {m.desc ? <AppText variant="small" tone="secondary">{m.desc}</AppText> : null}
            </View>
          </View>
        )
        return m.editable ? (
          <TapCard key={m.id} label={`${m.title}, ${monthYear(m.date)}. ${m.desc}`} hint="Abre para editar ou apagar" onPress={() => router.push({ pathname: '/eu/marco', params: { id: m.id } })}>
            {body}
          </TapCard>
        ) : (
          <Card key={m.id} accessible accessibilityLabel={`${m.title}, ${monthYear(m.date)}. ${m.desc}`}>
            {body}
          </Card>
        )
      })}
      <Button label="Adicionar marco" icon="plus" variant="outline" onPress={() => router.push('/eu/marco')} />
    </Page>
  )
}

export function MilestoneScreen() {
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const profile = useProfile()
  const existing = profile.milestones.find((m) => m.id === id)
  const [type, setType] = useState(existing?.type ?? MILESTONE_TYPES[0])
  const [date, setDate] = useState(existing ? formatBR(existing.date) : '')
  const [desc, setDesc] = useState(existing?.desc ?? '')
  const [error, setError] = useState<string | undefined>()
  const [confirm, setConfirm] = useState(false)
  return (
    <Page title={existing ? 'Editar marco' : 'Adicionar marco'}>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MILESTONE_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </View>
      <TextField label="Data" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <TextField label="Descrição" value={desc} onChangeText={setDesc} placeholder="Conte um pouco sobre esse momento" multiline maxLength={400} />
      <Button
        label="Salvar marco"
        onPress={() => {
          const iso = brToISO(date)
          if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
          profile.saveMilestone({ id: existing?.id, type, date: iso, desc: desc.trim() })
          toast('Marco salvo')
          router.back()
        }}
      />
      {existing && !confirm ? <Button label="Apagar marco" variant="dangerSoft" onPress={() => setConfirm(true)} /> : null}
      {confirm && existing ? <ConfirmCard title="Apagar este marco?" onCancel={() => setConfirm(false)} onConfirm={() => (profile.removeMilestone(existing.id), toast('Marco apagado'), router.back())} /> : null}
    </Page>
  )
}

interface NoteItem {
  key: string
  source: NoteSource
  ref: string
  text: string
  date?: string
  open: () => void
}

/** Todas as anotações num lugar só: Bíblia, culto, curso, célula e notas pessoais. */
export function useAllNotes(): NoteItem[] {
  const bible = useBible()
  const { sermons } = useSermons()
  const { courses } = useChurch()
  const profile = useProfile()
  const items: NoteItem[] = []
  for (const [k, text] of Object.entries(bible.notes)) {
    const [slug, ch, v] = k.split(':')
    const book = BOOKS.find((b) => slugify(b.name) === slug)?.name ?? slug
    items.push({ key: `b${k}`, source: 'Bíblia', ref: `${book} ${ch}:${v}`, text, open: () => router.push({ pathname: '/biblia/nota', params: { livro: slug, capitulo: ch, v } }) })
  }
  for (const s of sermons) {
    for (const [i, n] of s.notes.entries()) items.push({ key: `s${s.id}${i}`, source: 'Culto', ref: s.theme || 'Culto', text: n.text, date: s.date, open: () => router.push({ pathname: '/culto/[id]', params: { id: s.id } }) })
  }
  for (const c of courses) {
    for (const l of c.lessons.filter((x) => x.notes.trim())) items.push({ key: `c${c.id}${l.id}`, source: 'Curso', ref: `${c.name}, ${l.title}`, text: l.notes, date: l.date, open: () => router.push({ pathname: '/igreja/curso/[id]/aula/[aula]', params: { id: c.id, aula: l.id } }) })
  }
  for (const n of profile.notes) items.push({ key: `n${n.id}`, source: n.source, ref: n.ref || 'Nota', text: n.text, date: n.date, open: () => router.push({ pathname: '/eu/nota', params: { id: n.id } }) })
  return items.sort((a, b) => ((b.date ?? '') > (a.date ?? '') ? 1 : -1))
}

/** Trava das anotações, ligada em Configurações > Biometria. */
function NotesGate({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme()
  const s = useSettings()
  if (!s.notesLock || s.notesUnlocked) return <>{children}</>
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={title} onBack={() => router.back()} />
      <NotesLock />
    </View>
  )
}

export function NotesScreen() {
  return (
    <NotesGate title="Anotações">
      <NotesList />
    </NotesGate>
  )
}

function NotesList() {
  const all = useAllNotes()
  const [filter, setFilter] = useState<'Todas' | NoteSource>('Todas')
  const [q, setQ] = useState('')
  const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const list = all.filter((n) => (filter === 'Todas' || n.source === filter) && (!q.trim() || plain(`${n.ref} ${n.text}`).includes(plain(q.trim()))))
  return (
    <Page title="Anotações">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Nova nota" icon="plus" onPress={() => router.push('/eu/nota')} style={{ flex: 1 }} />
        <Button label="Exportar PDF" icon="upload" variant="outline" disabled={all.length === 0} onPress={() => router.push('/eu/exportar')} style={{ flex: 1 }} />
      </View>
      <TextField label="Buscar nas anotações" value={q} onChangeText={setQ} placeholder="Palavra ou referência" autoCorrect={false} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Filtro">
        {(['Todas', ...NOTE_SOURCES] as const).map((s) => (
          <Chip key={s} label={s} selected={filter === s} onPress={() => setFilter(s)} />
        ))}
      </View>
      {all.length === 0 ? <EmptyState text="Nenhuma anotação ainda. Elas aparecem quando você anota um versículo, um culto ou uma aula, ou quando cria uma nota aqui." /> : list.length === 0 ? <EmptyState text="Nenhuma anotação com esse filtro." /> : null}
      {list.map((n) => (
        <TapCard key={n.key} label={`${n.source}. ${n.ref}. ${n.text}`} onPress={n.open}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tag label={n.source} />
            {n.date ? <AppText variant="small" tone="secondary">{formatDayMonth(n.date)}</AppText> : null}
          </View>
          <AppText variant="small" tone="secondary" style={{ fontFamily: fonts.semibold }}>
            {n.ref}
          </AppText>
          <AppText variant="body" numberOfLines={3}>
            {n.text}
          </AppText>
        </TapCard>
      ))}
    </Page>
  )
}

export function NoteEditScreen() {
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const profile = useProfile()
  const existing = profile.notes.find((n) => n.id === id)
  const [source, setSource] = useState<NoteSource>(existing?.source ?? 'Pessoal')
  const [ref, setRef] = useState(existing?.ref ?? '')
  const [text, setText] = useState(existing?.text ?? '')
  const [confirm, setConfirm] = useState(false)
  return (
    <Page title={existing ? 'Anotação' : 'Nova nota'}>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Origem">
        <AppText variant="bodyStrong">Origem</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {NOTE_SOURCES.map((s) => (
            <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s)} />
          ))}
        </View>
      </View>
      <TextField label="Referência (opcional)" value={ref} onChangeText={setRef} placeholder="Ex.: Reunião de quarta, João 15" maxLength={80} />
      <TextField label="Texto" value={text} onChangeText={setText} multiline maxLength={4000} autoFocus={!existing} />
      <Button
        label="Salvar"
        disabled={!text.trim()}
        onPress={() => {
          profile.saveNote({ id: existing?.id, source, ref: ref.trim(), text: text.trim() })
          toast('Anotação salva')
          router.back()
        }}
      />
      {existing && !confirm ? <Button label="Apagar anotação" variant="dangerSoft" onPress={() => setConfirm(true)} /> : null}
      {confirm && existing ? <ConfirmCard title="Apagar esta anotação?" onCancel={() => setConfirm(false)} onConfirm={() => (profile.removeNote(existing.id), toast('Anotação apagada'), router.back())} /> : null}
    </Page>
  )
}

function verseOf(key: string) {
  const [slug, ch, v] = key.split(':')
  const book = BOOKS.find((b) => slugify(b.name) === slug)?.name ?? slug
  return { slug, ch, v, book, ref: `${book} ${ch}:${v}`, text: verseText(book, Number(ch), Number(v)) }
}

export function FavoritesScreen() {
  const bible = useBible()
  const [tab, setTab] = useState<'fav' | 'grifo'>('fav')
  const keys = tab === 'fav' ? bible.favorites : Object.keys(bible.highlights)
  return (
    <Page title="Favoritos e grifos">
      <Segmented label="Lista" value={tab} onChange={setTab} options={[{ id: 'fav', label: `Favoritos (${bible.favorites.length})` }, { id: 'grifo', label: `Grifos (${Object.keys(bible.highlights).length})` }]} />
      {keys.length === 0 ? <EmptyState text={tab === 'fav' ? 'Nenhum versículo favorito. Toque num versículo na Bíblia e escolha Favoritar.' : 'Nenhum versículo grifado. Toque num versículo na Bíblia e escolha Grifar.'} /> : null}
      {keys.map((k) => {
        const v = verseOf(k)
        const color = tab === 'grifo' ? HIGHLIGHTS.find((h) => h.id === bible.highlights[k])?.label : null
        return (
          <TapCard key={k} label={`${v.ref}${color ? `, grifado em ${color.toLowerCase()}` : ''}. ${v.text}`} onPress={() => router.push({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: v.slug, capitulo: v.ch, v: v.v } })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="small" tone="brand" style={{ fontFamily: fonts.semibold }}>
                {v.ref}
              </AppText>
              {color ? <Tag label={color} tone="neutral" /> : null}
            </View>
            <AppText variant="bible">{v.text || 'Texto deste versículo ainda não está na prévia.'}</AppText>
          </TapCard>
        )
      })}
    </Page>
  )
}

const WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function weekDays(offset: number, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - offset * 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
}

function fmtMin(m: number) {
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}min` : `${m} min`
}

function Bars({ days, values, color, label }: { days: string[]; values: number[]; color: string; label: string }) {
  const { colors } = useTheme()
  const max = Math.max(...values, 30)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }} accessible accessibilityLabel={`${label}: ${days.map((_, i) => `${WEEK[i]} ${values[i]} minutos`).join(', ')}`}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View style={{ width: '100%', height: v ? Math.max((v / max) * 96, 6) : 4, borderRadius: 6, backgroundColor: v ? color : colors.line }} />
          <AppText variant="label" tone="secondary">
            {WEEK[i]}
          </AppText>
        </View>
      ))}
    </View>
  )
}

export function ReadingTimeScreen() {
  const { colors } = useTheme()
  const { minutes, activeDays } = useSession()
  const days = weekDays(0)
  const prev = weekDays(1)
  const reading = days.map((d) => minutes[d]?.reading ?? 0)
  const prayer = days.map((d) => minutes[d]?.prayer ?? 0)
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const prevReading = sum(prev.map((d) => minutes[d]?.reading ?? 0))
  const prevPrayer = sum(prev.map((d) => minutes[d]?.prayer ?? 0))
  const diff = (now: number, before: number) => (now === before ? 'igual à semana passada' : `${fmtMin(Math.abs(now - before))} ${now > before ? 'a mais' : 'a menos'} que a semana passada`)
  return (
    <Page title="Leitura e oração">
      <AppText variant="body" tone="secondary">{`${activeDays.length} dias com leitura ou oração no total.`}</AppText>
      <Card style={{ gap: 10 }}>
        <SectionLabel>Leitura nesta semana</SectionLabel>
        <Bars days={days} values={reading} color={colors.primary} label="Leitura nesta semana" />
        <AppText variant="bodyStrong">{fmtMin(sum(reading))}</AppText>
        <AppText variant="small" tone="secondary">
          {diff(sum(reading), prevReading)}
        </AppText>
      </Card>
      <Card style={{ gap: 10 }}>
        <SectionLabel>Oração nesta semana</SectionLabel>
        <Bars days={days} values={prayer} color={colors.accent} label="Oração nesta semana" />
        <AppText variant="bodyStrong">{fmtMin(sum(prayer))}</AppText>
        <AppText variant="small" tone="secondary">
          {diff(sum(prayer), prevPrayer)}
        </AppText>
      </Card>
      <AppText variant="small" tone="secondary">
        O tempo conta enquanto um capítulo está aberto na tela e nos momentos de oração guiada.
      </AppText>
    </Page>
  )
}

export function YearReviewScreen() {
  const { colors } = useTheme()
  const year = String(new Date().getFullYear())
  const { activeDays } = useSession()
  const { readChapters } = useBible()
  const { sermons } = useSermons()
  const { requests } = usePrayer()
  const items = [
    { v: activeDays.filter((d) => d.startsWith(year)).length, l: 'dias com leitura ou oração' },
    { v: new Set(readChapters).size, l: 'capítulos lidos no total' },
    { v: sermons.filter((s) => s.createdAt.startsWith(year)).length, l: 'cultos gravados' },
    { v: requests.filter((r) => r.answeredAt?.startsWith(year)).length, l: 'pedidos respondidos' },
  ]
  return (
    <Page title={`Retrospectiva de ${year}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {items.map((x) => (
          <View key={x.l} style={{ width: '50%', padding: 6 }}>
            <Card style={{ padding: 16, gap: 4 }} accessible accessibilityLabel={`${x.v} ${x.l}`}>
              <AppText style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.primary }}>{x.v}</AppText>
              <AppText variant="small" tone="secondary">
                {x.l}
              </AppText>
            </Card>
          </View>
        ))}
      </View>
      {items.every((x) => x.v === 0) ? <EmptyState text="Ainda não há nada neste ano. A retrospectiva enche conforme você usa o app." /> : null}
      <AppText variant="small" tone="secondary">{`${Math.round((new Set(readChapters).size / TOTAL_CHAPTERS) * 100)}% da Bíblia lida até agora.`}</AppText>
    </Page>
  )
}

export function CellPreviewScreen() {
  const { colors } = useTheme()
  const session = useSession()
  const profile = useProfile()
  const { readChapters } = useBible()
  const books = BOOKS.filter((b) => bookProgress(b, readChapters) === b.chapters).length
  const bday = profile.birthday ? `${Number(profile.birthday.slice(8))} de ${MONTHS[Number(profile.birthday.slice(5, 7)) - 1]}` : null
  const name = session.profile.name || 'Seu nome'
  return (
    <Page title="O que a célula vê">
      <AppText variant="body" tone="secondary">
        É assim que as pessoas da sua célula veem o seu perfil. O telefone aparece só para o líder.
      </AppText>
      <Card style={{ alignItems: 'center', gap: 8 }}>
        {profile.privacy.showPhoto && profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 80, height: 80, borderRadius: 40 }} accessible={false} /> : <Avatar name={name} size={80} />}
        <AppText variant="title">{name}</AppText>
        {profile.privacy.showBirthday && bday ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="gift" size={14} color={colors.textSecondary} />
            <AppText variant="small" tone="secondary">{`Aniversário: ${bday}`}</AppText>
          </View>
        ) : null}
        {profile.privacy.showBooks ? <Tag label={`${books} ${books === 1 ? 'livro lido' : 'livros lidos'}`} /> : null}
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        {(
          [
            ['showPhoto', 'Mostrar foto'],
            ['showBirthday', bday ? 'Mostrar aniversário' : 'Mostrar aniversário (cadastre em Editar perfil)'],
            ['showBooks', 'Mostrar livros lidos'],
          ] as const
        ).map(([k, l], i) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.line }}>
            <AppText variant="body" style={{ flex: 1 }}>
              {l}
            </AppText>
            <Switch label={l} value={profile.privacy[k]} onChange={(v) => profile.setPrivacy({ [k]: v })} />
          </View>
        ))}
      </Card>
    </Page>
  )
}

/** Exporta as anotações escolhidas num PDF, feito no próprio aparelho. */
export function ExportNotesScreen() {
  return (
    <NotesGate title="Exportar anotações">
      <ExportNotesBody />
    </NotesGate>
  )
}

function ExportNotesBody() {
  const toast = useToast()
  const all = useAllNotes()
  const prayer = usePrayer()
  const [pick, setPick] = useState<Record<string, boolean>>({ Bíblia: true, Culto: true, Curso: true, Célula: true, Pessoal: true, Diário: false })
  const diaryLocked = prayer.diaryLock && !prayer.diaryUnlocked
  const [busy, setBusy] = useState(false)

  async function exportPdf() {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    const notes = all.filter((n) => pick[n.source])
    const diary = pick.Diário && !diaryLocked ? prayer.diary : []
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;color:#0F1E3C}h1{font-size:22px}h2{font-size:15px;margin:18px 0 4px}p{font-size:13px;line-height:1.5;white-space:pre-line}small{color:#4B5A7A}</style></head><body><h1>Minhas anotações</h1>${notes
      .map((n) => `<h2>${esc(n.source)}: ${esc(n.ref)}</h2>${n.date ? `<small>${esc(formatBR(n.date))}</small>` : ''}<p>${esc(n.text)}</p>`)
      .join('')}${diary.map((d) => `<h2>Diário de oração</h2><small>${esc(formatBR(d.date))}</small><p>${esc(d.text)}</p>`).join('')}</body></html>`
    setBusy(true)
    try {
      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Minhas anotações' })
      toast('PDF pronto')
    } catch {
      toast('Não foi possível criar o PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Exportar em PDF">
      <AppText variant="body" tone="secondary">
        Escolha o que entra no arquivo. O PDF é feito no seu celular e você escolhe onde guardar ou com quem mandar.
      </AppText>
      {Object.keys(pick).map((k) => (
        <SelectCard
          key={k}
          kind="checkbox"
          label={k === 'Diário' ? 'Diário de oração' : `Anotações: ${k}`}
          description={k === 'Diário' ? (diaryLocked ? 'Desbloqueie o diário em Oração para incluir' : `${prayer.diary.length} entradas`) : `${all.filter((n) => n.source === k).length} anotações`}
          selected={pick[k] && !(k === 'Diário' && diaryLocked)}
          disabled={k === 'Diário' && diaryLocked}
          onPress={() => setPick((p) => ({ ...p, [k]: !p[k] }))}
        />
      ))}
      <Button label={busy ? 'Criando o PDF' : 'Criar PDF'} disabled={busy || !Object.values(pick).some(Boolean)} onPress={exportPdf} />
    </Page>
  )
}
