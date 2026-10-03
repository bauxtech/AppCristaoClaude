import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Switch, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { formatDiaryDate } from '../dates'
import { usePrayer } from '../PrayerContext'
import { DiaryLock } from './DiaryLock'
import { EmptyState, PrayerPage } from './parts'

export function DiaryScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const prayer = usePrayer()
  const { novo } = useLocalSearchParams<{ novo?: string }>()
  const [text, setText] = useState('')
  const locked = prayer.diaryLock && !prayer.diaryUnlocked

  return (
    <PrayerPage title="Diário de oração">
      {locked ? (
        <View style={{ minHeight: 480 }}>
          <DiaryLock />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primarySoft }}>
            <Icon name="lock" size={14} color={colors.primary} />
            <AppText variant="small" style={{ color: colors.primary, fontFamily: fonts.medium, flex: 1 }}>
              {prayer.diaryLock ? 'Privado · Protegido com biometria' : 'Privado · Só você vê'}
            </AppText>
          </View>

          <Card style={{ gap: 12 }}>
            <TextField label="Nova entrada" value={text} onChangeText={setText} placeholder="O que você trouxe para Deus hoje?" multiline autoFocus={novo === '1'} maxLength={4000} />
            <Button
              label="Salvar"
              disabled={!text.trim()}
              onPress={() => {
                prayer.addDiaryEntry(text)
                setText('')
                toast('Entrada salva')
              }}
            />
          </Card>

          {prayer.diary.length === 0 ? (
            <EmptyState text="Seu diário está vazio. Comece escrevendo depois de um momento de oração." />
          ) : (
            <View style={{ gap: 12 }}>
              {prayer.diary.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push({ pathname: '/oracao/diario/[id]', params: { id: e.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDiaryDate(e.date)}. ${e.text}`}
                  accessibilityHint="Abre a entrada"
                  style={({ pressed }) => ({ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 6, opacity: pressed ? 0.8 : 1 })}
                >
                  <AppText variant="small" tone="secondary">
                    {formatDiaryDate(e.date)}
                  </AppText>
                  <AppText variant="body" numberOfLines={2}>
                    {e.text}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Proteger com biometria</AppText>
              <AppText variant="small" tone="secondary">
                Pede biometria ou o código do celular para abrir o diário.
              </AppText>
            </View>
            <Switch label="Proteger com biometria" value={prayer.diaryLock} onChange={prayer.setDiaryLock} />
          </Card>
        </>
      )}
    </PrayerPage>
  )
}
