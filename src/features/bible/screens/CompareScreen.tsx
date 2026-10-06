import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Card, Tag, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { TRANSLATIONS } from '../../onboarding/data'

/** Comparar duas traduções lado a lado. No lançamento só há uma, então a tela explica e lista as próximas. */
export function CompareScreen() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Comparar traduções" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 6 }}>
          <AppText variant="bodyStrong">Disponível com a segunda tradução</AppText>
          <AppText variant="body" tone="secondary">
            Para comparar, é preciso ter duas traduções. No lançamento só há a Bíblia Livre. As traduções licenciadas entram depois.
          </AppText>
        </Card>
        <AppText variant="label" tone="secondary">
          Em breve
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRANSLATIONS.filter((t) => !t.available).map((t) => (
            <Tag key={t.id} label={t.label} tone="neutral" />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
