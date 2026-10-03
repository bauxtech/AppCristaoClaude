import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, ConfirmCard, EmptyState, Page, SectionLabel, Tag, TapCard, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { formatMeetingDay, formatTime, isValidTime, maskTime } from '../../cell/meetings'
import { brToISO, maskDate } from '../../prayer/dates'
import { useChurch } from '../ChurchContext'

export function MyChurchesScreen() {
  const toast = useToast()
  const { churches, mainId, setMain, removeChurch } = useChurch()
  const [remove, setRemove] = useState<string | null>(null)
  const main = churches.find((x) => x.church.id === mainId)
  const others = churches.filter((x) => x.church.id !== mainId)
  return (
    <Page title="Minhas igrejas">
      {main ? (
        <View style={{ gap: 8 }}>
          <SectionLabel>Igreja que frequento</SectionLabel>
          <Card style={{ gap: 4 }}>
            <AppText variant="bodyStrong">{main.church.name}</AppText>
            <AppText variant="small" tone="secondary">
              {main.church.address || main.church.city}
            </AppText>
          </Card>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <SectionLabel>Igrejas que visito</SectionLabel>
        {others.length === 0 ? <EmptyState text="Nenhuma outra igreja." /> : null}
        {others.map((x) => (
          <Card key={x.church.id} style={{ gap: 8 }}>
            <AppText variant="bodyStrong">{x.church.name}</AppText>
            <AppText variant="small" tone="secondary">
              {x.church.address || x.church.city}
            </AppText>
            {remove === x.church.id ? (
              <ConfirmCard title={`Tirar ${x.church.name} da sua lista?`} message="Você pode vincular de novo depois." confirmLabel="Tirar" onCancel={() => setRemove(null)} onConfirm={() => (removeChurch(x.church.id), setRemove(null), toast('Igreja retirada'))} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Passar a frequentar" variant="soft" size="sm" onPress={() => (setMain(x.church.id), toast(`${x.church.name} agora é a sua igreja`))} style={{ flex: 1 }} />
                <Button label="Tirar" variant="outline" size="sm" onPress={() => setRemove(x.church.id)} />
              </View>
            )}
          </Card>
        ))}
      </View>
      <Button label="Adicionar igreja" icon="plus" variant="outline" onPress={() => router.push('/igreja/buscar')} />
    </Page>
  )
}

export function EventsScreen() {
  const { colors } = useTheme()
  const { main, savedEvents } = useChurch()
  const events = [...(main?.events ?? [])].sort((a, b) => (a.date > b.date ? 1 : -1))
  return (
    <Page title="Eventos">
      <Button label="Adicionar evento" icon="plus" variant="outline" onPress={() => router.push('/igreja/evento-novo')} />
      {events.length === 0 ? <EmptyState text="Nenhum evento da igreja por enquanto. Adicione um evento que você quer lembrar." /> : null}
      {events.map((e) => (
        <TapCard
            key={e.id}
            label={`${e.title}, ${formatMeetingDay(e.date)}${savedEvents.includes(e.id) ? ', na sua agenda' : ''}`}
            onPress={() => router.push({ pathname: '/igreja/evento/[id]', params: { id: e.id } })}
          >
            <AppText variant="small" tone="secondary">
              {formatMeetingDay(e.date)}
            </AppText>
            <AppText variant="bodyStrong">{e.title}</AppText>
            <AppText variant="small" tone="secondary" numberOfLines={2}>
              {e.desc}
            </AppText>
            {savedEvents.includes(e.id) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="check" size={14} color={colors.primary} strokeWidth={2.5} />
                <Tag label="Na sua agenda" />
              </View>
            ) : null}
        </TapCard>
      ))}
    </Page>
  )
}

export function EventDetailScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { main, savedEvents, toggleEvent } = useChurch()
  const { id } = useLocalSearchParams<{ id: string }>()
  const e = main?.events.find((x) => x.id === id)
  if (!e) {
    return (
      <Page title="Evento">
        <EmptyState text="Este evento não existe mais." />
      </Page>
    )
  }
  const saved = savedEvents.includes(e.id)
  return (
    <Page title={e.title}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={16} color={colors.primary} />
          <AppText variant="bodyStrong" style={{ color: colors.primary }}>{`${formatMeetingDay(e.date)}${e.time ? `, ${formatTime(e.time)}` : ''}`}</AppText>
        </View>
        <AppText variant="body">{e.desc}</AppText>
        <AppText variant="small" tone="secondary">
          {main?.name}
        </AppText>
      </Card>
      <Button
        label={saved ? 'Tirar da minha agenda' : 'Salvar na minha agenda'}
        icon={saved ? 'check' : 'calendar'}
        variant={saved ? 'outline' : 'primary'}
        onPress={() => {
          toggleEvent(e.id)
          toast(saved ? 'Evento tirado da agenda' : 'Evento salvo na sua agenda')
        }}
      />
    </Page>
  )
}

export function NewEventScreen() {
  const toast = useToast()
  const { addEvent, main } = useChurch()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | undefined>()
  return (
    <Page title="Adicionar evento">
      <AppText variant="body" tone="secondary">{`O evento fica na sua agenda${main ? `, em ${main.name}` : ''}. Só você vê.`}</AppText>
      <TextField label="Nome do evento (obrigatório)" value={title} onChangeText={setTitle} placeholder="Ex.: Conferência de jovens" maxLength={80} />
      <TextField label="Data (obrigatório)" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="19:00" keyboardType="number-pad" />
      <TextField label="Descrição" value={desc} onChangeText={setDesc} multiline maxLength={400} />
      <Button
        label="Salvar na minha agenda"
        disabled={!title.trim() || date.length < 10}
        onPress={() => {
          const iso = brToISO(date)
          if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
          if (time && !isValidTime(time)) return setError('Digite o horário no formato 19:00.')
          addEvent({ title: title.trim(), date: iso, time: time || undefined, desc: desc.trim() })
          toast('Evento salvo na sua agenda')
          router.back()
        }}
      />
    </Page>
  )
}
