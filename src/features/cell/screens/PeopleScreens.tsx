import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { AppText, Avatar, Button, Card, Chip, ConfirmCard, Page, SectionLabel, Switch, Tag, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { formatPhoneNumber, onlyDigits } from '../../onboarding/validation'
import { toISODate } from '../../prayer/data'
import { useCell } from '../CellContext'
import type { Cell, Member } from '../data'
import { formatMeeting, missedTwoWeeks, nextMeeting } from '../meetings'
import { can, ROLE_LABEL, ROLES } from '../permissions'
import { CellGuard } from './Guard'
import { setMemberSeatRemote } from '../sync'
import type { SeatState } from '../../subscription/plan'

export function formatPhone(p: string) {
  const d = onlyDigits(p)
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${formatPhoneNumber(d.slice(2))}` : p
}

/** Presença rápida. Líder e auxiliar. */
export function AttendanceScreen() {
  return <CellGuard title="Presença" action="markAttendance">{(cell) => <Attendance cell={cell} />}</CellGuard>
}

function Attendance({ cell }: { cell: Cell }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const people = cell.members.filter((m) => m.role !== 'visitante')
  const [present, setPresent] = useState<Record<string, boolean>>(() => Object.fromEntries(people.map((m) => [m.id, false])))
  const next = nextMeeting(cell)
  const count = Object.values(present).filter(Boolean).length

  return (
    <Page title="Presença">
      <AppText variant="label" tone="secondary" accessibilityLiveRegion="polite">{`${next ? formatMeeting(next).toUpperCase() : ''} · ${count} ${count === 1 ? 'PRESENTE' : 'PRESENTES'}`}</AppText>
      <Card style={{ paddingVertical: 4 }}>
        {people.map((m, i) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: i < people.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <Avatar name={m.name} size={36} uri={m.photoUri} />
            <View style={{ flex: 1 }}>
              <AppText variant="body">{m.isMe ? `${m.name} (você)` : m.name}</AppText>
              {!m.active ? <AppText variant="small" tone="secondary">Inativo</AppText> : null}
            </View>
            <Switch label={`${m.name} presente`} value={!!present[m.id]} onChange={(v) => setPresent((x) => ({ ...x, [m.id]: v }))} />
          </View>
        ))}
      </Card>
      <Button label="Registrar visitante" icon="plus" variant="outline" onPress={() => router.push('/celula/visitante')} />
      {cell.visitors.length ? (
        <Card style={{ gap: 6 }}>
          <SectionLabel>Visitantes registrados</SectionLabel>
          {cell.visitors.map((v) => (
            <AppText key={v.id} variant="body">{`${v.name}, retorno em ${v.followUpAt.split('-').reverse().join('/')}`}</AppText>
          ))}
        </Card>
      ) : null}
      <Button
        label="Salvar presença"
        onPress={() => {
          update((c) => ({
            ...c,
            members: c.members.map((m) => (m.id in present ? { ...m, lastAttendance: [...m.lastAttendance, !!present[m.id]].slice(-4) } : m)),
            history: { ...c.history, meetings: c.history.meetings + 1 },
          }))
          toast('Presença salva')
          router.back()
        }}
      />
    </Page>
  )
}

export function VisitorScreen() {
  const toast = useToast()
  const { update } = useCell()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [reminder, setReminder] = useState(true)
  return (
    <CellGuard title="Registrar visitante" action="markAttendance">
      {() => (
        <Page title="Registrar visitante">
          <TextField label="Nome (obrigatório)" value={name} onChangeText={setName} placeholder="Nome completo" maxLength={80} />
          <TextField label="Telefone ou WhatsApp" value={phone} onChangeText={(v) => setPhone(onlyDigits(v).slice(0, 11))} placeholder="11 99999-9999" keyboardType="phone-pad" hint="Só o líder vê o telefone." />
          <TextField label="Observações" value={notes} onChangeText={setNotes} placeholder="Como conheceu a célula" multiline maxLength={300} />
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Lembrete para dar retorno</AppText>
              <AppText variant="small" tone="secondary">
                Avisamos o líder em 7 dias
              </AppText>
            </View>
            <Switch label="Lembrete para dar retorno" value={reminder} onChange={setReminder} />
          </Card>
          <Button
            label="Salvar visitante"
            disabled={!name.trim()}
            onPress={() => {
              const follow = new Date()
              follow.setDate(follow.getDate() + 7)
              update((c) => ({
                ...c,
                visitors: [...c.visitors, { id: `v${Date.now()}`, name: name.trim(), phone, date: toISODate(new Date()), notes: notes.trim(), followUpAt: toISODate(follow) }],
              }))
              toast(reminder ? 'Visitante salvo. Lembrete em 7 dias' : 'Visitante salvo')
              router.back()
            }}
          />
        </Page>
      )}
    </CellGuard>
  )
}

export function MembersScreen() {
  const { colors } = useTheme()
  return (
    <CellGuard title="Membros" action="participate">
      {(cell) => {
        const leader = can(cell.myRole, 'manageMembers')
        const order = [...cell.members].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
        return (
          <Page title="Membros">
            <AppText variant="small" tone="secondary">{`${cell.members.length} pessoas · ${cell.members.filter((m) => !m.active).length} inativas`}</AppText>
            {leader && cell.seats ? (
              <AppText variant="small" tone="secondary">{`Vagas sem plano: ${cell.seats.total - cell.seats.left} de ${cell.seats.total} em uso`}</AppText>
            ) : null}
            <Card style={{ paddingVertical: 4 }}>
              {order.map((m, i) => {
                const seatTag = leader && !m.isMe ? SEAT_TAG[m.seat ?? ''] : undefined
                const label = `${m.isMe ? `${m.name} (você)` : m.name}, ${ROLE_LABEL[m.role]}${seatTag ? `, ${seatTag.toLowerCase()}` : !m.active ? ', inativo' : ''}${leader && missedTwoWeeks(m.lastAttendance) ? ', faltou 2 semanas' : ''}`
                const row = (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: i < order.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                    <Avatar name={m.name} strong={m.isMe} uri={m.photoUri} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="body">{m.isMe ? `${m.name} (você)` : m.name}</AppText>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <AppText variant="small" tone="secondary">
                          {ROLE_LABEL[m.role]}
                        </AppText>
                        {seatTag ? <Tag label={seatTag} tone={m.seat === 'none' ? 'accent' : 'neutral'} /> : !m.active ? <Tag label="Inativo" tone="neutral" /> : null}
                        {leader && !m.isMe && missedTwoWeeks(m.lastAttendance) ? <Tag label="Faltou 2 semanas" tone="accent" /> : null}
                      </View>
                    </View>
                    {leader && !m.isMe ? <Icon name="chevronRight" size={16} color={colors.lineStrong} /> : null}
                  </View>
                )
                return leader && !m.isMe ? (
                  <Pressable key={m.id} onPress={() => router.push({ pathname: '/celula/membro/[id]', params: { id: m.id } })} accessibilityRole="button" accessibilityLabel={label}>
                    {row}
                  </Pressable>
                ) : (
                  <View key={m.id} accessible accessibilityLabel={label}>
                    {row}
                  </View>
                )
              })}
            </Card>
            <AppText variant="small" tone="secondary">
              {leader && cell.seats
                ? 'Quem está sem vaga vê a reunião e confirma presença, mas não vê pedidos, escala e avisos, e sai da escala. Para dar ou trocar uma vaga, abra a pessoa.'
                : 'Quem está inativo sai da escala.'}
            </AppText>
          </Page>
        )
      }}
    </CellGuard>
  )
}

/** Situação da vaga na lista do líder. Quem tem plano próprio não precisa de etiqueta. */
const SEAT_TAG: Record<string, string | undefined> = { seat: 'Com vaga', none: 'Sem vaga' }

/** O líder dá ou tira a vaga. Para trocar, tira de uma pessoa e dá para outra. */
function SeatCard({ cell, m }: { cell: Cell; m: Member & { seat: SeatState } }) {
  const toast = useToast()
  const { refresh } = useCell()
  const [busy, setBusy] = useState(false)
  const first = m.name.split(' ')[0]
  const left = cell.seats?.left ?? 0

  async function set(give: boolean) {
    setBusy(true)
    const r = await setMemberSeatRemote(cell.id, m.id, give)
    await refresh()
    setBusy(false)
    if (r === 'ok') toast(give ? `${first} agora usa uma vaga` : `A vaga de ${first} ficou livre`)
    else toast(r === 'full' ? 'Todas as vagas estão em uso' : 'Não foi possível mudar a vaga. Tente de novo.')
  }

  const text =
    m.seat === 'plan' ? `${first} tem plano próprio e não usa vaga.`
    : m.seat === 'visitor' ? 'Visitante não ocupa vaga. Ao virar membro, pega uma vaga livre, se houver.'
    : m.seat === 'seat' ? `${first} usa uma das vagas sem plano da célula.`
    : left > 0 ? `${first} está sem vaga: vê a reunião e confirma presença, mas não vê pedidos, escala e avisos.`
    : `${first} está sem vaga e todas estão em uso. Para trocar, tire a vaga de outra pessoa e volte aqui.`

  return (
    <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
      <AppText variant="bodyStrong">Vaga na célula</AppText>
      <AppText variant="small" tone="secondary">{text}</AppText>
      {cell.seats ? <AppText variant="small" tone="secondary">{`${cell.seats.total - left} de ${cell.seats.total} vagas em uso`}</AppText> : null}
      {m.seat === 'seat' ? <Button label="Tirar vaga" variant="outline" size="sm" disabled={busy} onPress={() => void set(false)} style={{ alignSelf: 'flex-start' }} /> : null}
      {m.seat === 'none' ? <Button label="Dar vaga" size="sm" disabled={busy || left <= 0} onPress={() => void set(true)} style={{ alignSelf: 'flex-start' }} /> : null}
    </Card>
  )
}

export function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <CellGuard title="Membro" action="manageMembers">
      {(cell) => {
        const m = cell.members.find((x) => x.id === id)
        if (!m) {
          return (
            <Page title="Membro">
              <AppText variant="body">Esta pessoa não está mais na célula.</AppText>
            </Page>
          )
        }
        return <MemberDetail cell={cell} m={m} />
      }}
    </CellGuard>
  )
}

function MemberDetail({ cell, m }: { cell: Cell; m: Member }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const [confirm, setConfirm] = useState(false)
  const first = m.name.split(' ')[0]

  return (
    <Page title="Membro">
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
        <Avatar name={m.name} size={72} uri={m.photoUri} />
        <AppText variant="title" accessibilityRole="header">
          {m.name}
        </AppText>
        <AppText variant="small" tone="secondary">{`Na célula desde ${m.since.split('-').reverse().slice(1).join('/')}`}</AppText>
        {m.seat === 'none' ? <Tag label="Sem vaga" tone="accent" /> : !m.active && !m.seat ? <Tag label="Inativo: não assinou o app" tone="neutral" /> : null}
      </View>

      {missedTwoWeeks(m.lastAttendance) ? (
        <Card style={{ flexDirection: 'row', gap: 8, borderColor: colors.accent }}>
          <Icon name="alert" size={16} color={colors.accent} />
          <AppText variant="small" style={{ flex: 1 }}>{`${first} faltou nas últimas 2 semanas. Considere entrar em contato.`}</AppText>
        </Card>
      ) : null}

      {m.seat && cell.myRole === 'lider' ? <SeatCard cell={cell} m={m as Member & { seat: SeatState }} /> : null}

      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Papel na célula">
        <AppText variant="bodyStrong">Papel na célula</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROLES.filter((r) => r !== 'lider' || cell.myRole === 'lider').map((r) => (
            <Chip
              key={r}
              label={ROLE_LABEL[r]}
              selected={m.role === r}
              onPress={() => {
                update((c) => ({ ...c, members: c.members.map((x) => (x.id === m.id ? { ...x, role: r } : x)) }))
                toast(`${first} agora é ${ROLE_LABEL[r].toLowerCase()}`)
              }}
            />
          ))}
        </View>
        <AppText variant="small" tone="secondary">
          {cell.myRole === 'lider' ? 'A célula pode ter mais de um líder, com as mesmas permissões. ' : ''}O auxiliar marca presença e edita a escala. O anfitrião não tem permissão a mais.
        </AppText>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Presença nas últimas reuniões</AppText>
        {m.lastAttendance.length === 0 ? (
          <AppText variant="body" tone="secondary">
            Ainda sem reuniões registradas.
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {m.lastAttendance.map((v, i) => (
              <View key={i} accessible accessibilityLabel={`Reunião ${i + 1}: ${v ? 'presente' : 'faltou'}`} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: v ? colors.primarySoft : colors.dangerSoft }}>
                  <Icon name={v ? 'check' : 'close'} size={16} color={v ? colors.primary : colors.danger} strokeWidth={2.5} />
                </View>
                <AppText variant="label" tone="secondary">
                  {v ? 'Veio' : 'Faltou'}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>

      {m.phone ? (
        <Card style={{ gap: 10 }}>
          <SectionLabel>Contato</SectionLabel>
          <AppText variant="body">{formatPhone(m.phone)}</AppText>
          <AppText variant="small" tone="secondary">
            Só o líder vê o telefone.
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="WhatsApp"
              icon="whatsapp"
              variant="outline"
              size="sm"
              onPress={() => {
                toast('Abrindo o WhatsApp')
                Linking.openURL(`https://wa.me/55${onlyDigits(m.phone)}`).catch(() => {})
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Ligar"
              icon="phone"
              variant="outline"
              size="sm"
              onPress={() => {
                toast('Abrindo o telefone')
                Linking.openURL(`tel:+55${onlyDigits(m.phone)}`).catch(() => {})
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : null}

      {confirm ? (
        <ConfirmCard
          title={`Remover ${m.name} da célula?`}
          message="A pessoa deixa de ver a célula. Para voltar, precisa de um novo convite."
          confirmLabel="Remover"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            update((c) => ({ ...c, members: c.members.filter((x) => x.id !== m.id), schedule: c.schedule.map((s) => (s.memberId === m.id ? { ...s, memberId: null } : s)) }))
            toast(`${m.name} saiu da célula`)
            router.back()
          }}
        />
      ) : (
        <Button label="Remover da célula" variant="dangerSoft" onPress={() => setConfirm(true)} />
      )}
    </Page>
  )
}
