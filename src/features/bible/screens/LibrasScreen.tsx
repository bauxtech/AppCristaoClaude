import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Card, Icon, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { bookBySlug } from '../books'

/** Bíblia em Libras por vídeo. Por enquanto só o Novo Testamento, via parceria. */
export function LibrasScreen() {
  const { colors } = useTheme()
  const p = useLocalSearchParams<{ livro: string; capitulo: string }>()
  const book = bookBySlug(String(p.livro))
  const isNT = book?.testament === 'NT'
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Bíblia em Libras" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Icon name="info" size={18} color={colors.primary} />
          <AppText variant="body" style={{ flex: 1 }}>
            Por enquanto, só há o Novo Testamento em Libras.
          </AppText>
        </Card>
        <View style={{ aspectRatio: 16 / 10, maxWidth: '100%', borderRadius: 20, backgroundColor: colors.darkSurface, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
          <Icon name="hand" size={40} color="#FFFFFF" />
          <AppText variant="body" style={{ color: '#FFFFFF', textAlign: 'center' }}>
            {isNT ? `${book?.name} ${p.capitulo} com intérprete` : `${book?.name ?? 'Este livro'} ainda não tem vídeo em Libras`}
          </AppText>
        </View>
        <AppText variant="small" tone="secondary">
          Os vídeos entram com a parceria para a Bíblia em Libras. Todo vídeo terá legenda.
        </AppText>
      </ScrollView>
    </View>
  )
}
