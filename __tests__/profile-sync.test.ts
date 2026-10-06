import { AVATAR_PATH, profileDiffOps, type SyncedProfile } from '../src/features/profile/sync'
import { uuid } from '../src/lib/uuid'

const base: SyncedProfile = { privacy: { showPhoto: true, showBirthday: true, showBooks: false }, milestones: [], notes: [], favoriteSongs: [] }

test('aniversário e privacidade vão juntos para o perfil', () => {
  const ops = profileDiffOps(base, { ...base, birthday: '1998-03-15', privacy: { showPhoto: false, showBirthday: false, showBooks: true } })
  expect(ops).toEqual([{ kind: 'update', table: 'profiles', values: { birthday: '1998-03-15', show_photo: false, show_birthday: false, show_books: true }, match: { id: '$uid' } }])
})

test('foto nova do aparelho sobe para a pasta da pessoa; tirar a foto apaga o arquivo', () => {
  const up = profileDiffOps(base, { ...base, photoUri: 'file:///foto.jpg' })
  expect(up).toEqual([
    { kind: 'upload', bucket: 'avatars', path: AVATAR_PATH, uri: 'file:///foto.jpg', contentType: 'image/jpeg' },
    { kind: 'update', table: 'profiles', values: { photo_path: AVATAR_PATH }, match: { id: '$uid' } },
  ])
  expect(AVATAR_PATH.startsWith('$uid/')).toBe(true)
  const removed = profileDiffOps({ ...base, photoUri: 'https://x/foto' }, base)
  expect(removed.map((o) => o.kind)).toEqual(['remove', 'update'])
})

test('foto que veio do banco (link) não sobe de novo', () => {
  expect(profileDiffOps(base, { ...base, photoUri: 'https://projeto.supabase.co/storage/v1/object/sign/avatars/x' })).toEqual([])
})

test('jornada, anotações e músicas favoritas', () => {
  const m = { id: uuid(), type: 'Batismo', date: '2020-07-12', desc: 'Igreja Central' }
  const n = { id: uuid(), source: 'Pessoal' as const, ref: '', text: 'Nota', date: '2026-10-06' }
  const song = { title: 'Oceans', artist: 'Hillsong United' }
  const ops = profileDiffOps(base, { ...base, milestones: [m], notes: [n], favoriteSongs: [song] })
  expect(ops.map((o) => (o.kind === 'upsert' || o.kind === 'delete' ? `${o.kind}:${o.table}` : o.kind))).toEqual(['upsert:milestones', 'upsert:notes', 'upsert:favorite_songs'])
  expect(ops[0]).toMatchObject({ row: { id: m.id, user_id: '$uid', type: 'Batismo', description: 'Igreja Central' } })
  const back = profileDiffOps({ ...base, milestones: [m], notes: [n], favoriteSongs: [song] }, base)
  expect(back.map((o) => o.kind)).toEqual(['delete', 'delete', 'delete'])
})

test('item de antes do servidor (id antigo) fica só no aparelho', () => {
  expect(profileDiffOps(base, { ...base, milestones: [{ id: 'mk1', type: 'Batismo', date: '2020-07-12', desc: '' }] })).toEqual([])
})
