import NetInfo from '@react-native-community/netinfo'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// Internet do aparelho e estados de teste da prévia (sem internet, erro, carregando).

export type DemoState = 'offline' | 'error' | 'loading' | null

interface ConnectionValue {
  online: boolean
  /** A internet acabou de voltar: mostra "Sincronizando" por alguns segundos. */
  syncing: boolean
  /** Só na prévia: força um estado em todas as telas que buscam dados. */
  demo: DemoState
  setDemo: (d: DemoState) => void
}

const Ctx = createContext<ConnectionValue>({ online: true, syncing: false, demo: null, setDemo: () => {} })

export const SYNC_MS = 2500

export function ConnectionProvider({ children, initialDemo = null }: { children: ReactNode; initialDemo?: DemoState }) {
  const [netOnline, setNetOnline] = useState(true)
  const [demo, setDemo] = useState<DemoState>(initialDemo)
  const [syncing, setSyncing] = useState(false)
  const online = netOnline && demo !== 'offline'
  const prev = useRef(online)

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setNetOnline(s.isConnected !== false && s.isInternetReachable !== false))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (online && !prev.current) {
      setSyncing(true)
      const t = setTimeout(() => setSyncing(false), SYNC_MS)
      prev.current = online
      return () => clearTimeout(t)
    }
    prev.current = online
  }, [online])

  const value = useMemo(() => ({ online, syncing, demo, setDemo }), [online, syncing, demo])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConnection() {
  return useContext(Ctx)
}

/** Para telas que buscam dados do servidor: carregando, erro e tentar de novo. */
export function useRemoteState() {
  const { demo, setDemo, online } = useConnection()
  return { loading: demo === 'loading', error: demo === 'error', online, retry: () => setDemo(null) }
}
