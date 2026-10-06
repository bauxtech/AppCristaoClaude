import { creditLine, getTranslation } from '../translations'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Share, View } from 'react-native'
import { AppText, Button, Chip, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { bookBySlug } from '../books'
import { getChapter } from '../text'

type Background = 'claro' | 'azul' | 'escuro'

/** Versículo sobre um fundo, para status e stories. */
export function ShareScreen() {
  const { colors } = useTheme()
  const p = useLocalSearchParams<{ livro: string; capitulo: string; v: string }>()
  const [bg, setBg] = useState<Background>('azul')
  const book = bookBySlug(String(p.livro))
  const verse = getChapter(String(p.livro), Number(p.capitulo)).verses.find((x) => x.v === Number(p.v))
  const ref = `${book?.name ?? ''} ${p.capitulo}:${p.v}`

  const look = {
    claro: { bg: '#F4F7FD', fg: '#0F1E3C', sub: '#4B5A7A' },
    azul: { bg: '#1A56DB', fg: '#FFFFFF', sub: '#DBEAFE' },
    escuro: { bg: '#0F1E3C', fg: '#FFFFFF', sub: '#C9D6EE' },
  }[bg]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Compartilhar versículo" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View
          accessible
          accessibilityLabel={`Prévia da imagem: ${verse?.text ?? ''} ${ref}`}
          style={{ aspectRatio: 9 / 12, maxWidth: '100%', borderRadius: 24, backgroundColor: look.bg, padding: 28, justifyContent: 'center', gap: 16, borderWidth: 1, borderColor: colors.line }}
        >
          <AppText variant="bible" style={{ color: look.fg, textAlign: 'center', fontSize: 22, lineHeight: 34 }}>
            {verse?.text ?? ''}
          </AppText>
          <AppText variant="small" style={{ color: look.sub, textAlign: 'center', fontFamily: 'Figtree_600SemiBold' }}>
            {`${ref} · ${getTranslation().name}`}
          </AppText>
        </View>
        <AppText variant="label" tone="secondary">
          Fundo
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Claro" selected={bg === 'claro'} onPress={() => setBg('claro')} />
          <Chip label="Azul" selected={bg === 'azul'} onPress={() => setBg('azul')} />
          <Chip label="Escuro" selected={bg === 'escuro'} onPress={() => setBg('escuro')} />
        </View>
        <Button label="Compartilhar" onPress={() => Share.share({ message: `"${verse?.text ?? ''}" ${ref}\n\n${creditLine()}` }).catch(() => {})} />
        <AppText variant="small" tone="secondary">
          Na prévia, o texto é compartilhado sem a imagem. A imagem entra com o app no celular.
        </AppText>
      </ScrollView>
    </View>
  )
}
