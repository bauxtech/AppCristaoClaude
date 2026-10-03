import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { AppText, MIN_TOUCH, TopBar } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useBible } from '../BibleContext'
import { bookBySlug } from '../books'
import { chapterKey } from '../text'
import { NotFound } from './NotFound'

export function ChaptersScreen() {
  const { colors } = useTheme()
  const { livro } = useLocalSearchParams<{ livro: string }>()
  const { readChapters } = useBible()
  const book = bookBySlug(String(livro))
  if (!book) return <NotFound />

  const isRead = (ch: number) => ch <= book.read || readChapters.includes(chapterKey(String(livro), ch))

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={book.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        <AppText variant="label" tone="secondary">{`${book.chapters} capítulos`}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => {
            const read = isRead(ch)
            return (
              <Pressable
                key={ch}
                onPress={() => router.push(`/biblia/${livro}/${ch}`)}
                accessibilityRole="button"
                accessibilityLabel={`Capítulo ${ch}${read ? ', lido' : ''}`}
                style={({ pressed }) => ({
                  width: 56,
                  height: 56,
                  minWidth: MIN_TOUCH,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: read ? colors.primary : colors.card,
                  borderWidth: read ? 0 : 1,
                  borderColor: colors.lineStrong,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <AppText style={{ fontFamily: fonts.semibold, fontSize: 15, color: read ? colors.primaryText : colors.text }}>{ch}</AppText>
                {read ? (
                  <View style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={11} color={colors.primary} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
