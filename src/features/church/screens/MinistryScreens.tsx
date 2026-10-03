import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Avatar, Button, Card, Chip, ConfirmCard, EmptyState, Page, Sheet, Switch, Tag, TapCard, TextField, useToast } from '../../../components'
import { formatMeetingDay, formatTime, isValidTime, maskTime } from '../../cell/meetings'
import { brToISO, maskDate } from '../../prayer/dates'
import { useChurch } from '../ChurchContext'
import { MINISTRY_AREAS, MINISTRY_PEOPLE, type Ministry } from '../data'

export function MinistriesScreen() {
  const toast = useToast()
  const { ministries, setMinistries } = useChurch()
  const [swap, setSwap] = useState<Ministry | null>(null)
  const [remove, setRemove] = useState<string | null>(null)
  const set = (id: string, patch: Partial<Ministry>) => setMinistries((x) => x.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  return (
    <Page title="Ministérios">
      {ministries.length === 0 ? <EmptyState text="Você ainda não cadastrou onde serve." /> : null}
      {ministries.map((m) => (
        <Card key={m.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <AppText variant="bodyStrong">{m.area}</AppText>
            <Tag label={m.role} />
          </View>
          <View style={{ gap: 2 }}>
            <AppText variant="label" tone="secondary">
              PRÓXIMA ESCALA
            </AppText>
            <AppText variant="body">{`${formatMeetingDay(m.nextDate)}, ${formatTime(m.nextTime)}${m.detail ? `, ${m.detail}` : ''}`}</AppText>
            {m.swapWith ? <AppText variant="small" tone="secondary">{`Troca pedida para ${m.swapWith}`}</AppText> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label={m.confirmed ? 'Presença confirmada' : 'Confirmar presença'}
              icon={m.confirmed ? 'check' : undefined}
              variant={m.confirmed ? 'primary' : 'soft'}
              size="sm"
              onPress={() => {
                set(m.id, { confirmed: !m.confirmed })
                toast(m.confirmed ? 'Confirmação desfeita' : 'Presença confirmada')
              }}
            />
            <Button label="Pedir troca" variant="outline" size="sm" onPress={() => setSwap(m)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
              Lembrete um dia antes
            </AppText>
            <Switch label={`Lembrete da escala de ${m.area}`} value={m.reminder} onChange={(v) => set(m.id, { reminder: v })} />
          </View>
          {remove === m.id ? (
            <ConfirmCard title={`Tirar ${m.area} da sua lista?`} confirmLabel="Tirar" onCancel={() => setRemove(null)} onConfirm={() => (setMinistries((x) => x.filter((y) => y.id !== m.id)), setRemove(null))} />
          ) : (
            <Button label="Tirar ministério" variant="text" size="sm" onPress={() => setRemove(m.id)} style={{ alignSelf: 'flex-start' }} />
          )}
        </Card>
      ))}
      <Button label="Adicionar ministério" icon="plus" variant="outline" onPress={() => router.push('/igreja/ministerio-novo')} />
      <Sheet visible={!!swap} onClose={() => setSwap(null)} title={swap ? `Pedir troca, ${swap.area}` : ''}>
        <AppText variant="body" tone="secondary">
          Escolha com quem trocar:
        </AppText>
        {MINISTRY_PEOPLE.map((n) => (
          <PersonRow
            key={n}
            name={n}
            onPress={() => {
              if (swap) set(swap.id, { swapWith: n })
              setSwap(null)
              toast(`Pedido de troca enviado para ${n}`)
            }}
          />
        ))}
        <Button label="Cancelar" variant="text" onPress={() => setSwap(null)} />
      </Sheet>
    </Page>
  )
}

export function AddMinistryScreen() {
  const toast = useToast()
  const { setMinistries } = useChurch()
  const [area, setArea] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [role, setRole] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const name = area === 'Outro' ? other.trim() : area
  return (
    <Page title="Adicionar ministério">
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Onde você serve">
        <AppText variant="bodyStrong">Onde você serve</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MINISTRY_AREAS.map((a) => (
            <Chip key={a} label={a} selected={area === a} onPress={() => setArea(a)} />
          ))}
        </View>
      </View>
      {area === 'Outro' ? <TextField label="Nome do ministério" value={other} onChangeText={setOther} maxLength={40} /> : null}
      <TextField label="Sua função" value={role} onChangeText={setRole} placeholder="Ex.: Músico, recepcionista" maxLength={40} />
      <TextField label="Data da próxima escala" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
      <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="09:00" keyboardType="number-pad" />
      <TextField label="Detalhe (opcional)" value={detail} onChangeText={setDetail} placeholder="Ex.: Guitarra" maxLength={40} />
      <Button
        label="Salvar"
        disabled={!name || !role.trim()}
        onPress={() => {
          const iso = date ? brToISO(date) : null
          if (date && !iso) return setError('Digite a data no formato DD/MM/AAAA.')
          if (time && !isValidTime(time)) return setError('Digite o horário no formato 09:00.')
          setMinistries((x) => [...x, { id: `m${Date.now()}`, area: name!, role: role.trim(), nextDate: iso ?? new Date().toISOString().slice(0, 10), nextTime: time || '09:00', detail: detail.trim(), confirmed: false, reminder: true }])
          toast('Ministério adicionado')
          router.back()
        }}
      />
    </Page>
  )
}

function PersonRow({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <TapCard label={`Trocar com ${name}`} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} size={32} />
        <AppText variant="body">{name}</AppText>
      </View>
    </TapCard>
  )
}
