// Músicas sugeridas pelo app. Nada toca dentro do app: tudo abre no Spotify, YouTube ou Deezer.
// Só músicas brasileiras, escolhidas pela IA a pedido do Thiago. A equipe pode trocar a lista quando quiser.

export interface Song {
  title: string
  artist: string
  /** O vídeo tem legenda. Só marcar quando a equipe conferir. */
  captions?: boolean
}

export type MomentId = 'oracao' | 'manha' | 'celula' | 'culto' | 'familia'

export const MOMENTS: { id: MomentId; label: string; icon: 'cup' | 'sun' | 'people' | 'church' | 'heart' }[] = [
  { id: 'oracao', label: 'Oração', icon: 'cup' },
  { id: 'manha', label: 'Manhã', icon: 'sun' },
  { id: 'celula', label: 'Célula', icon: 'people' },
  { id: 'culto', label: 'Culto', icon: 'church' },
  { id: 'familia', label: 'Família', icon: 'heart' },
]

export const PLAYLISTS: Record<MomentId, Song[]> = {
  oracao: [
    { title: 'Lugar Secreto', artist: 'Gabriela Rocha' },
    { title: "Aquieta Minh'alma", artist: 'Ministério Zoe' },
    { title: 'Preciso de Ti', artist: 'Diante do Trono' },
    { title: 'Sonda-me, Usa-me', artist: 'Aline Barros' },
  ],
  manha: [
    { title: 'Bondade de Deus', artist: 'Isaias Saad' },
    { title: 'Uma Nova História', artist: 'Fernandinho' },
    { title: 'Deus de Promessas', artist: 'Davi Sacer' },
    { title: 'Recomeçar', artist: 'Aline Barros' },
  ],
  celula: [
    { title: 'Ousado Amor', artist: 'Isaias Saad' },
    { title: 'Me Atraiu', artist: 'Gabriela Rocha' },
    { title: 'Ninguém Explica Deus', artist: 'Preto no Branco' },
    { title: 'Raridade', artist: 'Anderson Freire' },
  ],
  culto: [
    { title: 'Galileu', artist: 'Fernandinho' },
    { title: 'Faz Chover', artist: 'Fernandinho' },
    { title: 'A Ele a Glória', artist: 'Diante do Trono' },
    { title: 'Ressuscita-me', artist: 'Aline Barros' },
  ],
  familia: [
    { title: 'Casa do Pai', artist: 'Aline Barros' },
    { title: 'Advogado Fiel', artist: 'Bruna Karla' },
    { title: 'Teus Sonhos', artist: 'Fernandinho' },
    { title: 'Deus Me Ama', artist: 'Thalles Roberto' },
  ],
}

/** Todas as músicas sugeridas, sem repetir. */
export const ALL_SONGS: Song[] = Object.values(PLAYLISTS)
  .flat()
  .filter((s, i, all) => all.findIndex((x) => x.title === s.title && x.artist === s.artist) === i)

/** Música do dia: muda à meia-noite e passa por todas antes de repetir. */
export function songForDay(d = new Date()): Song {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
  return ALL_SONGS[day % ALL_SONGS.length]
}

export const SERVICES = ['Spotify', 'YouTube', 'Deezer'] as const
export type Service = (typeof SERVICES)[number]

export function songUrl(s: Song, service: Service) {
  const q = encodeURIComponent(`${s.title} ${s.artist}`)
  if (service === 'Spotify') return `https://open.spotify.com/search/${q}`
  if (service === 'YouTube') return `https://www.youtube.com/results?search_query=${q}`
  return `https://www.deezer.com/search/${q}`
}

export function songKey(s: Song) {
  return `${s.title}|${s.artist}`
}
