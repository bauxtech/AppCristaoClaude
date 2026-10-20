import { creditLine, getTranslation } from '../translations'
import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, Share, View } from 'react-native'
import { AppText, Button, TopBar } from '../../../components'
import { fonts } from '../../../theme/typography'
import { useTheme } from '../../../theme/ThemeProvider'
import { bookBySlug } from '../books'
import { getChapter } from '../text'

/** Versículo para compartilhar como texto. A imagem ficou para depois (backlog de 20/10). */
export function ShareScreen() {
  const { colors } = useTheme()
  const p = useLocalSearchParams<{ livro: string; capitulo: string; v: string }>()
  const book = bookBySlug(String(p.livro))
  const verse = getChapter(String(p.livro), Number(p.capitulo)).verses.find((x) => x.v === Number(p.v))
  const ref = `${book?.name ?? ''} ${p.capitulo}:${p.v}`

  // Cores da marca acasa: off-white sobre o verde principal passa de 4,5 para 1.
  const look = { bg: '#254C3A', fg: '#F6F4EE', sub: '#DCE5D8' }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Compartilhar versículo" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 120 }}>
        <View
          accessible
          accessibilityLabel={`${verse?.text ?? ''} ${ref}`}
          style={{ aspectRatio: 9 / 12, maxWidth: '100%', borderRadius: 24, backgroundColor: look.bg, padding: 28, justifyContent: 'center', gap: 16, borderWidth: 1, borderColor: colors.line }}
        >
          <AppText variant="bible" style={{ color: look.fg, textAlign: 'center', fontSize: 22, lineHeight: 34 }}>
            {verse?.text ?? ''}
          </AppText>
          <AppText variant="small" style={{ color: look.sub, textAlign: 'center', fontFamily: fonts.semibold }}>
            {`${ref} · ${getTranslation().name}`}
          </AppText>
        </View>
        <Button label="Compartilhar" onPress={() => Share.share({ message: `"${verse?.text ?? ''}" ${ref}\n\n${creditLine()}` }).catch(() => {})} />
        <AppText variant="small" tone="secondary">
          O versículo vai como texto, com a referência e o crédito da tradução.
        </AppText>
      </ScrollView>
    </View>
  )
}
