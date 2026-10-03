import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, ConfirmCard, EmptyState, IconButton, Page, SectionLabel, TapCard, useToast } from '../../../components'
import { formatDiaryDate } from '../../prayer/dates'
import { useChat } from '../ChatContext'

export function ChatHistoryScreen() {
  const toast = useToast()
  const chat = useChat()
  const [confirm, setConfirm] = useState<string | 'all' | null>(null)
  const list = chat.conversations.filter((c) => c.messages.length > 0)
  const groups = [...new Set(list.map((c) => formatDiaryDate(c.createdAt).split(',')[0]))]

  return (
    <Page title="Histórico">
      {list.length === 0 ? <EmptyState text="Nenhuma conversa ainda. As conversas com o chat aparecem aqui." /> : null}
      {confirm ? (
        <ConfirmCard
          title={confirm === 'all' ? 'Apagar todo o histórico?' : 'Apagar esta conversa?'}
          confirmLabel="Apagar"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === 'all') chat.clearAll()
            else chat.removeConversation(confirm)
            setConfirm(null)
            toast(confirm === 'all' ? 'Histórico apagado' : 'Conversa apagada')
          }}
        />
      ) : null}
      {groups.map((g) => (
        <View key={g} style={{ gap: 8 }}>
          <SectionLabel>{g}</SectionLabel>
          {list
            .filter((c) => formatDiaryDate(c.createdAt).split(',')[0] === g)
            .map((c) => {
              const last = c.messages[c.messages.length - 1]
              return (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ flex: 1 }}>
                    <TapCard label={`${c.title}. ${last?.text ?? ''}`} onPress={() => router.replace({ pathname: '/chat', params: { conversa: c.id } })}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {c.title}
                      </AppText>
                      <AppText variant="small" tone="secondary" numberOfLines={1}>
                        {last?.text}
                      </AppText>
                    </TapCard>
                  </View>
                  <IconButton icon="trash" label={`Apagar a conversa ${c.title}`} onPress={() => setConfirm(c.id)} />
                </View>
              )
            })}
        </View>
      ))}
      {list.length ? <Button label="Apagar todo o histórico" variant="dangerSoft" onPress={() => setConfirm('all')} /> : null}
    </Page>
  )
}
