import { router } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { AppText, Button, Card, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { getTranslation } from '../translations'

/** Crédito e licença do texto bíblico. A licença Creative Commons Atribuição exige que isso fique visível. */
export function TranslationInfoScreen() {
  const { colors } = useTheme()
  const t = getTranslation()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Sobre a tradução" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        <Card style={{ gap: 8 }}>
          <AppText variant="title" accessibilityRole="header">
            {t.name}
          </AppText>
          <AppText variant="body">{t.attribution}</AppText>
        </Card>
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Licença</AppText>
          <AppText variant="body">{t.licenseName}. O texto pode ser usado e compartilhado, sempre com este crédito.</AppText>
          <Button
            label="Ver a licença"
            variant="outline"
            size="sm"
            icon="external"
            onPress={() => Linking.openURL(t.licenseUrl).catch(() => {})}
            accessibilityHint="Abre a página da licença no navegador"
          />
        </Card>
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Fonte do arquivo</AppText>
          <AppText variant="body">{t.source}</AppText>
        </Card>
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">O que mudamos</AppText>
          <AppText variant="body">{t.changes}</AppText>
        </Card>
        <AppText variant="small" tone="secondary">
          O texto fica guardado no app e funciona sem internet. Nenhum versículo é escrito pela IA.
        </AppText>
      </ScrollView>
    </View>
  )
}
