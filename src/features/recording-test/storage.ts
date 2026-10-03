import { File, Paths } from 'expo-file-system'
import type { Heartbeat } from './evaluate'

// As sessões do teste ficam só no celular, num arquivo do app. Nada vai para a internet.

export interface StoredSession {
  id: string
  startedAt: number
  endedAt: number
  recordedMs: number
  sizeBytes: number | null
  uri: string | null
  platform: string
  heartbeats: Heartbeat[]
}

const FILE_NAME = 'teste-gravacao.json'

function file() {
  return new File(Paths.document, FILE_NAME)
}

export function loadSessions(): StoredSession[] {
  try {
    const f = file()
    if (!f.exists) return []
    return JSON.parse(f.textSync()) as StoredSession[]
  } catch {
    return []
  }
}

export function saveSessions(sessions: StoredSession[]) {
  const f = file()
  if (!f.exists) f.create()
  f.write(JSON.stringify(sessions))
}

export function fileSize(uri: string | null): number | null {
  if (!uri) return null
  try {
    const f = new File(uri)
    return f.exists ? f.size : null
  } catch {
    return null
  }
}

export function deleteRecording(uri: string | null) {
  if (!uri) return
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch {
    // arquivo já não existe
  }
}
