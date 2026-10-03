import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { FAITH_TEXT, TERMS_TEXT } from '../data'

/** Texto completo dos Termos ou dos Dados de fé. Abrir o texto não marca o aceite. */
export function LegalTextScreen({ kind }: { kind: 'terms' | 'faith' }) {
  const { colors } = useTheme()
  const sections = kind === 'terms' ? TERMS_TEXT : FAITH_TEXT
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={kind === 'terms' ? 'Termos de Uso' : 'Uso dos dados de fé'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }}>
        {sections.map((s) => (
          <View key={s.title} style={{ gap: 8 }}>
            <AppText variant="bodyStrong" accessibilityRole="header">
              {s.title}
            </AppText>
            <AppText variant="body">{s.body}</AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
