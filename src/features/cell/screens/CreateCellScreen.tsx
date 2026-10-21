import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { AppText, Button, Chip, Page, TextField } from '../../../components'
import { useCell } from '../CellContext'
import { CELL_TYPES, WEEKDAYS_SHORT, WEEKDAYS_LONG, type CellType, type MeetingSlot } from '../data'
import { isValidTime, maskTime, slotsOf } from '../meetings'
import { SLUG_MESSAGE, slugify, type SlugStatus } from '../webPage'
import { SlugField } from './WebPageScreen'

/** Formulário da célula, usado para criar e para editar. */
export function CellForm({
  initial,
  submitLabel,
  onSubmit,
  note,
  extra,
  onNameChange,
}: {
  initial: { name: string; type: CellType | null; slots: MeetingSlot[]; address: string; reference: string; neighborhood: string }
  submitLabel: (valid: boolean) => string
  /** day e time são o primeiro dia da agenda, para quem ainda lê um dia só. */
  onSubmit: (v: { name: string; type: CellType | null; day: number; time: string; slots: MeetingSlot[]; address: string; reference: string; neighborhood: string }) => void
  note?: (changed: boolean) => React.ReactNode
  /** Campos a mais antes do botão (ex.: endereço da página, só ao criar). */
  extra?: ReactNode
  onNameChange?: (name: string) => void
}) {
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState<CellType | null>(initial.type)
  // Um ou mais dias da semana, cada um com o seu horário (21/10).
  const [slots, setSlots] = useState<MeetingSlot[]>(initial.slots)
  const toggleDay = (d: number) => setSlots((list) => (list.some((x) => x.day === d) ? list.filter((x) => x.day !== d) : [...list, { day: d, time: list[list.length - 1]?.time ?? '20:00' }]))
  const setSlotTime = (d: number, t: string) => setSlots((list) => list.map((x) => (x.day === d ? { ...x, time: t } : x)))
  const ordered = slots.length ? slotsOf({ day: slots[0].day, time: slots[0].time, slots }) : []
  const sameSlots = (a: MeetingSlot[], b: MeetingSlot[]) => a.length === b.length && a.every((x) => b.some((y) => y.day === x.day && y.time === x.time))
  const [address, setAddress] = useState(initial.address)
  const [reference, setReference] = useState(initial.reference)
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood)
  const [tried, setTried] = useState(false)

  const missing = [!name.trim() ? 'o nome' : '', slots.length === 0 ? 'o dia da semana' : '', slots.some((x) => !isValidTime(x.time)) ? 'o horário' : ''].filter(Boolean)
  const changed = !sameSlots(slots, initial.slots) || address !== initial.address

  return (
    <>
      <TextField
        label="Nome da célula (obrigatório)"
        value={name}
        onChangeText={(v) => (setName(v), onNameChange?.(v))}
        placeholder="Ex.: Célula dos jovens"
        maxLength={60}
        error={tried && !name.trim() ? 'Digite o nome da célula.' : undefined}
      />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CELL_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(type === t ? null : t)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }} accessibilityLabel="Dias da semana">
        <AppText variant="bodyStrong">Dias da reunião (obrigatório)</AppText>
        <AppText variant="small" tone="secondary">
          Marque um ou mais dias. Cada dia pode ter o seu horário.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Chip key={d} label={WEEKDAYS_SHORT[d]} selected={slots.some((x) => x.day === d)} onPress={() => toggleDay(d)} />
          ))}
        </View>
        {tried && slots.length === 0 ? (
          <AppText variant="small" tone="danger">
            Escolha pelo menos um dia da semana.
          </AppText>
        ) : null}
      </View>
      {ordered.map((x) => (
        <TextField
          key={x.day}
          label={`Horário de ${WEEKDAYS_LONG[x.day].toLowerCase()} (obrigatório)`}
          value={x.time}
          onChangeText={(v) => setSlotTime(x.day, maskTime(v))}
          placeholder="20:00"
          keyboardType="number-pad"
          error={tried && !isValidTime(x.time) ? 'Digite o horário no formato 20:00.' : undefined}
        />
      ))}
      <TextField label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número" maxLength={120} />
      <TextField label="Ponto de referência" value={reference} onChangeText={setReference} placeholder="Ex.: portão azul, ao lado da padaria" maxLength={120} />
      <TextField label="Bairro" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ex.: Pinheiros" maxLength={60} hint="A página da célula na internet mostra só o bairro." />
      {extra}
      {note?.(changed)}
      {tried && missing.length ? <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">{`Falta preencher ${missing.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`}</AppText> : null}
      <Button
        label={submitLabel(missing.length === 0)}
        onPress={() => {
          setTried(true)
          if (missing.length) return
          onSubmit({ name: name.trim(), type, day: ordered[0].day, time: ordered[0].time, slots: ordered, address: address.trim(), reference: reference.trim(), neighborhood: neighborhood.trim() })
        }}
      />
    </>
  )
}

export function CreateCellScreen() {
  const { createCell } = useCell()
  // O endereço segue o nome até o líder mexer nele.
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus | 'checking' | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  return (
    <Page title="Criar célula">
      <CellForm
        initial={{ name: '', type: null, slots: [], address: '', reference: '', neighborhood: '' }}
        submitLabel={(valid) => (valid ? 'Criar e convidar pessoas' : 'Criar célula')}
        onNameChange={(n) => {
          if (!slugTouched) setSlug(slugify(n))
        }}
        extra={
          <View style={{ gap: 6 }}>
            <SlugField
              value={slug}
              onChange={(v) => {
                setSlugTouched(true)
                setSlug(v)
                setSlugError(null)
              }}
              onStatus={setSlugStatus}
            />
            <AppText variant="small" tone="secondary">
              É o link da página da célula na internet. Pode deixar em branco e escolher depois.
            </AppText>
            {slugError ? (
              <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
                {slugError}
              </AppText>
            ) : null}
          </View>
        }
        onSubmit={(v) => {
          // Endereço que não vale ou já é de outra célula: o líder escolhe outro antes de criar.
          // Sem internet para conferir, a célula é criada e o banco confere; se estiver tomado, fica sem endereço.
          if (slug && slugStatus && slugStatus !== 'ok' && slugStatus !== 'checking' && slugStatus !== 'failed') {
            setSlugError(SLUG_MESSAGE[slugStatus])
            return
          }
          createCell({ ...v, ...(slug ? { webSlug: slug } : {}) })
          router.replace({ pathname: '/celula/convidar', params: { nova: '1' } })
        }}
      />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        Você pode preencher o resto depois.
      </AppText>
    </Page>
  )
}
