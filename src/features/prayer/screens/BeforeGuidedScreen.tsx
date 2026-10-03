import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Chip, SelectCard } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { themeById } from '../data'
import { PrayerPage } from './parts'

export function BeforeGuidedScreen() {
  const { colors } = useTheme()
  const { tema } = useLocalSearchParams<{ tema: string }>()
  const theme = themeById(String(tema))
  const [duration, setDuration] = useState(theme?.durations[0] ?? 5)
  const [format, setFormat] = useState<'texto' | 'audio'>('texto')

  if (!theme) {
    return (
      <PrayerPage title="Momento guiado">
        <AppText variant="body">Este momento não existe mais.</AppText>
      </PrayerPage>
    )
  }

  return (
    <PrayerPage title="Momento guiado">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={theme.icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title" accessibilityRole="header">
            {theme.label}
          </AppText>
          <AppText variant="small" tone="secondary">
            Escolha as opções para começar
          </AppText>
        </View>
      </View>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Duração">
        <AppText variant="bodyStrong">Duração</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {theme.durations.map((d) => (
            <Chip key={d} label={`${d} min`} selected={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Formato">
        <AppText variant="bodyStrong">Formato</AppText>
        <SelectCard kind="radio" label="Texto" description="Você lê cada passo na tela" selected={format === 'texto'} onPress={() => setFormat('texto')} />
        <SelectCard kind="radio" label="Áudio" description="O app lê cada passo em voz alta" selected={format === 'audio'} onPress={() => setFormat('audio')} />
      </View>

      <Button
        label="Começar"
        onPress={() => router.push({ pathname: '/oracao/guiado', params: { tema: theme.id, min: String(duration), formato: format } })}
        style={{ marginTop: 8 }}
      />
    </PrayerPage>
  )
}
