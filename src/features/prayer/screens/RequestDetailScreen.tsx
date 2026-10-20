import { router, useLocalSearchParams } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, SectionLabel, Switch, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { toISODate } from '../data'
import { brToISO, formatAgo, formatBR, formatDayMonth, maskDate, parseISODate } from '../dates'
import { usePrayer } from '../PrayerContext'
import { ConfirmDelete, PrayerPage } from './parts'
import { useSubscription } from '../../subscription/SubscriptionContext'
import { PlanLockRow } from '../../subscription/PlanLock'

export function RequestDetailScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const prayer = usePrayer()
  const { cellStatus } = useSession()
  const hasCell = cellStatus === 'member' || cellStatus === 'leader'
  const sub = useSubscription()
  const { id } = useLocalSearchParams<{ id: string }>()
  const r = prayer.requests.find((x) => x.id === id)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(r?.text ?? '')
  const [confirm, setConfirm] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [date, setDate] = useState(formatBR(toISODate(new Date())))
  const [testimony, setTestimony] = useState('')
  const [dateError, setDateError] = useState<string | undefined>()

  if (!r) {
    return (
      <PrayerPage title="Pedido de oração">
        <AppText variant="body">Este pedido foi apagado.</AppText>
      </PrayerPage>
    )
  }

  // Sem plano, o pedido fica só para leitura: dá para apagar e parar de compartilhar, não para mudar.
  // Pedido compartilhado numa célula que a pessoa usa (líder com o plano Líder e vaga) continua editável, como no banco.
  const inUsableCell = !!r.sharedCellId && sub.cellActive(r.sharedCellId) && !sub.cellSeatless(r.sharedCellId)
  const canChange = sub.can('prayer') || (r.shared && inUsableCell)

  function confirmAnswered() {
    const iso = brToISO(date)
    if (!iso) return setDateError('Digite a data no formato DD/MM/AAAA.')
    if (parseISODate(iso) > new Date()) return setDateError('A data não pode ser no futuro.')
    if (iso < r!.createdAt) return setDateError('A data precisa ser depois da criação do pedido.')
    prayer.markAnswered(r!.id, iso, testimony)
    toast('Pedido marcado como respondido')
    router.back()
  }

  return (
    <PrayerPage title="Pedido de oração">
      <View style={{ gap: 6 }}>
        <AppText variant="small" tone="secondary">{`Criado ${formatAgo(r.createdAt)}`}</AppText>
        <AppText variant="title" accessibilityRole="header">
          {r.title}
        </AppText>
        {editing ? (
          <TextField label="Texto do pedido" value={text} onChangeText={setText} multiline autoFocus maxLength={2000} />
        ) : r.text ? (
          <AppText variant="body" style={{ lineHeight: 24 }}>
            {r.text}
          </AppText>
        ) : null}
      </View>

      {r.videoUri ? <RequestVideo uri={r.videoUri} /> : null}

      {r.answeredAt ? (
        <Card style={{ gap: 6, borderColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={18} color={colors.primary} strokeWidth={2.5} />
            <AppText variant="bodyStrong">{`Respondido em ${formatDayMonth(r.answeredAt)}`}</AppText>
          </View>
          {r.testimony ? <AppText variant="body">{`"${r.testimony}"`}</AppText> : null}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {editing ? (
          <Button
            label="Salvar"
            disabled={!text.trim() && !r.videoUri}
            onPress={() => {
              prayer.updateRequest(r.id, { text: text.trim() })
              setEditing(false)
              toast('Pedido salvo')
            }}
            style={{ flex: 1 }}
          />
        ) : canChange ? (
          <Button label="Editar" icon="edit" variant="outline" onPress={() => setEditing(true)} style={{ flex: 1 }} />
        ) : null}
        <Button label="Apagar" icon="trash" variant="dangerSoft" onPress={() => setConfirm(true)} style={{ flex: 1 }} />
      </View>

      {confirm ? (
        <ConfirmDelete
          title="Apagar este pedido?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            prayer.deleteRequest(r.id)
            toast('Pedido apagado')
            router.back()
          }}
        />
      ) : null}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">Compartilhar com a célula</AppText>
          <AppText variant="small" tone="secondary">
            {hasCell ? (r.shared ? 'A sua célula vê este pedido.' : 'Só você vê este pedido.') : 'Entre numa célula para compartilhar pedidos.'}
          </AppText>
        </View>
        <Switch
          label="Compartilhar com a célula"
          value={r.shared && hasCell}
          // Sem plano, só dá para desligar.
          disabled={!hasCell || (!r.shared && !canChange)}
          onChange={(v) => {
            prayer.updateRequest(r.id, { shared: v })
            toast(v ? 'Compartilhado com a célula' : 'Parou de compartilhar com a célula')
          }}
        />
      </Card>

      {r.prayedBy.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <SectionLabel>Quem orou por você</SectionLabel>
          {r.prayedBy.map((name) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="small" style={{ color: colors.primary, fontFamily: fonts.semibold }}>
                  {name.charAt(0)}
                </AppText>
              </View>
              <AppText variant="body">{`${name} orou por você`}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {!r.answeredAt && !answering ? (
        canChange ? (
          <Button label="Marcar como respondido" icon="check" variant="soft" onPress={() => setAnswering(true)} />
        ) : (
          <PlanLockRow feature="prayer" label="Editar ou marcar como respondido" />
        )
      ) : null}

      {answering ? (
        <Card style={{ gap: 14 }}>
          <AppText variant="bodyStrong" accessibilityRole="header">
            Pedido respondido
          </AppText>
          <TextField
            label="Data em que foi respondido"
            value={date}
            onChangeText={(v) => {
              setDate(maskDate(v))
              setDateError(undefined)
            }}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            error={dateError}
          />
          <TextField
            label="Testemunho curto (opcional)"
            value={testimony}
            onChangeText={setTestimony}
            placeholder="Conte como Deus respondeu"
            multiline
            maxLength={280}
            hint={`${testimony.length} de 280 letras`}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Cancelar" variant="outline" onPress={() => setAnswering(false)} style={{ flex: 1 }} />
            <Button label="Confirmar" onPress={confirmAnswered} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}
    </PrayerPage>
  )
}

function RequestVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri)
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: '#000' }}>
      <VideoView player={player} nativeControls style={{ flex: 1 }} accessibilityLabel="Vídeo do pedido em Libras" />
    </View>
  )
}
