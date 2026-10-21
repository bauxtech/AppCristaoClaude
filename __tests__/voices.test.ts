import * as Speech from 'expo-speech'
import { prepareSpeech, rankVoice, voiceOptions } from '../src/features/audio/speechMode'

const v = (identifier: string, language: string, quality: 'Default' | 'Enhanced' = 'Default', name = identifier) => ({ identifier, language, quality, name }) as Speech.Voice

const IPHONE = [
  v('com.apple.ttsbundle.Luciana-compact', 'pt-BR', 'Default', 'Luciana'),
  v('com.apple.voice.enhanced.pt-BR.Felipe', 'pt-BR', 'Enhanced', 'Felipe'),
  v('com.apple.voice.premium.pt-BR.Luciana', 'pt-BR', 'Enhanced', 'Luciana'),
  v('com.apple.eloquence.pt-BR.Eddy', 'pt-BR', 'Default', 'Eddy'),
  v('com.apple.voice.compact.pt-PT.Joana', 'pt-PT', 'Default', 'Joana'),
  v('com.apple.voice.compact.en-US.Samantha', 'en-US', 'Default', 'Samantha'),
]

test('a melhor voz é a Premium em português do Brasil; inglês fica de fora', () => {
  const list = voiceOptions(IPHONE, 'ios')
  expect(list[0]).toMatchObject({ id: 'com.apple.voice.premium.pt-BR.Luciana', label: 'Luciana (Premium)' })
  expect(list[1].label).toBe('Felipe (Melhorada)')
  expect(list.map((x) => x.id)).not.toContain('com.apple.voice.compact.en-US.Samantha')
  // A de Portugal vem depois das boas do Brasil; a Eloquence, que soa robótica, fica por último.
  expect(list.map((x) => x.label).slice(-2)).toEqual(['Joana (Portugal)', 'Eddy'])
})

test('no Android, voz que precisa de internet perde para a instalada no celular', () => {
  const list = voiceOptions([v('pt-br-x-afs-network', 'pt-BR', 'Enhanced'), v('pt-br-x-ptd-local', 'pt-BR', 'Enhanced'), v('pt-br-language', 'pt_BR')], 'android')
  expect(list[0]).toMatchObject({ id: 'pt-br-x-ptd-local', label: 'Voz 1 (Melhorada)' })
  expect(list.find((x) => x.id === 'pt-br-x-afs-network')?.label).toMatch(/precisa de internet/)
  expect(rankVoice(v('en-us-x-sfg-local', 'en-US'))).toBeNull()
})

test('sem escolha, fala com a melhor voz; com escolha que sumiu do celular, também', async () => {
  const get = jest.fn(async () => IPHONE)
  ;(Speech as unknown as { getAvailableVoicesAsync: typeof get }).getAvailableVoicesAsync = get
  const { deviceVoices } = jest.requireActual('../src/features/audio/speechMode')
  await deviceVoices(true)
  expect(await prepareSpeech(null)).toBe('com.apple.voice.premium.pt-BR.Luciana')
  expect(await prepareSpeech('com.apple.voice.enhanced.pt-BR.Felipe')).toBe('com.apple.voice.enhanced.pt-BR.Felipe')
  expect(await prepareSpeech('voz-que-foi-apagada')).toBe('com.apple.voice.premium.pt-BR.Luciana')
})
