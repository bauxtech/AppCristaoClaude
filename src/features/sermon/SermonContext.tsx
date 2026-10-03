import { File } from 'expo-file-system'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import { AUDIO_DAYS, SAMPLE_RESULT, sampleSermons, type Sermon } from './data'

export interface Draft {
  uri: string | null
  durationSec: number
  notes: { ts: number; text: string }[]
  moments: { ts: number; label: string }[]
  keepAudio: boolean
  source: 'gravado' | 'importado'
  church: string
}

interface SermonValue {
  sermons: Sermon[]
  draft: Draft | null
  setDraft: (d: Draft | null) => void
  /** Cria o culto a partir do rascunho e começa a processar. */
  createFromDraft: (trim: { start: number; end: number }) => Sermon | null
  update: (id: string, patch: Partial<Sermon>) => void
  remove: (id: string) => void
  deleteAudio: (id: string) => void
  retry: (id: string) => void
}

const SermonContext = createContext<SermonValue | null>(null)

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function deleteFile(uri?: string) {
  if (!uri) return
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch {
    // Arquivo já não existe ou é da web.
  }
}

/**
 * Transcrição, resumo e versículos vêm do servidor (OpenAI e Claude, pelas Edge Functions).
 * Enquanto o servidor não existe, devolve o resultado de exemplo do protótipo, marcado como exemplo.
 */
export async function processSermon(_audioUri: string | null): Promise<typeof SAMPLE_RESULT & { sample: true }> {
  await new Promise((r) => setTimeout(r, 2500))
  return { ...SAMPLE_RESULT, sample: true }
}

export function SermonProvider({ children, initial }: { children: ReactNode; initial?: Sermon[] }) {
  const { sampleData } = useSession()
  const [sermons, setSermons] = useState<Sermon[]>(() => initial ?? getItem<Sermon[]>('sermons', sampleData ? sampleSermons() : []))
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (!initial) setItem('sermons', sermons)
  }, [sermons, initial])

  useDataReset((sample) => setSermons(sample ? sampleSermons() : []))

  // Áudio guardado fica 30 dias. Depois disso, só o texto.
  useEffect(() => {
    const today = iso(new Date())
    const expired = sermons.filter((s) => s.audioUri && s.audioExpiresAt && s.audioExpiresAt < today)
    if (!expired.length) return
    expired.forEach((s) => deleteFile(s.audioUri))
    setSermons((list) => list.map((s) => (expired.some((e) => e.id === s.id) ? { ...s, audioUri: undefined, audioExpiresAt: undefined } : s)))
  }, [sermons])

  const update = useCallback((id: string, patch: Partial<Sermon>) => setSermons((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])

  const run = useCallback(
    (s: Sermon) => {
      processSermon(s.audioUri ?? null)
        .then((r) => {
          const keep = s.keepAudio && !!s.audioUri
          if (!keep) deleteFile(s.audioUri)
          const exp = new Date()
          exp.setDate(exp.getDate() + AUDIO_DAYS)
          update(s.id, {
            status: 'ready',
            theme: s.theme || r.theme,
            preacher: s.preacher || r.preacher,
            transcript: r.transcript,
            summary: r.summary,
            points: r.points,
            questions: r.questions,
            verses: r.verses,
            sample: r.sample,
            audioUri: keep ? s.audioUri : undefined,
            audioExpiresAt: keep ? iso(exp) : undefined,
          })
        })
        .catch(() => update(s.id, { status: 'failed' }))
    },
    [update],
  )

  const value = useMemo<SermonValue>(
    () => ({
      sermons,
      draft,
      setDraft,
      createFromDraft: (trim) => {
        if (!draft) return null
        const now = new Date()
        const s: Sermon = {
          id: `c${now.getTime().toString(36)}`,
          createdAt: iso(now),
          date: iso(now),
          church: draft.church,
          preacher: '',
          theme: '',
          durationSec: draft.durationSec,
          trim,
          source: draft.source,
          status: 'processing',
          keepAudio: draft.keepAudio,
          audioUri: draft.uri ?? undefined,
          transcript: '',
          summary: '',
          points: [],
          questions: [],
          verses: [],
          notes: draft.notes,
          moments: draft.moments,
        }
        setSermons((l) => [s, ...l])
        setDraft(null)
        run(s)
        return s
      },
      update,
      remove: (id) =>
        setSermons((l) => {
          deleteFile(l.find((s) => s.id === id)?.audioUri)
          return l.filter((s) => s.id !== id)
        }),
      deleteAudio: (id) =>
        setSermons((l) =>
          l.map((s) => {
            if (s.id !== id) return s
            deleteFile(s.audioUri)
            return { ...s, audioUri: undefined, audioExpiresAt: undefined, keepAudio: false }
          }),
        ),
      retry: (id) => {
        const s = sermons.find((x) => x.id === id)
        if (!s) return
        update(id, { status: 'processing' })
        run({ ...s, status: 'processing' })
      },
    }),
    [sermons, draft, update, run],
  )

  return <SermonContext.Provider value={value}>{children}</SermonContext.Provider>
}

export function useSermons() {
  const v = useContext(SermonContext)
  if (!v) throw new Error('useSermons fora do SermonProvider')
  return v
}
