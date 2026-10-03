import { router, useLocalSearchParams } from 'expo-router'
import { NotesGate } from '../../settings/NotesLock'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppText, Button, TextField, TopBar, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useBible, verseKey } from '../BibleContext'
import { bookBySlug } from '../books'
import { getChapter } from '../text'

/** Nota presa a um versículo. O versículo ganha a marca "Nota" no texto. */
export function NoteScreen() {
  return (
    <NotesGate title="Nota">
      <NoteBody />
    </NotesGate>
  )
}

function NoteBody() {
  const { colors } = useTheme()
  const toast = useToast()
  const p = useLocalSearchParams<{ livro: string; capitulo: string; v: string }>()
  const bible = useBible()
  const k = verseKey(String(p.livro), Number(p.capitulo), Number(p.v))
  const [text, setText] = useState(bible.notes[k] ?? '')
  const book = bookBySlug(String(p.livro))
  const verse = getChapter(String(p.livro), Number(p.capitulo)).verses.find((x) => x.v === Number(p.v))
  const ref = `${book?.name ?? ''} ${p.capitulo}:${p.v}`

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Anotar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, padding: 14, gap: 4 }}>
          <AppText variant="small" tone="brand" style={{ fontFamily: 'Figtree_600SemiBold' }}>
            {ref}
          </AppText>
          {verse ? <AppText variant="bibleRef">{verse.text}</AppText> : null}
        </View>
        <TextField label="Sua nota" value={text} onChangeText={setText} multiline placeholder="Escreva sua reflexão sobre este versículo" />
        <Button
          label="Salvar nota"
          onPress={() => {
            bible.saveNote(k, text)
            toast(text.trim() ? 'Nota salva' : 'Nota apagada')
            router.back()
          }}
        />
      </ScrollView>
    </View>
  )
}
