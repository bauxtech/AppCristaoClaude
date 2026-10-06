import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, setItem } from '../../lib/storage'
import { syncReminders } from '../../lib/reminders'
import { useRelockOnBackground } from '../../lib/relock'
import { useSession } from '../../state/session'
import { useDataReset } from '../../state/useDataReset'
import { sampleNotices, type Notice } from './notices'
import { defaultNotificationPrefs, type NotificationPrefs } from './prefs'
import { pushFaithConsent } from '../../lib/account'

export const DELETE_DAYS = 30
export const REPORT_REASONS = ['Conteúdo impróprio', 'Assédio', 'Spam', 'Outro']

export interface Report {
  id: string
  reason: string
  detail: string
  /** Nome de quem foi denunciado, quando houver. */
  target?: string
  /** Conteúdo denunciado, como "prayer:cp2" ou "board:b1". */
  content?: string
  at: string
}

export interface SettingsState {
  notices: Notice[]
  notif: NotificationPrefs
  /** Padrão ao gravar culto: só o texto (regra decidida) ou guardar o áudio por 30 dias. */
  recordingDefault: 'text' | 'audio'
  captions: boolean
  libras: boolean
  /** Modo simplificado: menos elementos por tela. */
  simple: boolean
  /** Pede biometria para abrir as anotações. O diário tem a própria trava, na oração. */
  notesLock: boolean
  bibleFont: 'serif' | 'sans'
  /** Identificador da voz do celular para ouvir a Bíblia. Vazio usa a voz padrão. */
  voice: string | null
  blocked: { id: string; name: string }[]
  reports: Report[]
  faithConsent: boolean
  /** Quando a conta será apagada. Vazio quando não há exclusão marcada. */
  deletionAt: string | null
}

interface SettingsValue extends SettingsState {
  /** Anotações desbloqueadas nesta sessão do app. */
  notesUnlocked: boolean
  setNotesUnlocked: (v: boolean) => void
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  dismissNotice: (id: string) => void
  setNotif: (p: Partial<NotificationPrefs>) => void
  setType: (k: keyof NotificationPrefs['types'], v: boolean) => void
  /** Com fromServer, o valor veio do banco e não é enviado de volta (não muda a data do consentimento). */
  update: (p: Partial<Pick<SettingsState, 'recordingDefault' | 'captions' | 'libras' | 'simple' | 'notesLock' | 'bibleFont' | 'voice' | 'faithConsent'>>, opts?: { fromServer?: boolean }) => void
  block: (id: string, name: string) => void
  unblock: (id: string) => void
  isBlocked: (name: string) => boolean
  report: (r: Omit<Report, 'id' | 'at'>) => void
  scheduleDeletion: (now?: Date) => string
  cancelDeletion: () => void
}

const Ctx = createContext<SettingsValue | null>(null)

export function settingsInitial(sample: boolean, timeChoice: string | null = null): SettingsState {
  return {
    notices: sample ? sampleNotices() : [],
    notif: defaultNotificationPrefs(timeChoice),
    recordingDefault: 'text',
    captions: false,
    libras: false,
    simple: false,
    notesLock: false,
    bibleFont: 'serif',
    voice: null,
    blocked: [],
    reports: [],
    faithConsent: true,
    deletionAt: null,
  }
}

export function SettingsProvider({ children, initial }: { children: ReactNode; initial?: Partial<SettingsState> }) {
  const { sampleData, profile } = useSession()
  const [state, setState] = useState<SettingsState>(() =>
    initial ? { ...settingsInitial(false), ...initial } : { ...settingsInitial(sampleData, profile.time), ...getItem<Partial<SettingsState>>('settings', {}) },
  )
  const [notesUnlocked, setNotesUnlocked] = useState(false)
  useRelockOnBackground(() => setNotesUnlocked(false))
  useEffect(() => {
    if (!initial) setItem('settings', state)
  }, [state, initial])
  useEffect(() => {
    if (!initial) syncReminders(state.notif)
  }, [state.notif, initial])
  // Troca de conta ou da prévia: refaz tudo que é da conta. Preferências de aviso ficam.
  useDataReset((s) => setState((prev) => ({ ...settingsInitial(s, profile.time), notif: prev.notif })))

  const value = useMemo<SettingsValue>(
    () => ({
      ...state,
      notesUnlocked,
      setNotesUnlocked,
      unreadCount: state.notices.filter((n) => !n.read).length,
      markRead: (id) => setState((s) => ({ ...s, notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => setState((s) => ({ ...s, notices: s.notices.map((n) => ({ ...n, read: true })) })),
      dismissNotice: (id) => setState((s) => ({ ...s, notices: s.notices.filter((n) => n.id !== id) })),
      setNotif: (p) => setState((s) => ({ ...s, notif: { ...s.notif, ...p } })),
      setType: (k, v) => setState((s) => ({ ...s, notif: { ...s.notif, types: { ...s.notif.types, [k]: v } } })),
      update: (p, opts) => {
        if (!opts?.fromServer && p.faithConsent !== undefined && p.faithConsent !== state.faithConsent) pushFaithConsent(p.faithConsent)
        setState((s) => ({ ...s, ...p }))
      },
      block: (id, name) => setState((s) => (s.blocked.some((b) => b.id === id) ? s : { ...s, blocked: [...s.blocked, { id, name }] })),
      unblock: (id) => setState((s) => ({ ...s, blocked: s.blocked.filter((b) => b.id !== id) })),
      isBlocked: (name) => state.blocked.some((b) => b.name === name),
      report: (r) => setState((s) => ({ ...s, reports: [...s.reports, { ...r, id: `rp${Date.now().toString(36)}`, at: new Date().toISOString() }] })),
      scheduleDeletion: (now = new Date()) => {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DELETE_DAYS).toISOString()
        setState((s) => ({ ...s, deletionAt: at }))
        return at
      },
      cancelDeletion: () => setState((s) => ({ ...s, deletionAt: null })),
    }),
    [state, notesUnlocked],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings fora do SettingsProvider')
  return v
}

/** Pessoas bloqueadas: o que elas publicam na célula some para quem bloqueou. */
export function useBlockedIds() {
  const { blocked } = useSettings()
  return useMemo(() => new Set(blocked.map((b) => b.id)), [blocked])
}
