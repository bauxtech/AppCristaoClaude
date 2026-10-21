import * as Speech from 'expo-speech'
import { speechChunks } from './speechChunks'
import { prepareSpeech } from './speechMode'
import { useSettings } from '../settings/SettingsContext'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// Leitura em voz alta com a voz do próprio aparelho (funciona sem internet).
// O áudio gravado por narrador entra depois; a voz sintetizada continua como opção.

export const SPEEDS = [1, 1.25, 1.5] as const
/** A voz do celular em 1x soa rápida para leitura bíblica (QA de 20/10): o 1x do app fala um pouco mais devagar. */
export const BASE_RATE = 0.85
export type Speed = (typeof SPEEDS)[number]

interface Track {
  title: string
  text: string
}

interface AudioValue {
  track: Track | null
  playing: boolean
  speed: Speed
  play: (t: Track) => void
  toggle: () => void
  cycleSpeed: () => void
  close: () => void
}

const AudioContext = createContext<AudioValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const speedRef = useRef<Speed>(1)
  const { voice } = useSettings()
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  // Cada pedido de leitura ganha um número: se a pessoa parar ou trocar antes de o áudio ficar pronto, o antigo não toca.
  const turn = useRef(0)

  const speak = useCallback((t: Track, rate: Speed) => {
    Speech.stop()
    // Capítulo longo vai em partes: a voz do celular enfileira uma depois da outra.
    const limit = Math.min(Speech.maxSpeechInputLength || 4000, 4000) - 500
    const parts = speechChunks(t.text, limit)
    const mine = ++turn.current
    setPlaying(parts.length > 0)
    void prepareSpeech().then(() => {
      if (mine !== turn.current) return
      parts.forEach((part, i) =>
        Speech.speak(part, {
          language: 'pt-BR',
          voice: voiceRef.current ?? undefined,
          rate: rate * BASE_RATE,
          onDone: i === parts.length - 1 ? () => setPlaying(false) : undefined,
          onStopped: () => setPlaying(false),
          onError: () => (Speech.stop(), setPlaying(false)),
        }),
      )
    })
  }, [])

  const silence = useCallback(() => {
    turn.current++
    Speech.stop()
  }, [])

  useEffect(
    () => () => {
      Speech.stop()
    },
    [],
  )

  const value = useMemo<AudioValue>(
    () => ({
      track,
      playing,
      speed,
      play: (t) => {
        setTrack(t)
        speak(t, speedRef.current)
      },
      toggle: () => {
        if (!track) return
        if (playing) {
          silence()
          setPlaying(false)
        } else speak(track, speedRef.current)
      },
      cycleSpeed: () => {
        const next = SPEEDS[(SPEEDS.indexOf(speedRef.current) + 1) % SPEEDS.length]
        speedRef.current = next
        setSpeed(next)
        if (track && playing) speak(track, next)
      },
      close: () => {
        silence()
        setPlaying(false)
        setTrack(null)
      },
    }),
    [track, playing, speed, speak, silence],
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const ctx = useContext(AudioContext)
  if (!ctx) throw new Error('useAudio precisa estar dentro de AudioProvider')
  return ctx
}
