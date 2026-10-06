import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button, IconButton, MIN_TOUCH, ProgressBar, Segmented, TextField } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useBible } from '../BibleContext'
import { bookBySlug, BOOKS, slugify, type BookInfo } from '../books'

export function bookProgress(book: BookInfo, readChapters: string[]) {
  const slug = slugify(book.name)
  return Math.min(book.chapters, new Set(readChapters.filter((k) => k.startsWith(`${slug}:`))).size)
}

export function BooksScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { readChapters, lastPosition } = useBible()
  const last = lastPosition ? bookBySlug(lastPosition.book) : undefined
  const [testament, setTestament] = useState<'AT' | 'NT'>('NT')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? BOOKS.filter((b) => b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q)) : BOOKS.filter((b) => b.testament === testament)
  }, [query, testament])

  const done = BOOKS.filter((b) => bookProgress(b, readChapters) === b.chapters).length

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120, gap: 6 }}
      data={list}
      keyExtractor={(b) => b.name}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <AppText variant="screenTitle" accessibilityRole="header">
              Bíblia
            </AppText>
            <IconButton icon="search" label="Buscar na Bíblia" onPress={() => router.push('/biblia/busca')} />
          </View>
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: 16, padding: 16, gap: 8 }}>
            <AppText variant="bodyStrong" tone="brand">
              Progresso da leitura
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <AppText style={{ fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, color: colors.primary }}>{done}</AppText>
              <AppText variant="small" tone="secondary">
                de 66 livros concluídos
              </AppText>
            </View>
            <ProgressBar value={done} max={66} label={`${done} de 66 livros concluídos`} />
          </View>
          {last && lastPosition ? (
            <Button
              label={`Continuar: ${last.name} ${lastPosition.chapter}`}
              icon="book"
              onPress={() => router.push(`/biblia/${lastPosition.book}/${lastPosition.chapter}`)}
              accessibilityHint="Abre o último capítulo que você leu"
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Planos" variant="outline" size="sm" onPress={() => router.push('/biblia/planos')} style={{ flex: 1 }} />
            <Button label="Comparar" variant="outline" size="sm" onPress={() => router.push('/biblia/comparar')} style={{ flex: 1 }} />
          </View>
          {!query ? (
            <Segmented
              label="Testamento"
              value={testament}
              onChange={setTestament}
              options={[
                { id: 'AT', label: 'Antigo Testamento' },
                { id: 'NT', label: 'Novo Testamento' },
              ]}
            />
          ) : null}
          <TextField label="Buscar livro" value={query} onChangeText={setQuery} placeholder="Ex.: Salmos ou Sl" autoCorrect={false} />
          {query && list.length === 0 ? (
            <AppText variant="body" tone="secondary" accessibilityLiveRegion="polite">
              {`Nenhum livro com "${query}".`}
            </AppText>
          ) : null}
        </View>
      }
      renderItem={({ item }) => <BookRow book={item} read={bookProgress(item, readChapters)} />}
    />
  )
}

function BookRow({ book, read }: { book: BookInfo; read: number }) {
  const { colors } = useTheme()
  const isDone = read === book.chapters
  const started = read > 0 && !isDone
  const status = isDone ? 'Concluído' : started ? `${read} lidos` : ''
  return (
    <Pressable
      onPress={() => router.push(`/biblia/${slugify(book.name)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${book.name}, ${book.chapters} capítulos${status ? `, ${status}` : ''}`}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH + 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: colors.card,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDone ? colors.primary : started ? colors.primarySoft : colors.bg,
          borderWidth: isDone || started ? 0 : 1,
          borderColor: colors.line,
        }}
      >
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 13, color: isDone ? colors.primaryText : colors.primary }}>{book.abbr}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontFamily: fonts.medium }}>
          {book.name}
        </AppText>
        <AppText variant="small" tone="secondary">
          {`${book.chapters} capítulos${status ? ` · ${status}` : ''}`}
        </AppText>
      </View>
      <Icon name={isDone ? 'check' : 'chevronRight'} size={18} color={isDone ? colors.primary : colors.lineStrong} strokeWidth={isDone ? 2.5 : 2} />
    </Pressable>
  )
}
