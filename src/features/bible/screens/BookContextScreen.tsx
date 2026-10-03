import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Card, SectionLabel, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { bookBySlug } from '../books'
import { NotFound } from './NotFound'

export function BookContextScreen() {
  const { colors } = useTheme()
  const { livro } = useLocalSearchParams<{ livro: string }>()
  const book = bookBySlug(String(livro))
  if (!book) return <NotFound />
  const fields = [
    { label: 'Autor', value: book.author ?? 'Desconhecido' },
    { label: 'Época', value: book.era ?? 'Não informada' },
    { label: 'Gênero', value: book.genre ?? 'Não informado' },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={`Contexto de ${book.name}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {fields.map((f) => (
            <Card key={f.label} style={{ flexGrow: 1, flexBasis: 140, padding: 14, gap: 4 }} accessible accessibilityLabel={`${f.label}: ${f.value}`}>
              <AppText variant="label" tone="secondary">
                {f.label}
              </AppText>
              <AppText variant="bodyStrong">{f.value}</AppText>
            </Card>
          ))}
        </View>
        <Card>
          <SectionLabel>Tema</SectionLabel>
          <AppText variant="body">{book.theme ?? 'Informação não disponível.'}</AppText>
        </Card>
      </ScrollView>
    </View>
  )
}
