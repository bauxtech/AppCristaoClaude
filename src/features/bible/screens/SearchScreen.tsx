import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppText, Card, Chip, ListRow, TextField, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { BOOKS, slugify } from '../books'
import { allVerses, searchVerses } from '../text'

const SUGGESTIONS = ['pastor', 'ansiosos', 'João 3:16', 'Salmos 23']

export function SearchScreen() {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const refs = useMemo(() => allVerses((slug) => BOOKS.find((b) => slugify(b.name) === slug)?.name ?? slug), [])
  const results = searchVerses(query, refs)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Buscar na Bíblia" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <TextField label="Palavra, tema ou referência" value={query} onChangeText={setQuery} placeholder="Ex.: perdão ou Jo 3:16" autoFocus returnKeyType="search" />
        {!query ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} selected={false} onPress={() => setQuery(s)} />
            ))}
          </View>
        ) : null}
        {query.trim().length >= 2 && results.length === 0 ? (
          <Card accessibilityLiveRegion="polite" style={{ gap: 4 }}>
            <AppText variant="bodyStrong">{`Nenhum resultado para "${query}"`}</AppText>
            <AppText variant="body" tone="secondary">
              Na prévia, a busca procura só nos versículos de exemplo.
            </AppText>
          </Card>
        ) : null}
        {results.length > 0 ? (
          <AppText variant="label" tone="secondary" accessibilityLiveRegion="polite">
            {`${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`}
          </AppText>
        ) : null}
        {results.map((r) => (
          <Card key={`${r.bookSlug}${r.chapter}${r.verse}`} style={{ paddingVertical: 6 }}>
            <ListRow
              label={`${r.book} ${r.chapter}:${r.verse}`}
              sub={r.text}
              onPress={() => router.push({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: r.bookSlug, capitulo: String(r.chapter), v: String(r.verse) } })}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}
