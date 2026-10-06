import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRelockOnBackground } from '../../lib/relock'
import { getItem, setItem } from '../../lib/storage'
import { enqueue, flush, pendingOps, useUserId } from '../../lib/sync'
import { uuid } from '../../lib/uuid'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import { sampleData, toISODate, type Campaign, type CampaignType, type DiaryEntry, type PrayerRequest } from './data'
import { currentCellId } from '../cell/current'
import { mergePrayer, prayerDiffOps, pullPrayer } from './sync'

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
  /** Conta o dia de hoje no total de dias com oração. */
  markPrayedToday: () => void
}

const PrayerContext = createContext<PrayerValue | null>(null)


/** Título curto a partir do texto do pedido: a primeira frase, cortada na palavra até 48 letras. */
export function titleFrom(text: string) {
  const first = text.trim().split(/[.!?\n]/)[0].trim()
  if (first.length <= 48) return first
  const cut = first.slice(0, 48)
  const space = cut.lastIndexOf(' ')
  return (space > 20 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '')
}

/** Conta nova: diário, pedidos e campanhas vazios. Exemplo: os do protótipo. */
export function prayerInitial(sample: boolean): PrayerState {
  return sample ? { ...sampleData(new Date()), diaryLock: true } : { diary: [], requests: [], campaigns: [], diaryLock: true }
}

export function PrayerProvider({ children, initial }: { children: ReactNode; initial?: Partial<PrayerState> }) {
  const { sampleData: sample, markActiveToday } = useSession()
  const [state, setState] = useState<PrayerState>(() => {
    if (initial) return { ...prayerInitial(true), ...initial }
    return getItem<PrayerState>('prayer', prayerInitial(sample))
  })
  useDataReset((s) => setState(prayerInitial(s)))
  const [diaryUnlocked, setDiaryUnlocked] = useState(false)
  // Volta a travar quando o app vai para segundo plano.
  useRelockOnBackground(() => setDiaryUnlocked(false))
  const [draftVideo, setDraftVideo] = useState<{ uri: string; seconds: number } | null>(null)

  useEffect(() => {
    if (!initial) setItem('prayer', state)
  }, [state, initial])

  // Cada mudança grava no aparelho (efeito acima) e manda a diferença para o banco. Exemplo não vai.
  const current = useRef(state)
  current.current = state
  const isSample = useRef(sample)
  isSample.current = sample
  const update = useCallback(
    (fn: (s: PrayerState) => PrayerState) => {
      const prev = current.current
      const next = fn(prev)
      if (next === prev) return
      current.current = next
      setState(next)
      if (!isSample.current && !initial) enqueue(...prayerDiffOps(prev, next, new Date(), currentCellId()))
    },
    [initial],
  )

  // Ao entrar: envia a fila e traz do banco o diário, os pedidos e as campanhas.
  const uid = useUserId()
  useEffect(() => {
    if (!uid || sample || initial) return
    let alive = true
    // Primeira vez desta conta neste aparelho: manda antes o que já estava aqui (itens com id uuid).
    const flag = `prayerSynced:${uid}`
    if (!getItem(flag, false)) enqueue(...prayerDiffOps({ diary: [], requests: [], campaigns: [] }, current.current, new Date(), currentCellId()))
    flush()
      // Se algo não foi enviado (sem internet), o aparelho está à frente do banco: não troca nada agora.
      .then(() => (pendingOps().length ? null : pullPrayer(uid)))
      .then((remote) => {
        // Algo novo entrou na fila durante a leitura: o aparelho segue à frente, troca na próxima vez.
        if (!alive || !remote || pendingOps().length) return
        const next = { ...current.current, ...mergePrayer(current.current, remote) }
        current.current = next
        setState(next)
        setItem(flag, true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [uid, sample]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<PrayerValue>(
    () => ({
      ...state,
      diaryUnlocked,
      setDiaryUnlocked,
      setDiaryLock: (v) => update((s) => ({ ...s, diaryLock: v })),
      addDiaryEntry: (text) => {
        markActiveToday()
        const entry = { id: uuid(), date: toISODate(new Date()), text: text.trim() }
        update((s) => ({ ...s, diary: [entry, ...s.diary] }))
        return entry
      },
      updateDiaryEntry: (id, text) => update((s) => ({ ...s, diary: s.diary.map((e) => (e.id === id ? { ...e, text: text.trim() } : e)) })),
      deleteDiaryEntry: (id) => update((s) => ({ ...s, diary: s.diary.filter((e) => e.id !== id) })),
      addRequest: ({ text, shared, videoUri }) => {
        const r: PrayerRequest = {
          id: uuid(),
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
        const c: Campaign = { id: uuid(), name: name.trim(), type, start, end, doneDays: [] }
        update((s) => ({ ...s, campaigns: [c, ...s.campaigns] }))
        return c
      },
      markCampaignDay: (id, day) => {
        markActiveToday()
        update((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id && !c.doneDays.includes(day) ? { ...c, doneDays: [...c.doneDays, day].sort((a, b) => a - b) } : c)) }))
      },
      markPrayedToday: markActiveToday,
      draftVideo,
      setDraftVideo,
    }),
    [state, diaryUnlocked, draftVideo, update, markActiveToday],
  )

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>
}

export function usePrayer() {
  const v = useContext(PrayerContext)
  if (!v) throw new Error('usePrayer fora do PrayerProvider')
  return v
}
