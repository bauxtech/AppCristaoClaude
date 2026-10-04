import { router, useLocalSearchParams } from 'expo-router'
import { Linking, Pressable, View } from 'react-native'
import { AppText, Button, Card, Cover, CoverArt, CoverGrid, EmptyState, Page, SectionLabel, Tag, useGridItemWidth, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { useCell } from '../../cell/CellContext'
import { useProfile } from '../../profile/ProfileContext'
import { MOMENTS, PLAYLISTS, SERVICES, songUrl, type MomentId, type Song } from '../catalog'

/** Cartão de música: favoritar e abrir fora do app, com a confirmação de saída. */
export function SongCard({ song }: { song: Song }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { favoriteSongs, toggleSong } = useProfile()
  const fav = favoriteSongs.some((s) => s.title === song.title && s.artist === song.artist)
  return (
    <Card style={{ gap: 10, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="music" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{song.title}</AppText>
          <AppText variant="small" tone="secondary">
            {song.artist}
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            toggleSong(song)
            toast(fav ? 'Tirada das favoritas' : 'Música favoritada')
          }}
          accessibilityRole="button"
          accessibilityLabel={fav ? `Tirar ${song.title} das favoritas` : `Favoritar ${song.title}`}
          accessibilityState={{ selected: fav }}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={fav ? 'heartFilled' : 'heart'} size={20} color={colors.primary} />
        </Pressable>
      </View>
      {song.captions ? <Tag label="Vídeo com legenda" /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SERVICES.map((svc) => (
          <Button
            key={svc}
            label={svc}
            variant="soft"
            size="sm"
            accessibilityHint={`Abre ${song.title} no ${svc}`}
            onPress={() => {
              toast(`Abrindo o ${svc}`)
              Linking.openURL(songUrl(song, svc)).catch(() => {})
            }}
            style={{ flex: 1 }}
          />
        ))}
      </View>
    </Card>
  )
}

export function MusicScreen() {
  const { colors } = useTheme()
  const { cell } = useCell()
  const { favoriteSongs } = useProfile()
  const gridWidth = useGridItemWidth()
  return (
    <Page title="Música">
      <SectionLabel>Por momento</SectionLabel>
      <CoverGrid>
        {MOMENTS.map((m, i) => (
          <Cover
            key={m.id}
            title={m.label}
            tone={i}
            graphic={(['waves', 'rays', 'arcs'] as const)[i % 3]}
            info={`${PLAYLISTS[m.id].length} músicas`}
            label={`Playlist para ${m.label.toLowerCase()}, ${PLAYLISTS[m.id].length} músicas`}
            width={gridWidth}
            onPress={() => router.push({ pathname: '/eu/musica/[momento]', params: { momento: m.id } })}
          />
        ))}
      </CoverGrid>
      <Button label={`Minhas favoritas (${favoriteSongs.length})`} icon="heart" variant="outline" onPress={() => router.push('/eu/musica/favoritas')} />
      {cell ? <Button label="Playlist da semana da célula" icon="people" variant="outline" onPress={() => router.push('/celula/playlist')} /> : null}
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        O app só sugere e abre os links. Nada toca aqui dentro. A letra fica no link de cada serviço.
      </AppText>
    </Page>
  )
}

export function PlaylistScreen() {
  const { momento } = useLocalSearchParams<{ momento: string }>()
  const m = MOMENTS.find((x) => x.id === momento)
  if (!m) return <Page title="Música"><EmptyState text="Playlist não encontrada." /></Page>
  return (
    <Page title={`Para ${m.label.toLowerCase()}`}>
      <CoverArt title={m.label} tone={MOMENTS.indexOf(m)} graphic={(['waves', 'rays', 'arcs'] as const)[MOMENTS.indexOf(m) % 3]} large />
      {PLAYLISTS[m.id as MomentId].map((s) => (
        <SongCard key={s.title} song={s} />
      ))}
      <AppText variant="small" tone="secondary">
        Playlist de exemplo. A equipe do app monta as definitivas.
      </AppText>
    </Page>
  )
}

export function FavoriteSongsScreen() {
  const { favoriteSongs } = useProfile()
  return (
    <Page title="Minhas favoritas">
      {favoriteSongs.length === 0 ? <EmptyState text="Você ainda não favoritou nenhuma música. Toque no coração de uma música para guardar aqui." /> : null}
      {favoriteSongs.map((s) => (
        <SongCard key={`${s.title}${s.artist}`} song={s} />
      ))}
      <Button label="Ver músicas por momento" variant="text" onPress={() => router.push('/eu/musica')} />
    </Page>
  )
}

/** Música sugerida no fim de um capítulo e no resultado do culto. */
export function SuggestedSong({ moment }: { moment: MomentId }) {
  const song = PLAYLISTS[moment][0]
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>Música sugerida</SectionLabel>
      <SongCard song={song} />
    </View>
  )
}

