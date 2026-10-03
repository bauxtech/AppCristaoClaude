import * as Speech from 'expo-speech'
import { useSettings } from '../settings/SettingsContext'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// Leitura em voz alta com a voz do próprio aparelho (funciona sem internet).
// O áudio gravado por narrador entra depois; a voz sintetizada continua como opção.

export const SPEEDS = [1, 1.25, 1.5] as const
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

  const speak = useCallback((t: Track, rate: Speed) => {
    Speech.stop()
    Speech.speak(t.text, {
      language: 'pt-BR',
      voice: voiceRef.current ?? undefined,
      rate,
      onDone: () => setPlaying(false),
      onStopped: () => setPlaying(false),
      onError: () => setPlaying(false),
    })
    setPlaying(true)
  }, [])

  useEffect(() => () => {
    Speech.stop()
  }, [])

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
          Speech.stop()
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
        Speech.stop()
        setPlaying(false)
        setTrack(null)
      },
    }),
    [track, playing, speed, speak],
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const ctx = useContext(AudioContext)
  if (!ctx) throw new Error('useAudio precisa estar dentro de AudioProvider')
  return ctx
}
