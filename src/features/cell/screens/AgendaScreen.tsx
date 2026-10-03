import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, ConfirmCard, Page, Tag, TextField, useToast } from '../../../components'
import { brToISO, maskDate } from '../../prayer/dates'
import { useCell } from '../CellContext'
import { formatMeeting, isValidTime, maskTime, upcomingMeetings } from '../meetings'
import { can } from '../permissions'
import { CellGuard } from './Guard'

export function AgendaScreen() {
  const toast = useToast()
  const { update } = useCell()
  const [cancelDate, setCancelDate] = useState<string | null>(null)
  const [extraOpen, setExtraOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [error, setError] = useState<string | undefined>()

  return (
    <CellGuard title="Agenda de reuniões">
      {(cell) => {
        const meetings = upcomingMeetings(cell)
        const manage = can(cell.myRole, 'manageAgenda')
        return (
          <Page title="Agenda de reuniões">
            {meetings.map((m) => (
              <Card key={m.date + m.time} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <AppText variant="bodyStrong" style={{ flexShrink: 1, textDecorationLine: m.cancelled ? 'line-through' : 'none' }}>
                    {formatMeeting(m)}
                  </AppText>
                  {m.extra ? <Tag label="Encontro extra" /> : null}
                  {m.cancelled ? <Tag label="Cancelada" tone="danger" /> : null}
                </View>
                {manage && !m.cancelled ? (
                  cancelDate === m.date ? (
                    <ConfirmCard
                      title="Cancelar esta reunião?"
                      message="Todas as pessoas da célula vão receber um aviso."
                      confirmLabel="Cancelar reunião"
                      onCancel={() => setCancelDate(null)}
                      onConfirm={() => {
                        update((c) => ({ ...c, cancelledDates: [...c.cancelledDates, m.date] }))
                        setCancelDate(null)
                        toast('Reunião cancelada. Todos foram avisados')
                      }}
                    />
                  ) : (
                    <Button label="Cancelar reunião" variant="text" size="sm" onPress={() => setCancelDate(m.date)} style={{ alignSelf: 'flex-start' }} />
                  )
                ) : null}
                {manage && m.cancelled ? (
                  <Button
                    label="Desfazer cancelamento"
                    variant="text"
                    size="sm"
                    onPress={() => update((c) => ({ ...c, cancelledDates: c.cancelledDates.filter((d) => d !== m.date) }))}
                    style={{ alignSelf: 'flex-start' }}
                  />
                ) : null}
              </Card>
            ))}
            {manage ? (
              extraOpen ? (
                <Card style={{ gap: 12 }}>
                  <AppText variant="bodyStrong" accessibilityRole="header">
                    Encontro extra
                  </AppText>
                  <TextField label="Data" value={date} onChangeText={(v) => (setDate(maskDate(v)), setError(undefined))} placeholder="DD/MM/AAAA" keyboardType="number-pad" error={error} />
                  <TextField label="Horário" value={time} onChangeText={(v) => setTime(maskTime(v))} placeholder="19:00" keyboardType="number-pad" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Cancelar" variant="outline" onPress={() => setExtraOpen(false)} style={{ flex: 1 }} />
                    <Button
                      label="Marcar"
                      onPress={() => {
                        const iso = brToISO(date)
                        if (!iso) return setError('Digite a data no formato DD/MM/AAAA.')
                        if (iso < new Date().toISOString().slice(0, 10)) return setError('A data precisa ser hoje ou depois.')
                        if (!isValidTime(time)) return setError('Digite o horário no formato 19:00.')
                        update((c) => ({ ...c, extraMeetings: [...c.extraMeetings, { date: iso, time }] }))
                        setExtraOpen(false)
                        setDate('')
                        toast('Encontro extra marcado. Todos foram avisados')
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ) : (
                <Button label="Marcar encontro extra" icon="plus" variant="outline" onPress={() => setExtraOpen(true)} />
              )
            ) : null}
          </Page>
        )
      }}
    </CellGuard>
  )
}
