// Regras do teste de gravação. Ficam separadas da tela para serem testadas sem celular.

export interface Heartbeat {
  /** Hora do relógio, em milissegundos. */
  at: number
  /** Duração gravada informada pelo gravador nesse momento, em milissegundos. */
  recordedMs: number
  /** Estado do app: active (na tela), background (tela bloqueada ou outro app). */
  appState: string
}

export interface SessionInput {
  startedAt: number
  endedAt: number
  recordedMs: number
  heartbeats: Heartbeat[]
}

export interface SessionResult {
  wallSeconds: number
  recordedSeconds: number
  /** Tempo de relógio que não virou áudio. */
  lostSeconds: number
  /** Maior intervalo entre duas anotações. Acima de 2 minutos, o app ficou parado nesse trecho. */
  longestGapSeconds: number
  /** Minutos em que o app estava em segundo plano (tela bloqueada). */
  backgroundMinutes: number
  passed: boolean
  reason: string
}

/** Meta do teste: 60 minutos. */
export const TARGET_SECONDS = 60 * 60
/** Tolerância: até 30 segundos de diferença entre o relógio e o áudio. */
export const TOLERANCE_SECONDS = 30

export function evaluateSession(s: SessionInput): SessionResult {
  const wallSeconds = Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000))
  const recordedSeconds = Math.max(0, Math.round(s.recordedMs / 1000))
  const lostSeconds = Math.max(0, wallSeconds - recordedSeconds)

  let longestGapSeconds = 0
  const points = [s.startedAt, ...s.heartbeats.map((h) => h.at), s.endedAt]
  for (let i = 1; i < points.length; i++) {
    longestGapSeconds = Math.max(longestGapSeconds, Math.round((points[i] - points[i - 1]) / 1000))
  }

  const backgroundMinutes = s.heartbeats.filter((h) => h.appState !== 'active').length

  let passed = true
  let reason = 'Gravou 60 minutos sem perder áudio.'
  if (recordedSeconds < TARGET_SECONDS - TOLERANCE_SECONDS) {
    passed = false
    reason = wallSeconds < TARGET_SECONDS - TOLERANCE_SECONDS
      ? 'O teste foi parado antes de 60 minutos.'
      : 'O áudio gravado ficou menor que o tempo de relógio. O sistema cortou a gravação.'
  } else if (lostSeconds > TOLERANCE_SECONDS) {
    passed = false
    reason = 'O áudio gravado ficou menor que o tempo de relógio. O sistema cortou a gravação.'
  }

  return { wallSeconds, recordedSeconds, lostSeconds, longestGapSeconds, backgroundMinutes, passed, reason }
}

/** "29,4 MB" */
export function formatMegabytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return 'tamanho desconhecido'
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
