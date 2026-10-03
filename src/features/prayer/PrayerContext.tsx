import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { sampleData, toISODate, type Campaign, type CampaignType, type DiaryEntry, type PrayerRequest } from './data'

interface PrayerState {
  diary: DiaryEntry[]
  requests: PrayerRequest[]
  campaigns: Campaign[]
  /** Diário protegido por biometria ou código do celular. Opcional, ligado por padrão. */
  diaryLock: boolean
}

interface PrayerValue extends PrayerState {
  /** Desbloqueado nesta sessão do app. Volta a travar quando o app fecha. */
  diaryUnlocked: boolean
  setDiaryUnlocked: (v: boolean) => void
  setDiaryLock: (v: boolean) => void
  addDiaryEntry: (text: string) => DiaryEntry
  updateDiaryEntry: (id: string, text: string) => void
  deleteDiaryEntry: (id: string) => void
  addRequest: (r: { text: string; shared: boolean; videoUri?: string }) => PrayerRequest
  updateRequest: (id: string, patch: Partial<Pick<PrayerRequest, 'text' | 'title' | 'shared'>>) => void
  deleteRequest: (id: string) => void
  markAnswered: (id: string, date: string, testimony: string) => void
  addCampaign: (c: { name: string; type: CampaignType; start: string; end: string }) => Campaign
  markCampaignDay: (id: string, day: number) => void
  /** Vídeo em Libras gravado para o pedido que está sendo escrito. */
  draftVideo: { uri: string; seconds: number } | null
  setDraftVideo: (v: { uri: string; seconds: number } | null) => void
}

const PrayerContext = createContext<PrayerValue | null>(null)

let seq = 0
function newId(prefix: string) {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}`
}

/** Título curto a partir do texto do pedido: a primeira frase, cortada na palavra até 48 letras. */
export function titleFrom(text: string) {
  const first = text.trim().split(/[.!?\n]/)[0].trim()
  if (first.length <= 48) return first
  const cut = first.slice(0, 48)
  const space = cut.lastIndexOf(' ')
  return (space > 20 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '')
}

export function PrayerProvider({ children, initial }: { children: ReactNode; initial?: Partial<PrayerState> }) {
  const [state, setState] = useState<PrayerState>(() => {
    if (initial) return { ...sampleData(new Date()), diaryLock: true, ...initial }
    return getItem<PrayerState>('prayer', { ...sampleData(new Date()), diaryLock: true })
  })
  const [diaryUnlocked, setDiaryUnlocked] = useState(false)
  const [draftVideo, setDraftVideo] = useState<{ uri: string; seconds: number } | null>(null)

  useEffect(() => {
    if (!initial) setItem('prayer', state)
  }, [state, initial])

  const update = useCallback((fn: (s: PrayerState) => PrayerState) => setState(fn), [])

  const value = useMemo<PrayerValue>(
    () => ({
      ...state,
      diaryUnlocked,
      setDiaryUnlocked,
      setDiaryLock: (v) => update((s) => ({ ...s, diaryLock: v })),
      addDiaryEntry: (text) => {
        const entry = { id: newId('d'), date: toISODate(new Date()), text: text.trim() }
        update((s) => ({ ...s, diary: [entry, ...s.diary] }))
        return entry
      },
      updateDiaryEntry: (id, text) => update((s) => ({ ...s, diary: s.diary.map((e) => (e.id === id ? { ...e, text: text.trim() } : e)) })),
      deleteDiaryEntry: (id) => update((s) => ({ ...s, diary: s.diary.filter((e) => e.id !== id) })),
      addRequest: ({ text, shared, videoUri }) => {
        const r: PrayerRequest = {
          id: newId('r'),
          title: text.trim() ? titleFrom(text) : 'Pedido em Libras',
          text: text.trim(),
          createdAt: toISODate(new Date()),
          shared,
          prayedBy: [],
          videoUri,
        }
        update((s) => ({ ...s, requests: [r, ...s.requests] }))
        return r
      },
      updateRequest: (id, patch) => update((s) => ({ ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRequest: (id) => update((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) })),
      markAnswered: (id, date, testimony) =>
        update((s) => ({ ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, answeredAt: date, testimony: testimony.trim() || undefined } : r)) })),
      addCampaign: ({ name, type, start, end }) => {
        const c: Campaign = { id: newId('c'), name: name.trim(), type, start, end, doneDays: [] }
        update((s) => ({ ...s, campaigns: [c, ...s.campaigns] }))
        return c
      },
      markCampaignDay: (id, day) =>
        update((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id && !c.doneDays.includes(day) ? { ...c, doneDays: [...c.doneDays, day].sort((a, b) => a - b) } : c)) })),
      draftVideo,
      setDraftVideo,
    }),
    [state, diaryUnlocked, draftVideo, update],
  )

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>
}

export function usePrayer() {
  const v = useContext(PrayerContext)
  if (!v) throw new Error('usePrayer fora do PrayerProvider')
  return v
}
