import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { AppText, Card, ListRow, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { slugify } from '../books'
import { CROSS_REFS, verseText } from '../text'

export function CrossRefsScreen() {
  const { colors } = useTheme()
  const { ref } = useLocalSearchParams<{ ref: string }>()
  const isSample = String(ref).startsWith('Salmos 23')
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Referências cruzadas" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppText variant="label" tone="secondary">{`Ligadas a ${ref}`}</AppText>
        {isSample ? (
          CROSS_REFS.map((r) => (
            <Card key={`${r.book}${r.chapter}${r.verse}`} style={{ paddingVertical: 6 }}>
              <ListRow
                label={`${r.book} ${r.chapter}:${r.verse}`}
                sub={verseText(r.book, r.chapter, r.verse)}
                onPress={() => router.push({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: slugify(r.book), capitulo: String(r.chapter), v: String(r.verse) } })}
              />
            </Card>
          ))
        ) : (
          <AppText variant="body" tone="secondary">
            Na prévia, só Salmos 23 tem referências cruzadas.
          </AppText>
        )}
      </ScrollView>
    </View>
  )
}
