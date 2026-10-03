import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, View } from 'react-native'
import { AppText, Avatar, Button, Card, EmptyState, Page, ProgressBar, SectionLabel, Segmented, Switch, Tag, TextField, useToast } from '../../../components'
import { fonts } from '../../../theme/typography'
import { useBible } from '../../bible/BibleContext'
import { planState } from '../../bible/plans'
import { onlyDigits } from '../../onboarding/validation'
import { formatAgo } from '../../prayer/dates'
import { usePrayer } from '../../prayer/PrayerContext'
import { memberName, useCell } from '../CellContext'
import { useBlockedIds } from '../../settings/SettingsContext'
import type { Cell } from '../data'
import { formatMeeting, nextMeeting } from '../meetings'
import { CellGuard } from './Guard'
import { ReportButton } from './CommunityScreens'

/** Pedidos da célula. Visitante não vê (regra decidida). */
export function CellPrayersScreen() {
  return <CellGuard title="Pedidos da célula" action="seePrayers">{(cell) => <CellPrayers cell={cell} />}</CellGuard>
}

function CellPrayers({ cell }: { cell: Cell }) {
  const blockedIds = useBlockedIds()
  const toast = useToast()
  const { update } = useCell()
  const prayer = usePrayer()
  const mine = prayer.requests.filter((r) => r.shared && !r.answeredAt)
  const others = cell.prayers.filter((p) => !cell.hidden.includes(p.id) && !blockedIds.has(p.memberId))

  return (
    <Page title="Pedidos da célula">
      <Button label="Novo pedido para a célula" icon="plus" variant="outline" onPress={() => router.push('/celula/pedido-novo')} />
      {others.length === 0 && mine.length === 0 ? <EmptyState text="Nenhum pedido na célula ainda." /> : null}
      {mine.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tag label="Seu pedido" />
            <AppText variant="small" tone="secondary">{`Criado ${formatAgo(r.createdAt)}`}</AppText>
          </View>
          <AppText variant="body">{r.text || r.title}</AppText>
          <AppText variant="small" tone="secondary">{`${r.prayedBy.length} ${r.prayedBy.length === 1 ? 'pessoa avisou' : 'pessoas avisaram'} que orou`}</AppText>
        </Card>
      ))}
      {others.map((p) => {
        const name = memberName(cell, p.memberId) ?? 'Alguém da célula'
        const first = name.split(' ')[0]
        return (
          <Card key={p.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={name} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                  {name}
                </AppText>
                <AppText variant="body">{p.text}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <AppText variant="small" tone="secondary" style={{ flex: 1 }}>{`${p.prayedCount + (p.iPrayed ? 1 : 0)} pessoas oraram`}</AppText>
              <Button
                label={p.iPrayed ? 'Orei' : 'Orar por este pedido'}
                icon={p.iPrayed ? 'check' : undefined}
                variant={p.iPrayed ? 'primary' : 'soft'}
                size="sm"
                onPress={() => update((c) => ({ ...c, prayers: c.prayers.map((x) => (x.id === p.id ? { ...x, iPrayed: !x.iPrayed, notified: x.iPrayed ? false : x.notified } : x)) }))}
              />
            </View>
            {p.iPrayed && !p.notified ? (
              <Button
                label={`Avisar ${first} que orei`}
                variant="text"
                size="sm"
                onPress={() => {
                  update((c) => ({ ...c, prayers: c.prayers.map((x) => (x.id === p.id ? { ...x, notified: true } : x)) }))
                  toast(`${first} vai saber que você orou`)
                }}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
            {p.notified ? <AppText variant="small" tone="secondary">{`${first} foi avisado que você orou`}</AppText> : null}
            <View style={{ alignItems: 'flex-end' }}>
              <ReportButton what="este pedido" onReport={() => update((c) => ({ ...c, hidden: [...c.hidden, p.id] }))} />
            </View>
          </Card>
        )
      })}
    </Page>
  )
}

export function NewCellRequestScreen() {
  const toast = useToast()
  const prayer = usePrayer()
  const [text, setText] = useState('')
  return (
    <CellGuard title="Novo pedido" action="seePrayers">
      {(cell) => (
        <Page title="Novo pedido">
          <TextField label="Seu pedido" value={text} onChangeText={setText} placeholder="Escreva seu pedido de oração" multiline maxLength={2000} />
          <AppText variant="small" tone="secondary">{`As pessoas de ${cell.name} vão ver este pedido. Visitantes não veem. Você para de compartilhar quando quiser, em Oração, Pedidos.`}</AppText>
          <Button
            label="Enviar para a célula"
            disabled={!text.trim()}
            onPress={() => {
              prayer.addRequest({ text, shared: true })
              toast('Pedido enviado para a célula')
              router.back()
            }}
          />
        </Page>
      )}
    </CellGuard>
  )
}

/** Carona. O WhatsApp só abre depois que o pedido é aceito (regra decidida). */
export function CarpoolScreen() {
  return <CellGuard title="Carona" action="participate">{(cell) => <Carpool cell={cell} />}</CellGuard>
}

function Carpool({ cell }: { cell: Cell }) {
  const toast = useToast()
  const { update } = useCell()
  const [mode, setMode] = useState<'pedir' | 'oferecer'>('pedir')
  const [from, setFrom] = useState('')
  const [seats, setSeats] = useState('2')
  const next = nextMeeting(cell)
  const mineOffer = cell.rides.find((r) => r.driverId === 'me')
  const offers = cell.rides.filter((r) => r.driverId !== 'me')

  return (
    <Page title="Carona">
      <AppText variant="body" tone="secondary">{next ? `Para a reunião de ${formatMeeting(next).replace(' · ', ', às ')}.` : 'Sem reunião marcada.'}</AppText>
      <Segmented label="Carona" value={mode} onChange={setMode} options={[{ id: 'pedir', label: 'Pedir carona' }, { id: 'oferecer', label: 'Oferecer carona' }]} />

      {mode === 'pedir' ? (
        offers.length === 0 ? (
          <EmptyState text="Ninguém ofereceu carona para esta reunião ainda." />
        ) : (
          offers.map((r) => {
            const driver = memberName(cell, r.driverId) ?? 'Alguém'
            const first = driver.split(' ')[0]
            const my = r.requests.find((q) => q.memberId === 'me')
            const phone = cell.members.find((m) => m.id === r.driverId)?.phone ?? ''
            return (
              <Card key={r.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Avatar name={driver} size={36} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{`${driver}, saindo de ${r.from}`}</AppText>
                    <AppText variant="small" tone="secondary">{`${r.seats} ${r.seats === 1 ? 'vaga' : 'vagas'}`}</AppText>
                  </View>
                </View>
                {!my ? (
                  <Button
                    label="Pedir carona"
                    size="sm"
                    onPress={() => {
                      update((c) => ({ ...c, rides: c.rides.map((x) => (x.id === r.id ? { ...x, requests: [...x.requests, { memberId: 'me', status: 'pending' }] } : x)) }))
                      toast(`Pedido enviado para ${first}`)
                    }}
                  />
                ) : my.status === 'pending' ? (
                  <View style={{ gap: 4 }}>
                    <Tag label="Aguardando resposta" tone="neutral" />
                    <AppText variant="small" tone="secondary">{`O WhatsApp de ${first} aparece quando o pedido for aceito.`}</AppText>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Tag label="Pedido aceito" />
                    <Button
                      label={`Conversar com ${first} no WhatsApp`}
                      icon="chat"
                      size="sm"
                      onPress={() => {
                        toast('Abrindo o WhatsApp')
                        Linking.openURL(`https://wa.me/55${onlyDigits(phone)}`).catch(() => {})
                      }}
                    />
                  </View>
                )}
              </Card>
            )
          })
        )
      ) : mineOffer ? (
        <Card style={{ gap: 10 }}>
          <AppText variant="bodyStrong">{`Sua carona: saindo de ${mineOffer.from}, ${mineOffer.seats} ${mineOffer.seats === 1 ? 'vaga' : 'vagas'}`}</AppText>
          {mineOffer.requests.length === 0 ? <AppText variant="body" tone="secondary">Ninguém pediu ainda.</AppText> : null}
          {mineOffer.requests.map((q) => {
            const name = memberName(cell, q.memberId) ?? 'Alguém'
            const phone = cell.members.find((m) => m.id === q.memberId)?.phone ?? ''
            return (
              <View key={q.memberId} style={{ gap: 6 }}>
                <AppText variant="body">{name}</AppText>
                {q.status === 'pending' ? (
                  <Button
                    label={`Aceitar ${name.split(' ')[0]}`}
                    size="sm"
                    onPress={() => update((c) => ({ ...c, rides: c.rides.map((x) => (x.id === mineOffer.id ? { ...x, requests: x.requests.map((y) => (y.memberId === q.memberId ? { ...y, status: 'accepted' } : y)) } : x)) }))}
                  />
                ) : (
                  <Button
                    label={`Conversar com ${name.split(' ')[0]} no WhatsApp`}
                    icon="chat"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      toast('Abrindo o WhatsApp')
                      Linking.openURL(`https://wa.me/55${onlyDigits(phone)}`).catch(() => {})
                    }}
                  />
                )}
              </View>
            )
          })}
          <Button label="Cancelar carona" variant="text" size="sm" onPress={() => update((c) => ({ ...c, rides: c.rides.filter((x) => x.id !== mineOffer.id) }))} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <TextField label="Bairro de saída" value={from} onChangeText={setFrom} placeholder="Ex.: Centro" maxLength={40} />
          <TextField label="Vagas" value={seats} onChangeText={(v) => setSeats(onlyDigits(v).slice(0, 1))} keyboardType="number-pad" />
          <Button
            label="Anunciar carona"
            disabled={!from.trim() || !Number(seats)}
            onPress={() => {
              update((c) => ({ ...c, rides: [...c.rides, { id: `r${Date.now()}`, driverId: 'me', from: from.trim(), seats: Number(seats), requests: [] }] }))
              toast('Carona anunciada')
            }}
          />
        </Card>
      )}
    </Page>
  )
}

