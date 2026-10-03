import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Button, TopBar } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { useAudio } from '../audio/AudioContext'
import { reflection } from './data'

export function ReflectionScreen() {
  const { colors } = useTheme()
  const audio = useAudio()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Reflexão de hoje" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}>
        <AppText variant="small" tone="secondary">{`${reflection.minutes} min de leitura · ${reflection.reference}`}</AppText>
        {reflection.paragraphs.map((p) => (
          <AppText key={p.slice(0, 20)} variant="body" style={{ lineHeight: 28 }}>
            {p}
          </AppText>
        ))}
        <AppText variant="bible" style={{ fontSize: 17, lineHeight: 28 }}>{`Ore: "${reflection.prayer}"`}</AppText>
        <Button
          label="Ouvir a reflexão"
          icon="volume"
          variant="outline"
          onPress={() => audio.play({ title: 'Reflexão de hoje', text: [...reflection.paragraphs, reflection.prayer].join(' ') })}
        />
      </ScrollView>
    </View>
  )
}
