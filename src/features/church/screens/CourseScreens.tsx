import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useImagePicker } from '../../../lib/useImagePicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Image, Linking, Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, ConfirmCard, EmptyState, IconButton, Page, ProgressBar, SectionLabel, Switch, Tag, TapCard, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { formatMeetingDay, formatTime, isValidTime, maskTime } from '../../cell/meetings'
import { brToISO, formatBR, maskDate } from '../../prayer/dates'
import { toISODate } from '../../prayer/data'
import { useChurch } from '../ChurchContext'
import { COURSE_TYPES, PHOTO_SAMPLE, type Course, type Lesson, type Material } from '../data'

function courseStats(c: Course, today = toISODate(new Date())) {
  const past = c.lessons.filter((l) => l.date <= today)
  const marked = past.filter((l) => l.present !== undefined)
  const present = marked.filter((l) => l.present).length
  const next = c.lessons.find((l) => l.date > today)
  return {
    done: past.length,
    total: c.lessons.length,
    attendance: marked.length ? Math.round((present / marked.length) * 100) : null,
    next,
  }
}

export function CoursesScreen() {
  const { colors } = useTheme()
  const { courses } = useChurch()
  const active = courses.filter((c) => !c.completedAt)
  const done = courses.filter((c) => c.completedAt)
  return (
    <Page title="Cursos">
      {courses.length === 0 ? <EmptyState text="Nenhum curso cadastrado. Adicione pela foto do cronograma ou à mão." /> : null}
      {active.map((c) => {
        const s = courseStats(c)
        return (
          <TapCard key={c.id} label={`${c.name}, em andamento. Aula ${s.done} de ${s.total}${s.attendance !== null ? `, presença ${s.attendance} por cento` : ''}`} onPress={() => router.push({ pathname: '/igreja/curso/[id]', params: { id: c.id } })}>
            <View style={{ alignItems: 'flex-start', gap: 6 }}>
              <Tag label="Em andamento" />
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="small" tone="secondary">{`Aula ${s.done} de ${s.total}${s.attendance !== null ? ` · Presença: ${s.attendance}%` : ''}`}</AppText>
            </View>
            <View style={{ marginTop: 8 }}>
              <ProgressBar value={s.done} max={s.total} label={`Aula ${s.done} de ${s.total}`} />
            </View>
          </TapCard>
        )
      })}
      {done.length ? <SectionLabel>Concluídos</SectionLabel> : null}
      {done.map((c) => (
        <TapCard key={c.id} label={`${c.name}, concluído em ${formatBR(c.completedAt!)}`} onPress={() => router.push({ pathname: '/igreja/curso/[id]', params: { id: c.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="award" size={18} color={colors.primary} />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {c.name}
            </AppText>
            <Tag label="Concluído" tone="neutral" />
          </View>
        </TapCard>
      ))}
      <Button label="Curso pela foto do cronograma" icon="camera" variant="outline" onPress={() => router.push('/igreja/curso-foto')} />
      <Button label="Adicionar curso à mão" icon="plus" variant="outline" onPress={() => router.push('/igreja/curso-novo')} />
    </Page>
  )
}

function useCourse() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { courses } = useChurch()
  return courses.find((c) => c.id === id)
}

export function CourseDetailScreen() {
  const { colors } = useTheme()
  const c = useCourse()
  if (!c) return <Page title="Curso"><EmptyState text="Este curso não existe mais." /></Page>
  const s = courseStats(c)
  const today = toISODate(new Date())
  return (
    <Page title={c.name}>
      {c.completedAt ? (
        <Card style={{ gap: 6, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="award" size={20} color={colors.primary} />
            <AppText variant="bodyStrong" tone="brand">{`Curso concluído em ${formatBR(c.completedAt)}`}</AppText>
          </View>
          <AppText variant="small" tone="secondary">
            {c.certificate ? `Certificado guardado: ${c.certificate.name}` : 'Certificado ainda não guardado'}
          </AppText>
          <Button label="Ver conclusão" variant="text" size="sm" onPress={() => router.push({ pathname: '/igreja/curso/[id]/conclusao', params: { id: c.id } })} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [`${s.done}/${s.total}`, 'Aulas'],
          [s.attendance !== null ? `${s.attendance}%` : 'Sem dados', 'Presença'],
          [s.next ? `${formatBR(s.next.date).slice(0, 5)} ${formatTime(s.next.time)}` : 'Nenhuma', 'Próxima'],
        ].map(([v, l]) => (
          <View key={l} accessible accessibilityLabel={`${l}: ${v}`} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', gap: 2 }}>
            <AppText style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.primary }}>{v}</AppText>
            <AppText variant="small" tone="secondary">
              {l}
            </AppText>
          </View>
        ))}
      </View>
      <Button label="Começar revisão" icon="book" variant="soft" onPress={() => router.push({ pathname: '/igreja/curso/[id]/revisao', params: { id: c.id } })} />
      <SectionLabel>Aulas</SectionLabel>
      {c.lessons.map((l, i) => {
        const past = l.date <= today
        const status = l.present === true ? 'presente' : l.present === false ? 'faltou' : past ? 'presença não marcada' : 'a fazer'
        return (
          <TapCard key={l.id} label={`Aula ${i + 1}, ${l.title}, ${formatMeetingDay(l.date)}, ${status}`} onPress={() => router.push({ pathname: '/igreja/curso/[id]/aula/[aula]', params: { id: c.id, aula: l.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: l.present ? colors.primary : colors.bg, borderWidth: l.present ? 0 : 1, borderColor: colors.line }}>
                {l.present ? <Icon name="check" size={14} color={colors.primaryText} strokeWidth={3} /> : <AppText variant="small" style={{ fontFamily: fonts.semibold, color: colors.textSecondary }}>{i + 1}</AppText>}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{`Aula ${i + 1}: ${l.title}`}</AppText>
                <AppText variant="small" tone="secondary">{`${formatMeetingDay(l.date)} · ${status.replace(/^./, (x) => x.toUpperCase())}`}</AppText>
              </View>
            </View>
          </TapCard>
        )
      })}
      <SectionLabel>Prova ou entrega</SectionLabel>
      <TapCard label={c.exam ? `Prova, ${formatMeetingDay(c.exam.date)}` : 'Marcar prova ou entrega'} onPress={() => router.push({ pathname: '/igreja/curso/[id]/prova', params: { id: c.id } })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="calendar" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="body">{c.exam ? 'Prova final' : 'Marcar prova ou entrega'}</AppText>
            {c.exam ? <AppText variant="small" tone="secondary">{`${formatMeetingDay(c.exam.date)}, ${formatTime(c.exam.time)}${c.exam.reminder ? ' · Com lembrete' : ''}`}</AppText> : null}
          </View>
        </View>
      </TapCard>
      {!c.completedAt ? <Button label="Concluir curso" onPress={() => router.push({ pathname: '/igreja/curso/[id]/conclusao', params: { id: c.id } })} /> : null}
    </Page>
  )
}

export function LessonScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { updateCourse } = useChurch()
  const c = useCourse()
  const { aula } = useLocalSearchParams<{ aula: string }>()
  const idx = c?.lessons.findIndex((l) => l.id === aula) ?? -1
  const l = c && idx >= 0 ? c.lessons[idx] : undefined
  const [notes, setNotes] = useState(l?.notes ?? '')
  const { pickImage, permissionSheet } = useImagePicker()
  if (!c || !l) return <Page title="Aula"><EmptyState text="Esta aula não existe mais." /></Page>
  const setLesson = (patch: Partial<Lesson>) => updateCourse(c.id, (x) => ({ ...x, lessons: x.lessons.map((y) => (y.id === l.id ? { ...y, ...patch } : y)) }))
  const addMaterial = (m: Omit<Material, 'id'>) => {
    setLesson({ materials: [...l.materials, { ...m, id: `mt${Date.now()}` }] })
    toast(`${m.kind} adicionado`)
  }

  return (
    <Page title={`Aula ${idx + 1}: ${l.title}`}>
      {permissionSheet}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Presença</AppText>
          <AppText variant="small" tone="secondary">{`${formatMeetingDay(l.date)}, ${formatTime(l.time)}`}</AppText>
        </View>
        <Switch label={`Presente na aula ${idx + 1}`} value={!!l.present} onChange={(v) => setLesson({ present: v })} />
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionLabel>Material</SectionLabel>
        {l.materials.length === 0 ? <AppText variant="body" tone="secondary">Nenhum material nesta aula.</AppText> : null}
        {l.materials.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {m.kind === 'Foto' ? (
              <Image source={{ uri: m.uri }} style={{ width: 48, height: 48, borderRadius: 8 }} accessible={false} />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.kind === 'PDF' ? 'file' : 'volume'} size={20} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <AppText variant="body" numberOfLines={1}>
                {m.name}
              </AppText>
              <AppText variant="small" tone="secondary">
                {m.kind}
              </AppText>
            </View>
            <IconButton icon="external" label={`Abrir ${m.name}`} onPress={() => (toast(`Abrindo ${m.name}`), Linking.openURL(m.uri).catch(() => {}))} />
            <IconButton icon="trash" label={`Apagar ${m.name}`} onPress={() => setLesson({ materials: l.materials.filter((x) => x.id !== m.id) })} />
          </View>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label="Foto da apostila"
            icon="camera"
            variant="soft"
            size="sm"
            onPress={async () => {
              const uri = await pickImage('camera', 'para fotografar a apostila', { quality: 0.7 })
              if (uri) addMaterial({ name: `Foto da aula ${idx + 1}`, kind: 'Foto', uri })
            }}
          />
          <Button
            label="Da galeria"
            icon="image"
            variant="soft"
            size="sm"
            onPress={async () => {
              const uri = await pickImage('library', '', { quality: 0.7 })
              if (uri) addMaterial({ name: `Foto da aula ${idx + 1}`, kind: 'Foto', uri })
            }}
          />
          <Button
            label="PDF"
            icon="file"
            variant="soft"
            size="sm"
            onPress={async () => {
              const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
              if (!res.canceled && res.assets[0]) addMaterial({ name: res.assets[0].name, kind: 'PDF', uri: res.assets[0].uri })
            }}
          />
          <Button
            label="Áudio da aula"
            icon="volume"
            variant="soft"
            size="sm"
            onPress={async () => {
              const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true })
              if (!res.canceled && res.assets[0]) addMaterial({ name: res.assets[0].name, kind: 'Áudio', uri: res.assets[0].uri })
            }}
          />
        </View>
        <AppText variant="small" tone="secondary">
          Gravar a aula e transformar em texto chega com o fluxo do culto, que usa o mesmo gravador.
        </AppText>
      </Card>

      <TextField label="Anotações da aula" value={notes} onChangeText={setNotes} placeholder="Escreva o que aprendeu nesta aula" multiline maxLength={4000} />
      <Button
        label="Salvar anotações"
        variant="outline"
        disabled={notes === l.notes}
        onPress={() => {
          setLesson({ notes })
          toast('Anotações salvas')
        }}
      />
      <Button label="Revisar o curso" icon="book" variant="soft" onPress={() => router.push({ pathname: '/igreja/curso/[id]/revisao', params: { id: c.id } })} />
    </Page>
  )
}

/** Cartões com frente e verso. A pessoa marca se acertou e vê o resultado no fim. */
export function ReviewScreen() {
  const { colors } = useTheme()
  const c = useCourse()
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])
  if (!c) return <Page title="Revisão"><EmptyState text="Este curso não existe mais." /></Page>
  if (c.cards.length === 0) {
    return (
      <Page title="Revisão">
        <EmptyState text="Os cartões de revisão são criados a partir das aulas e do material. Este curso ainda não tem cartões." />
      </Page>
    )
  }
  const done = answers.length === c.cards.length
  if (done) {
    const right = answers.filter(Boolean).length
    const pct = Math.round((right / c.cards.length) * 100)
    const wrong = c.cards.filter((_, j) => !answers[j])
    return (
      <Page title="Resultado da revisão">
        <View style={{ alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: colors.primarySoft, gap: 4 }} accessible accessibilityLabel={`${pct} por cento de acertos, ${right} de ${c.cards.length} cartões`}>
          <AppText style={{ fontFamily: fonts.bold, fontSize: 44, color: colors.primary }}>{`${pct}%`}</AppText>
          <AppText variant="bodyStrong">Acertos</AppText>
          <AppText variant="small" tone="secondary">{`${right} de ${c.cards.length} cartões`}</AppText>
        </View>
        <Card style={{ gap: 8 }}>
          <SectionLabel>Para rever</SectionLabel>
          {wrong.length === 0 ? <AppText variant="body" tone="secondary">Nada para rever. Você acertou todos.</AppText> : null}
          {wrong.map((w) => (
            <View key={w.q} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Icon name="close" size={14} color={colors.danger} strokeWidth={3} />
              <AppText variant="body" style={{ flex: 1 }}>
                {w.q}
              </AppText>
            </View>
          ))}
        </Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Refazer" variant="outline" onPress={() => (setI(0), setAnswers([]), setFlipped(false))} style={{ flex: 1 }} />
          <Button label="Fechar" onPress={() => router.back()} style={{ flex: 1 }} />
        </View>
      </Page>
    )
  }
  const card = c.cards[i]
  return (
    <Page title={`Cartão ${i + 1} de ${c.cards.length}`}>
      <Pressable
        onPress={() => setFlipped((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${flipped ? 'Resposta' : 'Pergunta'}: ${flipped ? card.a : card.q}`}
        accessibilityHint={flipped ? 'Toque para ver a pergunta' : 'Toque para ver a resposta'}
        style={{ minHeight: 220, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: flipped ? colors.primary : colors.line, backgroundColor: flipped ? colors.primarySoft : colors.card, alignItems: 'center', justifyContent: 'center', gap: 12 }}
      >
        <AppText variant="label" tone="secondary">
          {flipped ? 'RESPOSTA' : 'PERGUNTA'}
        </AppText>
        <AppText variant="title" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
          {flipped ? card.a : card.q}
        </AppText>
        <AppText variant="small" tone="secondary">
          {flipped ? 'Toque para ver a pergunta' : 'Toque para ver a resposta'}
        </AppText>
      </Pressable>
      {flipped ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Errei" icon="close" variant="outline" onPress={() => (setAnswers((a) => [...a, false]), setI((x) => Math.min(x + 1, c.cards.length - 1)), setFlipped(false))} style={{ flex: 1 }} />
          <Button label="Acertei" icon="check" onPress={() => (setAnswers((a) => [...a, true]), setI((x) => Math.min(x + 1, c.cards.length - 1)), setFlipped(false))} style={{ flex: 1 }} />
        </View>
      ) : (
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          Pense na resposta e toque no cartão.
        </AppText>
      )}
      <ProgressBar value={answers.length} max={c.cards.length} label={`${answers.length} de ${c.cards.length} cartões respondidos`} />
    </Page>
  )
}

export function ExamScreen() {
  const toast = useToast()
  const { updateCourse } = useChurch()
  const c = useCourse()
  const [date, setDate] = useState(c?.exam ? formatBR(c.exam.date) : '')
  const [time, setTime] = useState(c?.exam?.time ?? '09:00')
  const [place, setPlace] = useState(c?.exam?.place ?? '')
  const [reminder, setReminder] = useState(c?.exam?.reminder ?? true)
  const [error, setError] = useState<string | undefined>()
  if (!c) return <Page title="Prova"><EmptyState text="Este curso não existe mais." /></Page>
  return (
    <Page title="Prova ou entrega">
      <TextField label="Data" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="09:00" keyboardType="number-pad" />
      <TextField label="Local (opcional)" value={place} onChangeText={setPlace} placeholder="Ex.: Sala 3" maxLength={60} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Lembrete</AppText>
          <AppText variant="small" tone="secondary">
            Aviso um dia antes
          </AppText>
        </View>
        <Switch label="Lembrete um dia antes" value={reminder} onChange={setReminder} />
      </Card>
      <Button
        label="Salvar"
        onPress={() => {
          const iso = brToISO(date)
          if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
          if (!isValidTime(time)) return setError('Digite o horário no formato 09:00.')
          updateCourse(c.id, (x) => ({ ...x, exam: { date: iso, time, place: place.trim(), reminder } }))
          toast(reminder ? 'Prova salva, com lembrete' : 'Prova salva')
          router.back()
        }}
      />
    </Page>
  )
}

export function CourseCompleteScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { updateCourse } = useChurch()
  const c = useCourse()
  const [confirm, setConfirm] = useState(false)
  if (!c) return <Page title="Conclusão"><EmptyState text="Este curso não existe mais." /></Page>
  const s = courseStats(c)
  const remaining = s.total - s.done

  if (!c.completedAt) {
    return (
      <Page title="Concluir curso">
        <AppText variant="body">{remaining > 0 ? `Ainda faltam ${remaining} ${remaining === 1 ? 'aula' : 'aulas'} pelo calendário. Quer marcar o curso como concluído mesmo assim?` : `Marcar ${c.name} como concluído?`}</AppText>
        {confirm ? null : <Button label="Concluir curso" onPress={() => setConfirm(true)} />}
        {confirm ? (
          <ConfirmCard
            title="Concluir o curso?"
            message="Você pode guardar o certificado e registrar o marco no seu perfil."
            confirmLabel="Concluir"
            danger={false}
            onCancel={() => setConfirm(false)}
            onConfirm={() => updateCourse(c.id, (x) => ({ ...x, completedAt: toISODate(new Date()) }))}
          />
        ) : null}
      </Page>
    )
  }

  return (
    <Page title="Curso concluído">
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 16 }}>
        <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="award" size={40} color={colors.primary} />
        </View>
        <AppText variant="screenTitle" accessibilityRole="header">
          Parabéns!
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>{`Você concluiu o ${c.name}.`}</AppText>
      </View>
      {c.certificate ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="checkCircle" size={18} color={colors.primary} />
          <AppText variant="body" style={{ flex: 1 }}>{`Certificado guardado: ${c.certificate.name}`}</AppText>
        </Card>
      ) : (
        <Button
          label="Guardar certificado"
          icon="upload"
          onPress={async () => {
            const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
            if (res.canceled || !res.assets[0]) return
            updateCourse(c.id, (x) => ({ ...x, certificate: { name: res.assets[0].name, uri: res.assets[0].uri } }))
            toast('Certificado guardado')
          }}
        />
      )}
      {c.milestone ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="checkCircle" size={18} color={colors.primary} />
          <AppText variant="body" style={{ flex: 1 }}>
            Marco registrado no seu perfil
          </AppText>
        </Card>
      ) : (
        <Button label="Registrar no perfil" icon="star" variant="outline" onPress={() => (updateCourse(c.id, (x) => ({ ...x, milestone: true })), toast('Marco registrado no seu perfil'))} />
      )}
      <Button label="Voltar aos cursos" variant="text" onPress={() => router.dismissTo('/igreja/cursos')} />
    </Page>
  )
}

/** Lista de aulas semanais a partir da primeira data. */
function weeklyLessons(firstISO: string, count: number, time: string, titles?: string[]): Lesson[] {
  const [y, m, d] = firstISO.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => ({
    id: `l${Date.now().toString(36)}${i}`,
    title: titles?.[i]?.trim() || `Aula ${i + 1}`,
    date: toISODate(new Date(y, m - 1, d + i * 7)),
    time,
    notes: '',
    materials: [],
  }))
}

export function CourseByPhotoScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { setCourses } = useChurch()
  const [photo, setPhoto] = useState<string | null>(null)
  const [name, setName] = useState(PHOTO_SAMPLE.name)
  const [type, setType] = useState(PHOTO_SAMPLE.type)
  const [first, setFirst] = useState('')
  const [count, setCount] = useState(String(PHOTO_SAMPLE.lessons))
  const [time, setTime] = useState(PHOTO_SAMPLE.time)
  const [error, setError] = useState<string | undefined>()
  const { pickImage, permissionSheet } = useImagePicker()

  async function take(source: 'camera' | 'library' = 'camera') {
    const uri = await pickImage(source, 'para fotografar o cronograma do curso', { quality: 0.7 })
    if (uri) setPhoto(uri)
  }

  if (!photo) {
    return (
      <Page title="Curso pela foto">
        {permissionSheet}
        <View style={{ aspectRatio: 16 / 9, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="camera" size={36} color={colors.primary} />
          <AppText variant="small" style={{ color: colors.primary }}>
            Foto do cronograma
          </AppText>
        </View>
        <Button label="Tirar foto do cronograma" icon="camera" onPress={() => take('camera')} />
        <Button label="Escolher da galeria" icon="image" variant="outline" onPress={() => take('library')} />
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          O app lê o nome do curso, as datas e os horários. Você confere antes de salvar.
        </AppText>
      </Page>
    )
  }

  return (
    <Page title="Conferir o curso">
      <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }} accessibilityLabel="Foto do cronograma" />
      <AppText variant="small" tone="secondary">
        Na prévia, os dados lidos são de exemplo. Confira e corrija o que precisar.
      </AppText>
      <TextField label="Nome do curso" value={name} onChangeText={setName} maxLength={80} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        {COURSE_TYPES.map((t) => (
          <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>
      <TextField label="Data da primeira aula" value={first} onChangeText={(v) => (setFirst(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <TextField label="Quantidade de aulas" value={count} onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
      <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} keyboardType="number-pad" />
      <AppText variant="small" tone="secondary">
        As aulas ficam uma por semana, a partir da primeira data.
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Tirar outra foto" variant="outline" onPress={() => setPhoto(null)} style={{ flex: 1 }} />
        <Button
          label="Salvar curso"
          disabled={!name.trim() || !Number(count)}
          onPress={() => {
            const iso = brToISO(first)
            if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
            if (!isValidTime(time)) return setError('Digite o horário no formato 09:00.')
            setCourses((x) => [...x, { id: `c${Date.now()}`, name: name.trim(), type, lessons: weeklyLessons(iso, Number(count), time), cards: [] }])
            toast('Curso salvo')
            router.back()
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Page>
  )
}

export function AddCourseScreen() {
  const toast = useToast()
  const { setCourses } = useChurch()
  const [name, setName] = useState('')
  const [type, setType] = useState<string | null>(null)
  const [lessons, setLessons] = useState([{ title: '', date: '', time: '' }])
  const [error, setError] = useState<string | undefined>()
  const setL = (i: number, patch: Partial<(typeof lessons)[number]>) => setLessons((x) => x.map((y, j) => (j === i ? { ...y, ...patch } : y)))
  return (
    <Page title="Adicionar curso">
      <TextField label="Nome do curso (obrigatório)" value={name} onChangeText={setName} placeholder="Ex.: Curso de batismo" maxLength={80} />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {COURSE_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </View>
      {lessons.map((l, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>{`Aula ${i + 1}`}</AppText>
            {lessons.length > 1 ? <IconButton icon="trash" label={`Remover aula ${i + 1}`} onPress={() => setLessons((x) => x.filter((_, j) => j !== i))} /> : null}
          </View>
          <TextField label={`Tema da aula ${i + 1}`} value={l.title} onChangeText={(v) => setL(i, { title: v })} maxLength={80} />
          <TextField label={`Data da aula ${i + 1}`} value={l.date} onChangeText={(v) => (setL(i, { date: maskDate(v) }), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" />
          <TextField label={`Horário da aula ${i + 1}`} value={l.time} onChangeText={(v) => setL(i, { time: maskTime(v) })} placeholder="09:00" keyboardType="number-pad" />
        </Card>
      ))}
      <Button label="Acrescentar aula" icon="plus" variant="outline" onPress={() => setLessons((x) => [...x, { title: '', date: '', time: x[x.length - 1]?.time ?? '' }])} />
      {error ? <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
      <Button
        label="Salvar curso"
        disabled={!name.trim()}
        onPress={() => {
          const parsed = lessons.map((l) => ({ ...l, iso: brToISO(l.date) }))
          const bad = parsed.findIndex((l) => !l.iso || (l.time && !isValidTime(l.time)))
          if (bad >= 0) return setError(`Confira a data e o horário da aula ${bad + 1}.`)
          setCourses((x) => [
            ...x,
            {
              id: `c${Date.now()}`,
              name: name.trim(),
              type: type ?? 'Outro',
              lessons: parsed.map((l, i) => ({ id: `l${Date.now().toString(36)}${i}`, title: l.title.trim() || `Aula ${i + 1}`, date: l.iso!, time: l.time || '09:00', notes: '', materials: [] })),
              cards: [],
            },
          ])
          toast('Curso adicionado')
          router.back()
        }}
      />
    </Page>
  )
}
