import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { AppText, Button, Card, IconButton, MIN_TOUCH, Sheet, Tag, TopBar, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useAudio } from '../../audio/AudioContext'
import { HIGHLIGHTS, useBible, verseKey, type HighlightColor } from '../BibleContext'
import { bookBySlug } from '../books'
import { chapterKey, getChapter } from '../text'
import { TRANSLATIONS } from '../../onboarding/data'
import { NotFound } from './NotFound'
import { useSession } from '../../../state/session'
import { SuggestedSong } from '../../music/screens/MusicScreens'
import { useSettings } from '../../settings/SettingsContext'
import { getTranslation } from '../translations'

export function ChapterScreen() {
  const { colors, isDark } = useTheme()
  const toast = useToast()
  const audio = useAudio()
  const params = useLocalSearchParams<{ livro: string; capitulo: string; v?: string }>()
  const slug = String(params.livro)
  const chapter = Number(params.capitulo)
  const focusVerse = params.v ? Number(params.v) : null
  const book = bookBySlug(slug)
  const bible = useBible()
  const settings = useSettings()
  const [selected, setSelected] = useState<number | null>(null)
  const { addMinutes } = useSession()

  // Tempo de leitura: conta enquanto o capítulo está aberto, até 30 minutos por vez.
  useEffect(() => {
    const started = Date.now()
    return () => {
      const mins = Math.min(30, Math.floor((Date.now() - started) / 60000))
      if (mins > 0) addMinutes('reading', mins)
    }
  }, [slug, chapter]) // eslint-disable-line react-hooks/exhaustive-deps
  // Guarda onde a pessoa parou.
  useEffect(() => {
    if (book && chapter >= 1 && chapter <= book.chapters) bible.setLastPosition(slug, chapter)
  }, [slug, chapter]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sheet, setSheet] = useState<'actions' | 'highlight' | 'translation' | 'more' | null>(null)

  if (!book || !chapter || chapter < 1 || chapter > book.chapters) return <NotFound />

  const { verses } = getChapter(slug, chapter)
  const translation = getTranslation()
  const key = chapterKey(slug, chapter)
  const isRead = bible.readChapters.includes(key)
  const next = chapter < book.chapters ? chapter + 1 : null
  const prev = chapter > 1 ? chapter - 1 : null
  const title = `${book.name} ${chapter}`
  const selKey = selected != null ? verseKey(slug, chapter, selected) : null
  const selRef = selected != null ? `${book.name} ${chapter}:${selected}` : ''

  function openSheet(v: number) {
    setSelected(v)
    setSheet('actions')
  }

  function highlightBg(c: HighlightColor | undefined) {
    if (!c) return undefined
    const h = HIGHLIGHTS.find((x) => x.id === c)
    return h ? (isDark ? h.dark : h.light) : undefined
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title={title}
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon="volume"
              label="Ouvir o capítulo"
              onPress={() => (verses.length ? audio.play({ title, text: verses.map((v) => `${v.v}. ${v.text}`).join(' ') }) : toast('Este capítulo ainda não tem texto na prévia'))}
            />
            <IconButton icon="info" label="Mais opções do capítulo" onPress={() => setSheet('more')} />
          </View>
        }
      />

      {/* Tradução, tamanho da letra e comparar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Button label={translation.name} icon="chevronDown" variant="text" size="sm" onPress={() => setSheet('translation')} accessibilityHint="Trocar a tradução" />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SizeButton label="A-" spoken="Diminuir a letra" onPress={() => bible.setFontSize(bible.fontSize - 1)} />
          <AppText variant="small" tone="secondary" accessibilityLabel={`Tamanho da letra ${bible.fontSize}`}>
            {bible.fontSize}
          </AppText>
          <SizeButton label="A+" spoken="Aumentar a letra" onPress={() => bible.setFontSize(bible.fontSize + 1)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 140, gap: 6 }}>
        {verses.length === 0 ? (
          <Card style={{ gap: 6 }}>
            <AppText variant="bodyStrong">Capítulo não encontrado</AppText>
            <AppText variant="body" tone="secondary">
              Volte e escolha outro capítulo.
            </AppText>
          </Card>
        ) : null}
        {verses.map((v) => {
          const k = verseKey(slug, chapter, v.v)
          const hl = bible.highlights[k]
          const hasNote = !!bible.notes[k]
          const fav = bible.favorites.includes(k)
          const marks = [hl ? `grifado em ${hl}` : '', fav ? 'favorito' : '', hasNote ? 'com nota' : ''].filter(Boolean).join(', ')
          return (
            <Pressable
              key={v.v}
              onPress={() => openSheet(v.v)}
              accessibilityRole="button"
              accessibilityLabel={`Versículo ${v.v}. ${v.text}${marks ? `. ${marks}` : ''}`}
              accessibilityHint="Abre as ações do versículo"
              style={{
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginHorizontal: -8,
                backgroundColor: highlightBg(hl) ?? (focusVerse === v.v || selected === v.v ? colors.primarySoft : 'transparent'),
              }}
            >
              <AppText style={{ fontFamily: settings.bibleFont === 'sans' ? fonts.regular : fonts.bible, fontSize: bible.fontSize, lineHeight: bible.fontSize * 1.65, color: colors.text }}>
                <AppText style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary }}>{`${v.v}  `}</AppText>
                {v.text}
              </AppText>
              {fav || hasNote ? (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {fav ? <Tag label="Favorito" tone="accent" /> : null}
                  {hasNote ? <Tag label="Nota" /> : null}
                </View>
              ) : null}
            </Pressable>
          )
        })}

        {/* Fim do capítulo */}
        <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center', gap: 10 }}>
          {isRead ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={18} color={colors.primary} strokeWidth={2.5} />
              <AppText variant="bodyStrong" tone="brand">
                Capítulo lido
              </AppText>
            </View>
          ) : (
            <Button
              label={next ? `Marcar como lido e ir para ${book.name} ${next}` : 'Marcar como lido'}
              onPress={() => {
                bible.markRead(key)
                toast(`${title} marcado como lido`)
                if (next) router.replace(`/biblia/${slug}/${next}`)
              }}
              style={{ alignSelf: 'stretch' }}
            />
          )}
          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
            <Button label={prev ? `Capítulo ${prev}` : 'Início'} icon="chevronLeft" variant="outline" size="sm" disabled={!prev} onPress={() => prev && router.replace(`/biblia/${slug}/${prev}`)} style={{ flex: 1 }} />
            <Button label={next ? `Capítulo ${next}` : 'Fim'} variant="outline" size="sm" disabled={!next} onPress={() => next && router.replace(`/biblia/${slug}/${next}`)} style={{ flex: 1 }} />
          </View>
          {isRead && verses.length ? (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <SuggestedSong moment="oracao" />
            </View>
          ) : null}
          {/* Crédito exigido pela licença do texto. */}
          <Button label={`${translation.name} · ${translation.licenseShort}`} variant="text" size="sm" onPress={() => router.push('/biblia/sobre-traducao')} accessibilityHint={`Licença ${translation.licenseName}. Abre o crédito da tradução`} />
        </View>
      </ScrollView>

      {/* Ações do versículo */}
      <Sheet visible={sheet === 'actions'} onClose={() => setSheet(null)} title={selRef}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Grifar" icon="pen" variant="soft" size="sm" onPress={() => setSheet('highlight')} style={{ flexGrow: 1 }} />
          <Button
            label="Anotar"
            icon="book"
            variant="soft"
            size="sm"
            onPress={() => {
              setSheet(null)
              router.push({ pathname: '/biblia/nota', params: { livro: slug, capitulo: String(chapter), v: String(selected) } })
            }}
            style={{ flexGrow: 1 }}
          />
          <Button
            label={selKey && bible.favorites.includes(selKey) ? 'Desfavoritar' : 'Favoritar'}
            icon="heart"
            variant="soft"
            size="sm"
            onPress={() => {
              if (!selKey) return
              const was = bible.favorites.includes(selKey)
              bible.toggleFavorite(selKey)
              toast(was ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
              setSheet(null)
            }}
            style={{ flexGrow: 1 }}
          />
          <Button
            label="Perguntar"
            icon="chat"
            variant="soft"
            size="sm"
            onPress={() => {
              setSheet(null)
              router.push({ pathname: '/chat', params: { passagem: selRef } })
            }}
            style={{ flexGrow: 1 }}
          />
        </View>
        <Button
          label="Compartilhar como imagem"
          variant="outline"
          onPress={() => {
            setSheet(null)
            router.push({ pathname: '/biblia/compartilhar', params: { livro: slug, capitulo: String(chapter), v: String(selected) } })
          }}
        />
        <Button
          label="Referências cruzadas"
          variant="outline"
          onPress={() => {
            setSheet(null)
            router.push({ pathname: '/biblia/referencias', params: { ref: selRef } })
          }}
        />
      </Sheet>

      {/* Grifar */}
      <Sheet visible={sheet === 'highlight'} onClose={() => setSheet(null)} title="Grifar versículo">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {HIGHLIGHTS.map((h) => {
            const active = selKey ? bible.highlights[selKey] === h.id : false
            return (
              <Pressable
                key={h.id}
                onPress={() => {
                  if (selKey) bible.setHighlight(selKey, h.id)
                  setSheet(null)
                  toast(`Grifado em ${h.label.toLowerCase()}`)
                }}
                accessibilityRole="button"
                accessibilityLabel={`Grifar em ${h.label.toLowerCase()}`}
                accessibilityState={{ selected: active }}
                style={{ alignItems: 'center', gap: 6, minWidth: MIN_TOUCH }}
              >
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? h.dark : h.light, borderWidth: active ? 3 : 1, borderColor: active ? colors.primary : colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                  {active ? <Icon name="check" size={18} color={colors.text} strokeWidth={3} /> : null}
                </View>
                <AppText variant="small">{h.label}</AppText>
              </Pressable>
            )
          })}
        </View>
        <Button
          label="Remover grifo"
          variant="outline"
          onPress={() => {
            if (selKey) bible.setHighlight(selKey, null)
            setSheet(null)
          }}
        />
      </Sheet>

      {/* Tradução */}
      <Sheet visible={sheet === 'translation'} onClose={() => setSheet(null)} title="Tradução">
        {TRANSLATIONS.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MIN_TOUCH }} accessible accessibilityLabel={t.available ? `${t.label}, selecionada` : `${t.label}, em breve`}>
            <AppText variant="body" style={{ fontFamily: fonts.medium, color: t.available ? colors.text : colors.textSecondary }}>
              {t.label}
            </AppText>
            {t.available ? <Icon name="check" size={18} color={colors.primary} strokeWidth={2.5} /> : <Tag label="Em breve" tone="neutral" />}
          </View>
        ))}
        <AppText variant="small" tone="secondary">
          No lançamento, só a Bíblia Livre está disponível. As traduções licenciadas entram depois.
        </AppText>
      </Sheet>

      {/* Mais opções */}
      <Sheet visible={sheet === 'more'} onClose={() => setSheet(null)} title="Mais opções">
        <Button
          label="Contexto do livro"
          variant="outline"
          onPress={() => {
            setSheet(null)
            router.push({ pathname: '/biblia/contexto', params: { livro: slug } })
          }}
        />
        <Button
          label="Bíblia em Libras"
          icon="hand"
          variant="outline"
          onPress={() => {
            setSheet(null)
            router.push({ pathname: '/biblia/libras', params: { livro: slug, capitulo: String(chapter) } })
          }}
        />
        <Button
          label="Comparar traduções"
          variant="outline"
          onPress={() => {
            setSheet(null)
            router.push('/biblia/comparar')
          }}
        />
      </Sheet>
    </View>
  )
}

function SizeButton({ label, spoken, onPress }: { label: string; spoken: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={spoken} style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.lineStrong }}>
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{label}</AppText>
      </View>
    </Pressable>
  )
}