/** Plano de leitura em grupo, com o progresso de quem aceitou mostrar. */
export function GroupReadingScreen() {
  return <CellGuard title="Plano de leitura" action="participate">{(cell) => <GroupReading cell={cell} />}</CellGuard>
}

function GroupReading({ cell }: { cell: Cell }) {
  const toast = useToast()
  const { update } = useCell()
  const bible = useBible()
  const plan = bible.planDef(cell.readingPlan.planId)
  const me = cell.members.find((m) => m.isMe)!
  const showing = cell.members.filter((m) => m.showReadingProgress && (!m.isMe || cell.readingPlan.joined))

  if (!plan) {
    return (
      <Page title="Plano de leitura">
        {cell.myRole === 'lider' ? (
          <>
            <AppText variant="body" tone="secondary">
              Escolha um plano para a célula ler junto.
            </AppText>
            {bible.plans.map((p) => (
              <Button key={p.id} label={p.name} variant="outline" onPress={() => update((c) => ({ ...c, readingPlan: { planId: p.id, joined: false } }))} />
            ))}
          </>
        ) : (
          <EmptyState text="A célula ainda não tem um plano de leitura em grupo." />
        )}
      </Page>
    )
  }

  return (
    <Page title="Plano de leitura">
      <Card style={{ gap: 4 }}>
        <SectionLabel>Plano em grupo</SectionLabel>
        <AppText variant="title">{plan.name}</AppText>
        <AppText variant="body" tone="secondary">{`Leitura de hoje: ${planState(plan, bible.progress[plan.id]).todayLabel}`}</AppText>
      </Card>
      {cell.readingPlan.joined ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Mostrar meu progresso</AppText>
            <AppText variant="small" tone="secondary">
              A célula vê quanto você já leu
            </AppText>
          </View>
          <Switch label="Mostrar meu progresso para a célula" value={!!me.showReadingProgress} onChange={(v) => update((c) => ({ ...c, members: c.members.map((m) => (m.isMe ? { ...m, showReadingProgress: v } : m)) }))} />
        </Card>
      ) : (
        <Button
          label="Participar do plano"
          onPress={() => {
            update((c) => ({ ...c, readingPlan: { ...c.readingPlan, joined: true } }))
            toast('Você entrou no plano da célula')
          }}
        />
      )}
      <Card style={{ gap: 14 }}>
        <SectionLabel>Progresso de quem mostra</SectionLabel>
        {showing.length === 0 ? <AppText variant="body" tone="secondary">Ninguém está mostrando o progresso.</AppText> : null}
        {showing.map((m) => (
          <View key={m.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="body">{m.isMe ? `${m.name} (você)` : m.name}</AppText>
              <AppText variant="small" tone="secondary">{`${m.readingProgress ?? 0}%`}</AppText>
            </View>
            <ProgressBar value={m.readingProgress ?? 0} max={100} label={`${m.name}, ${m.readingProgress ?? 0} por cento`} />
          </View>
        ))}
        <AppText variant="small" tone="secondary">
          Só aparece aqui quem escolheu mostrar.
        </AppText>
      </Card>
    </Page>
  )
}
