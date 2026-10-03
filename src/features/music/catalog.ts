// Músicas sugeridas pelo app. Nada toca dentro do app: tudo abre no Spotify, YouTube ou Deezer.
// As playlists por momento são de exemplo, com as músicas que aparecem no protótipo. A equipe monta as definitivas.

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
    { title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United' },
    { title: 'Lugar Secreto', artist: 'Gabriela Rocha' },
  ],
  manha: [
    { title: 'Reckless Love', artist: 'Cory Asbury' },
    { title: '10,000 Reasons', artist: 'Matt Redman' },
  ],
  celula: [
    { title: 'Way Maker', artist: 'Sinach' },
    { title: 'Goodness of God', artist: 'Bethel Music' },
  ],
  culto: [
    { title: 'How Great Is Our God', artist: 'Chris Tomlin' },
    { title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United' },
  ],
  familia: [
    { title: 'Goodness of God', artist: 'Bethel Music' },
    { title: '10,000 Reasons', artist: 'Matt Redman' },
  ],
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
