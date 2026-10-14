import { readCoursePhotoRemote } from '../src/features/church/coursePhoto'

const mockCall = jest.fn()
jest.mock('../src/lib/supabase', () => ({ ...jest.requireActual('../src/lib/supabase'), callFunction: (...a: unknown[]) => mockCall(...a) }))

beforeEach(() => mockCall.mockReset())

test('manda a foto e devolve o que o servidor leu', async () => {
  mockCall.mockResolvedValue({ ok: true, course: { name: 'Batismo', type: 'Batismo', firstDate: '05/11/2026', lessons: 4, time: '19:30' } })
  const r = await readCoursePhotoRemote('aGVsbG8=', 'image/heic')
  expect(mockCall).toHaveBeenCalledWith('course-photo', { image: 'aGVsbG8=', mediaType: 'image/jpeg' })
  expect(r).toEqual({ ok: true, course: { name: 'Batismo', type: 'Batismo', firstDate: '05/11/2026', lessons: 4, time: '19:30' } })
})

test('sem o plano ou no limite, repassa o motivo', async () => {
  mockCall.mockResolvedValue({ ok: false, reason: 'limit', resetsAt: '2026-10-15T03:00:00Z' })
  expect(await readCoursePhotoRemote('x', 'image/png')).toEqual({ ok: false, reason: 'limit', resetsAt: '2026-10-15T03:00:00Z' })
})

test('sem internet ou resposta estranha: falhou, sem quebrar a tela', async () => {
  mockCall.mockRejectedValue(new Error('offline'))
  expect(await readCoursePhotoRemote('x', 'image/jpeg')).toEqual({ ok: false, reason: 'failed' })
  mockCall.mockResolvedValue({ ok: false, reason: 'outra coisa' })
  expect(await readCoursePhotoRemote('x', 'image/jpeg')).toEqual({ ok: false, reason: 'failed' })
})
