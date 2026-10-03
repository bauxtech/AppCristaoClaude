import { evaluateSession, formatMegabytes } from '../src/features/recording-test/evaluate'

const start = 1_000_000
const min = 60_000

function beats(n: number, state = 'background') {
  return Array.from({ length: n }, (_, i) => ({ at: start + (i + 1) * min, recordedMs: (i + 1) * min, appState: state }))
}

test('passa quando grava 60 minutos inteiros', () => {
  const r = evaluateSession({ startedAt: start, endedAt: start + 60 * min, recordedMs: 60 * min, heartbeats: beats(59) })
  expect(r.passed).toBe(true)
  expect(r.backgroundMinutes).toBe(59)
  expect(r.longestGapSeconds).toBe(60)
})

test('não passa quando o sistema corta o áudio no meio', () => {
  const r = evaluateSession({ startedAt: start, endedAt: start + 61 * min, recordedMs: 12 * min, heartbeats: beats(12) })
  expect(r.passed).toBe(false)
  expect(r.lostSeconds).toBe(49 * 60)
  expect(r.reason).toContain('cortou')
})

test('não passa quando o teste é parado antes de 60 minutos', () => {
  const r = evaluateSession({ startedAt: start, endedAt: start + 20 * min, recordedMs: 20 * min, heartbeats: beats(19) })
  expect(r.passed).toBe(false)
  expect(r.reason).toContain('antes de 60 minutos')
})

test('aponta o intervalo em que o app ficou parado', () => {
  const hb = [{ at: start + min, recordedMs: min, appState: 'background' }, { at: start + 40 * min, recordedMs: 40 * min, appState: 'background' }]
  const r = evaluateSession({ startedAt: start, endedAt: start + 60 * min, recordedMs: 60 * min, heartbeats: hb })
  expect(r.longestGapSeconds).toBe(39 * 60)
})

test('formata o tamanho do arquivo', () => {
  expect(formatMegabytes(30_828_000)).toBe('29,4 MB')
  expect(formatMegabytes(null)).toBe('tamanho desconhecido')
})
