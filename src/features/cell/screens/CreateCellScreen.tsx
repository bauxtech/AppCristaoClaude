import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { AppText, Button, Chip, Page, TextField } from '../../../components'
import { useCell } from '../CellContext'
import { CELL_TYPES, WEEKDAYS_SHORT, WEEKDAYS_LONG, type CellType } from '../data'
import { isValidTime, maskTime } from '../meetings'
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
  initial: { name: string; type: CellType | null; day: number | null; time: string; address: string; reference: string; neighborhood: string }
  submitLabel: (valid: boolean) => string
  onSubmit: (v: { name: string; type: CellType | null; day: number; time: string; address: string; reference: string; neighborhood: string }) => void
  note?: (changed: boolean) => React.ReactNode
  /** Campos a mais antes do botão (ex.: endereço da página, só ao criar). */
  extra?: ReactNode
  onNameChange?: (name: string) => void
}) {
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState<CellType | null>(initial.type)
  const [day, setDay] = useState<number | null>(initial.day)
  const [time, setTime] = useState(initial.time)
  const [address, setAddress] = useState(initial.address)
  const [reference, setReference] = useState(initial.reference)
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood)
  const [tried, setTried] = useState(false)

  const missing = [!name.trim() ? 'o nome' : '', day === null ? 'o dia da semana' : '', !isValidTime(time) ? 'o horário' : ''].filter(Boolean)
  const changed = day !== initial.day || time !== initial.time || address !== initial.address

  return (
    <>
      <TextField label="Nome da célula (obrigatório)" value={name} onChangeText={(v) => (setName(v), onNameChange?.(v))} placeholder="Ex.: Célula dos jovens" maxLength={60} error={tried && !name.trim() ? 'Digite o nome da célula.' : undefined} />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CELL_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(type === t ? null : t)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Dia da semana">
        <AppText variant="bodyStrong">Dia da semana (obrigatório)</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Chip key={d} label={WEEKDAYS_SHORT[d]} selected={day === d} onPress={() => setDay(d)} />
          ))}
        </View>
        {tried && day === null ? (
          <AppText variant="small" tone="danger">
            Escolha o dia da semana.
          </AppText>
        ) : null}
        {day !== null ? (
          <AppText variant="small" tone="secondary">
            {WEEKDAYS_LONG[day]}
          </AppText>
        ) : null}
      </View>
      <TextField label="Horário (obrigatório)" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="20:00" keyboardType="number-pad" error={tried && !isValidTime(time) ? 'Digite o horário no formato 20:00.' : undefined} />
      <TextField label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número" maxLength={120} />
      <TextField label="Ponto de referência" value={reference} onChangeText={setReference} placeholder="Ex.: portão azul, ao lado da padaria" maxLength={120} />
      <TextField label="Bairro" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ex.: Pinheiros" maxLength={60} hint="A página da célula na internet mostra só o bairro." />
      {extra}
      {note?.(changed)}
      {tried && missing.length ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">{`Falta preencher ${missing.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`}</AppText>
      ) : null}
      <Button
        label={submitLabel(missing.length === 0)}
        onPress={() => {
          setTried(true)
          if (missing.length) return
          onSubmit({ name: name.trim(), type, day: day!, time, address: address.trim(), reference: reference.trim(), neighborhood: neighborhood.trim() })
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
        initial={{ name: '', type: null, day: null, time: '20:00', address: '', reference: '', neighborhood: '' }}
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
