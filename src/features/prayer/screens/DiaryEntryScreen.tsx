import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, TextField, useToast } from '../../../components'
import { formatDiaryDate } from '../dates'
import { usePrayer } from '../PrayerContext'
import { DiaryLock } from './DiaryLock'
import { ConfirmDelete, PrayerPage } from './parts'

export function DiaryEntryScreen() {
  const toast = useToast()
  const prayer = usePrayer()
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = prayer.diary.find((e) => e.id === id)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry?.text ?? '')
  const [confirm, setConfirm] = useState(false)

  if (prayer.diaryLock && !prayer.diaryUnlocked) {
    return (
      <PrayerPage title="Entrada do diário">
        <View style={{ minHeight: 480 }}>
          <DiaryLock />
        </View>
      </PrayerPage>
    )
  }

  if (!entry) {
    return (
      <PrayerPage title="Entrada do diário">
        <AppText variant="body">Esta entrada foi apagada.</AppText>
      </PrayerPage>
    )
  }

  return (
    <PrayerPage title="Entrada do diário">
      <View style={{ gap: 8 }}>
        <AppText variant="small" tone="secondary">
          {formatDiaryDate(entry.date)}
        </AppText>
        {editing ? (
          <TextField label="Texto da entrada" value={text} onChangeText={setText} multiline autoFocus maxLength={4000} />
        ) : (
          <AppText variant="body" style={{ lineHeight: 24 }}>
            {entry.text}
          </AppText>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {editing ? (
          <Button
            label="Salvar"
            disabled={!text.trim()}
            onPress={() => {
              prayer.updateDiaryEntry(entry.id, text)
              setEditing(false)
              toast('Entrada salva')
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <Button label="Editar" icon="edit" variant="outline" onPress={() => setEditing(true)} style={{ flex: 1 }} />
        )}
        <Button label="Apagar" icon="trash" variant="dangerSoft" onPress={() => setConfirm(true)} style={{ flex: 1 }} />
      </View>
      {confirm ? (
        <ConfirmDelete
          title="Apagar esta entrada?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            prayer.deleteDiaryEntry(entry.id)
            toast('Entrada apagada')
            router.back()
          }}
        />
      ) : null}
    </PrayerPage>
  )
}
