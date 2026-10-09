import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Chip, IconButton, Page, SectionLabel, Switch, TextField, useToast } from '../../../components'
import { WEEKDAYS_SHORT, WEEKDAYS_LONG } from '../../cell/data'
import { formatTime, isValidTime, maskTime } from '../../cell/meetings'
import { toISODate } from '../../prayer/data'
import { canEditServices, useChurch } from '../ChurchContext'
import { IS_REMOTE } from '../../../lib/supabase'

/** Igreja do CNPJ ainda não tem quem edite no servidor (decisão em aberto): o que a pessoa informa fica no celular dela. */
const LOCAL_ONLY = 'Por enquanto, o que você informa sobre esta igreja fica só no seu celular. Outras pessoas ainda não veem.'
import type { Accessibility, Service } from '../data'
import { ACCESS_ITEMS } from './format'

export function EditServicesScreen() {
  const toast = useToast()
  const { main, updateChurch } = useChurch()
  const [services, setServices] = useState<Service[]>(main?.services ?? [])
  const [address, setAddress] = useState(main?.address ?? '')
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState('')
  if (!main) return <Page title="Horários de culto">{null}</Page>
  if (!canEditServices()) {
    return (
      <Page title="Horários de culto">
        <AppText variant="body">Você não pode editar os horários desta igreja.</AppText>
      </Page>
    )
  }
  const sorted = [...services].sort((a, b) => a.day - b.day || (a.time > b.time ? 1 : -1))
  return (
    <Page title="Horários de culto">
      <AppText variant="body" tone="secondary">
        {main.name}
      </AppText>
      {IS_REMOTE && main.source === 'cnpj' ? (
        <AppText variant="small" tone="secondary">
          {LOCAL_ONLY}
        </AppText>
      ) : null}
      <Card style={{ gap: 4 }}>
        <SectionLabel>Horários</SectionLabel>
        {sorted.length === 0 ? <AppText variant="body" tone="secondary">Nenhum horário ainda.</AppText> : null}
        {sorted.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="body" style={{ flex: 1 }}>{`${WEEKDAYS_LONG[s.day]}, ${formatTime(s.time)}`}</AppText>
            <IconButton icon="trash" label={`Remover ${WEEKDAYS_LONG[s.day]}, ${formatTime(s.time)}`} onPress={() => setServices((x) => x.filter((y) => y.id !== s.id))} />
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          Acrescentar horário
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Dia">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <Chip key={d} label={WEEKDAYS_SHORT[d]} selected={day === d} onPress={() => setDay(d)} />
          ))}
        </View>
        <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="19:30" keyboardType="number-pad" />
        <Button
          label="Acrescentar"
          icon="plus"
          variant="soft"
          disabled={day === null || !isValidTime(time)}
          onPress={() => {
            setServices((x) => [...x, { id: `s${Date.now()}`, day: day!, time }])
            setTime('')
          }}
        />
      </Card>
      {main.source === 'manual' ? (
        <TextField label="Endereço" value={address} onChangeText={setAddress} maxLength={160} />
      ) : (
        <AppText variant="small" tone="secondary">
          Nome e endereço vêm dos dados públicos do CNPJ e não são editados aqui.
        </AppText>
      )}
      <Button
        label="Salvar"
        onPress={() => {
          updateChurch(main.id, (c) => ({ ...c, services, address: c.source === 'manual' ? address.trim() : c.address }))
          toast('Horários salvos')
          router.back()
        }}
      />
    </Page>
  )
}

/** Acessibilidade preenchida pelos usuários (funcionalidades, fluxo 8). */
export function EditAccessibilityScreen() {
  const toast = useToast()
  const { main, updateChurch } = useChurch()
  const [a, setA] = useState<Accessibility>(main?.accessibility ?? {})
  if (!main) return <Page title="Informar acessibilidade">{null}</Page>
  return (
    <Page title="Informar acessibilidade">
      <AppText variant="body" tone="secondary">{IS_REMOTE && main.source === 'cnpj' ? `Conte o que existe em ${main.name}. ${LOCAL_ONLY}` : `Conte o que existe em ${main.name}. Outras pessoas veem o que você informar.`}</AppText>
      {ACCESS_ITEMS.map((it) => (
        <Card key={it.key} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {it.label}
            </AppText>
            <Switch label={it.label} value={!!a[it.key]} onChange={(v) => setA((x) => ({ ...x, [it.key]: v }))} />
          </View>
          {a[it.key] === undefined ? (
            <AppText variant="small" tone="secondary">
              Ninguém informou ainda. Ligue se existe, ou deixe desligado se não existe.
            </AppText>
          ) : null}
          {it.key === 'libras' && a.libras ? (
            <TextField label="Em quais cultos?" value={a.librasServices ?? ''} onChangeText={(v) => setA((x) => ({ ...x, librasServices: v }))} placeholder="Ex.: Culto da noite de domingo" maxLength={80} />
          ) : null}
        </Card>
      ))}
      <Button
        label="Salvar"
        onPress={() => {
          const filled = Object.fromEntries(ACCESS_ITEMS.map((it) => [it.key, !!a[it.key]]))
          updateChurch(main.id, (c) => ({ ...c, accessibility: { ...a, ...filled, librasServices: a.libras ? a.librasServices : undefined, updatedAt: toISODate(new Date()) } }))
          toast('Acessibilidade salva')
          router.back()
        }}
      />
    </Page>
  )
}
