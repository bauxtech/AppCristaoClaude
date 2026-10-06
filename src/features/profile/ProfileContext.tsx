import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { enqueue, flush, pendingOps, useUserId } from '../../lib/sync'
import { uuid } from '../../lib/uuid'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import type { Song } from '../music/catalog'
import { profileDiffOps, pullProfileData } from './sync'

export const MILESTONE_TYPES = ['Conversão', 'Batismo', 'Casamento', 'Ministério', 'Missão', 'Curso', 'Outro']
export const NOTE_SOURCES = ['Bíblia', 'Culto', 'Curso', 'Célula', 'Pessoal'] as const
export type NoteSource = (typeof NOTE_SOURCES)[number]

export interface Milestone {
  id: string
  type: string
  date: string
  desc: string
}

export interface FreeNote {
  id: string
  source: NoteSource
  ref: string
  text: string
  date: string
}

interface ProfileState {
  photoUri?: string
  birthday?: string
  privacy: { showPhoto: boolean; showBirthday: boolean; showBooks: boolean }
  milestones: Milestone[]
  notes: FreeNote[]
  favoriteSongs: Song[]
}

interface ProfileValue extends ProfileState {
  setPhoto: (uri?: string) => void
  setBirthday: (iso?: string) => void
  setPrivacy: (p: Partial<ProfileState['privacy']>) => void
  saveMilestone: (m: Omit<Milestone, 'id'> & { id?: string }) => void
  removeMilestone: (id: string) => void
  saveNote: (n: Omit<FreeNote, 'id' | 'date'> & { id?: string }) => FreeNote
  removeNote: (id: string) => void
  toggleSong: (s: Song) => void
}

const Ctx = createContext<ProfileValue | null>(null)

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Conta nova: nada registrado. Exemplo: os marcos e notas do protótipo. */
export function profileInitial(sample: boolean): ProfileState {
  const base: ProfileState = { privacy: { showPhoto: true, showBirthday: true, showBooks: false }, milestones: [], notes: [], favoriteSongs: [] }
  if (!sample) return base
  return {
    ...base,
    birthday: '1998-03-15',
    milestones: [
      { id: 'mk1', type: 'Conversão', date: '2019-03-10', desc: 'Igreja Batista Central de São Paulo' },
      { id: 'mk2', type: 'Batismo', date: '2020-07-12', desc: 'Igreja Batista Central de São Paulo' },
    ],
    notes: [{ id: 'n1', source: 'Célula', ref: 'Reunião de 30 de setembro', text: 'Refletimos sobre a prática da oração diária. Como criar um hábito e manter mesmo em dias corridos.', date: '2026-09-30' }],
    favoriteSongs: [{ title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong United' }],
  }
}

export function ProfileProvider({ children, initial }: { children: ReactNode; initial?: Partial<ProfileState> }) {
  const { sampleData } = useSession()
  const [state, setStateRaw] = useState<ProfileState>(() => (initial ? { ...profileInitial(false), ...initial } : getItem<ProfileState>('profileData', profileInitial(sampleData))))
  useEffect(() => {
    if (!initial) setItem('profileData', state)
  }, [state, initial])
  useDataReset((s) => setStateRaw(profileInitial(s)))

  // Cada mudança manda a diferença para o banco. Dados de exemplo não vão.
  const current = useRef(state)
  current.current = state
  const sample = useRef(sampleData)
  sample.current = sampleData
  const setState = useCallback(
    (fn: (s: ProfileState) => ProfileState) => {
      const prev = current.current
      const next = fn(prev)
      if (next === prev) return
      current.current = next
      setStateRaw(next)
      if (!sample.current && !initial) enqueue(...profileDiffOps(prev, next))
    },
    [initial],
  )

  // Ao entrar: manda o que já estava no aparelho (primeira vez) e traz o perfil do banco.
  const uid = useUserId()
  useEffect(() => {
    if (!uid || sampleData || initial) return
    let alive = true
    const flag = `profileSynced:${uid}`
    if (!getItem(flag, false)) enqueue(...profileDiffOps(profileInitial(false), current.current))
    flush()
      .then(() => (pendingOps().length ? null : pullProfileData(uid)))
      .then((remote) => {
        if (!alive || !remote || pendingOps().length) return
        const next = { ...current.current, ...remote, photoUri: remote.photoUri }
        current.current = next
        setStateRaw(next)
        setItem(flag, true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [uid, sampleData]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ProfileValue>(
    () => ({
      ...state,
      setPhoto: (uri) => setState((s) => ({ ...s, photoUri: uri })),
      setBirthday: (iso) => setState((s) => ({ ...s, birthday: iso })),
      setPrivacy: (p) => setState((s) => ({ ...s, privacy: { ...s.privacy, ...p } })),
      saveMilestone: (m) =>
        setState((s) => {
          const id = m.id ?? uuid()
          const item = { ...m, id }
          return { ...s, milestones: s.milestones.some((x) => x.id === id) ? s.milestones.map((x) => (x.id === id ? item : x)) : [...s.milestones, item] }
        }),
      removeMilestone: (id) => setState((s) => ({ ...s, milestones: s.milestones.filter((m) => m.id !== id) })),
      saveNote: (n) => {
        const id = n.id ?? uuid()
        const existing = state.notes.find((x) => x.id === id)
        const item: FreeNote = { ...n, id, date: existing?.date ?? today() }
        setState((s) => ({ ...s, notes: s.notes.some((x) => x.id === id) ? s.notes.map((x) => (x.id === id ? item : x)) : [item, ...s.notes] }))
        return item
      },
      removeNote: (id) => setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),
      toggleSong: (song) =>
        setState((s) => {
          const has = s.favoriteSongs.some((x) => x.title === song.title && x.artist === song.artist)
          return { ...s, favoriteSongs: has ? s.favoriteSongs.filter((x) => !(x.title === song.title && x.artist === song.artist)) : [...s.favoriteSongs, song] }
        }),
    }),
    [state, setState],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProfile() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProfile fora do ProfileProvider')
  return v
}
