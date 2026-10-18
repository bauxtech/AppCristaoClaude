import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Button, TopBar } from '../../../components'
import { openLegal } from '../../../lib/legal'
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
        <View style={{ gap: 4 }}>
          {kind === 'terms' ? <Button label="Ler os Termos de uso completos" icon="external" variant="outline" onPress={() => openLegal('terms')} accessibilityHint="Abre o site do acasa" /> : null}
          <Button label="Ler a Política de privacidade" icon="external" variant="text" onPress={() => openLegal('privacy')} accessibilityHint="Abre o site do acasa" />
        </View>
      </ScrollView>
    </View>
  )
}
