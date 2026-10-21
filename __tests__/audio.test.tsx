import { act } from '@testing-library/react-native'
import { setAudioModeAsync } from 'expo-audio'
import * as Speech from 'expo-speech'
import { useAudio } from '../src/features/audio/AudioContext'
import { renderApp } from '../test-utils/render'

let audio: ReturnType<typeof useAudio>
function Probe() {
  audio = useAudio()
  return null
}

beforeEach(() => {
  jest.mocked(Speech.speak).mockClear()
  jest.mocked(setAudioModeAsync).mockClear()
})

test('ouvir: liga o som no modo silencioso do iPhone antes de a voz começar', async () => {
  await renderApp(<Probe />, { onboarded: true })
  await act(async () => audio.play({ title: 'Salmos 23', text: 'O Senhor é o meu pastor.' }))
  expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ playsInSilentMode: true }))
  expect(Speech.speak).toHaveBeenCalledWith('O Senhor é o meu pastor.', expect.objectContaining({ language: 'pt-BR' }))
  expect(jest.mocked(setAudioModeAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Speech.speak).mock.invocationCallOrder[0])
  expect(audio.playing).toBe(true)
})

test('parar antes de o áudio ficar pronto: a voz não começa', async () => {
  await renderApp(<Probe />, { onboarded: true })
  await act(async () => {
    audio.play({ title: 'Salmos 23', text: 'O Senhor é o meu pastor.' })
    audio.close()
  })
  expect(Speech.speak).not.toHaveBeenCalled()
})
