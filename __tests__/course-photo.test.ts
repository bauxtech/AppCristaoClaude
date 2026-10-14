import { readCoursePhotoRemote, toBase64 } from '../src/features/church/coursePhoto'

const mockCall = jest.fn()
jest.mock('../src/lib/supabase', () => ({ ...jest.requireActual('../src/lib/supabase'), callFunction: (...a: unknown[]) => mockCall(...a) }))

beforeEach(() => mockCall.mockReset())

test('manda a foto e devolve o que o servidor leu', async () => {
  mockCall.mockResolvedValue({ ok: true, course: { name: 'Batismo', type: 'Batismo', firstDate: '05/11/2026', lessons: 4, time: '19:30' } })
  const r = await readCoursePhotoRemote('aGVsbG8=', 'image/heic')
  expect(mockCall).toHaveBeenCalledWith('course-photo', { image: 'aGVsbG8=', mediaType: 'image/jpeg' })
  expect(r).toEqual({ ok: true, course: { name: 'Batismo', type: 'Batismo', firstDate: '05/11/2026', lessons: 4, time: '19:30' } })
})

test('limites do mês e do dia chegam separados', async () => {
  mockCall.mockResolvedValue({ ok: false, reason: 'limit', scope: 'month', resetsAt: '2026-11-01T03:00:00Z' })
  expect(await readCoursePhotoRemote('x', 'image/png')).toEqual({ ok: false, reason: 'limit_month', resetsAt: '2026-11-01T03:00:00Z' })
  mockCall.mockResolvedValue({ ok: false, reason: 'limit', scope: 'day', resetsAt: '2026-10-15T03:00:00Z' })
  expect(await readCoursePhotoRemote('x', 'image/png')).toEqual({ ok: false, reason: 'limit_day', resetsAt: '2026-10-15T03:00:00Z' })
  mockCall.mockResolvedValue({ ok: false, reason: 'too_many_pages' })
  expect(await readCoursePhotoRemote('x', 'application/pdf')).toEqual({ ok: false, reason: 'too_many_pages' })
})

test('PDF vai como PDF', async () => {
  mockCall.mockResolvedValue({ ok: false, reason: 'not_found' })
  await readCoursePhotoRemote('x', 'application/pdf')
  expect(mockCall).toHaveBeenCalledWith('course-photo', { image: 'x', mediaType: 'application/pdf' })
})

test('base64 do arquivo, também em arquivo grande', () => {
  expect(toBase64(new TextEncoder().encode('hello').buffer as ArrayBuffer)).toBe('aGVsbG8=')
  const big = new Uint8Array(100_000).fill(65)
  expect(atob(toBase64(big.buffer)).length).toBe(100_000)
})

test('sem internet ou resposta estranha: falhou, sem quebrar a tela', async () => {
  mockCall.mockRejectedValue(new Error('offline'))
  expect(await readCoursePhotoRemote('x', 'image/jpeg')).toEqual({ ok: false, reason: 'failed' })
  mockCall.mockResolvedValue({ ok: false, reason: 'outra coisa' })
  expect(await readCoursePhotoRemote('x', 'image/jpeg')).toEqual({ ok: false, reason: 'failed' })
})
