import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Chip, TextField, useToast } from '../../../components'
import { CAMPAIGN_TYPES, type CampaignType } from '../data'
import { brToISO, daysBetween, maskDate, parseISODate } from '../dates'
import { usePrayer } from '../PrayerContext'
import { PrayerPage } from './parts'

const MAX_DAYS = 365

export function NewCampaignScreen() {
  const toast = useToast()
  const prayer = usePrayer()
  const [name, setName] = useState('')
  const [type, setType] = useState<CampaignType>('Oração')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({})

  function create() {
    const s = brToISO(start)
    const e = brToISO(end)
    const next: typeof errors = {}
    if (!s) next.start = 'Digite a data no formato DD/MM/AAAA.'
    if (!e) next.end = 'Digite a data no formato DD/MM/AAAA.'
    if (s && e) {
      const len = daysBetween(parseISODate(s), parseISODate(e)) + 1
      if (len < 1) next.end = 'O término precisa ser no mesmo dia do início ou depois.'
      else if (len > MAX_DAYS) next.end = 'A campanha pode ter no máximo 365 dias.'
    }
    setErrors(next)
    if (next.start || next.end) return
    const c = prayer.addCampaign({ name, type, start: s!, end: e! })
    toast('Campanha criada')
    router.replace({ pathname: '/oracao/campanhas/[id]', params: { id: c.id } })
  }

  return (
    <PrayerPage title="Nova campanha">
      <TextField label="Nome da campanha" value={name} onChangeText={setName} placeholder="Ex.: 21 dias de oração pela cidade" maxLength={80} />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo">
        <AppText variant="bodyStrong">Tipo</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CAMPAIGN_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </View>
      <TextField
        label="Início"
        value={start}
        onChangeText={(v) => {
          setStart(maskDate(v))
          setErrors((x) => ({ ...x, start: undefined }))
        }}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        error={errors.start}
      />
      <TextField
        label="Término"
        value={end}
        onChangeText={(v) => {
          setEnd(maskDate(v))
          setErrors((x) => ({ ...x, end: undefined }))
        }}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        error={errors.end}
      />
      <Button label="Criar campanha" disabled={!name.trim() || start.length < 10 || end.length < 10} onPress={create} />
    </PrayerPage>
  )
}
