import { ALL_SONGS, PLAYLISTS, songForDay } from '../src/features/music/catalog'

describe('músicas sugeridas', () => {
  test('cada momento tem músicas e a lista geral não repete', () => {
    for (const list of Object.values(PLAYLISTS)) expect(list.length).toBeGreaterThan(0)
    expect(new Set(ALL_SONGS.map((s) => `${s.title}|${s.artist}`)).size).toBe(ALL_SONGS.length)
  })
  test('a música do dia muda de um dia para o outro e é a mesma no mesmo dia', () => {
    const a = songForDay(new Date(2026, 9, 11, 8))
    expect(songForDay(new Date(2026, 9, 11, 23))).toEqual(a)
    expect(songForDay(new Date(2026, 9, 12, 8))).not.toEqual(a)
  })
})
