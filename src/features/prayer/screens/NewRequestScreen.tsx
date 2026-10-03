import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Switch, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { formatDuration } from '../../../lib/date'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { usePrayer } from '../PrayerContext'
import { PrayerPage } from './parts'

export function NewRequestScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const prayer = usePrayer()
  const { cellStatus } = useSession()
  const hasCell = cellStatus === 'member' || cellStatus === 'leader'
  const [text, setText] = useState('')
  const [shared, setShared] = useState(false)
  const video = prayer.draftVideo

  // O vídeo gravado vale só para este pedido.
  useEffect(() => () => prayer.setDraftVideo(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PrayerPage title="Novo pedido">
      <TextField label="Seu pedido" value={text} onChangeText={setText} placeholder="Descreva seu pedido de oração" multiline maxLength={2000} />

      {video ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Icon name="video" size={20} color={colors.primary} />
          <AppText variant="body" style={{ flex: 1 }}>{`Vídeo em Libras, ${formatDuration(video.seconds)}`}</AppText>
          <Button label="Remover" variant="text" size="sm" onPress={() => prayer.setDraftVideo(null)} />
        </Card>
      ) : (
        <Button label="Gravar em Libras" icon="video" variant="outline" onPress={() => router.push('/oracao/libras')} accessibilityHint="Grava o pedido em vídeo, em vez de escrever" />
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">Compartilhar com a célula</AppText>
          <AppText variant="small" tone="secondary">
            {hasCell ? 'Os membros da sua célula poderão orar com você.' : 'Entre numa célula para compartilhar pedidos.'}
          </AppText>
        </View>
        <Switch label="Compartilhar com a célula" value={shared && hasCell} onChange={setShared} disabled={!hasCell} />
      </Card>

      <Button
        label="Salvar pedido"
        disabled={!text.trim() && !video}
        onPress={() => {
          prayer.addRequest({ text, shared: shared && hasCell, videoUri: video?.uri })
          toast('Pedido salvo')
          router.back()
        }}
      />
    </PrayerPage>
  )
}
