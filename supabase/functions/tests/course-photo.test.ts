// Curso pela foto ou PDF: a resposta da IA é conferida antes de chegar ao app, e os limites contam certo. O Claude é simulado.
import { describe, expect, test, vi } from 'vitest'
import { cleanCourse, readCoursePhoto, type CoursePhotoDeps } from '../_shared/course-photo.ts'
import type { Usage } from '../_shared/usage.ts'

const IMG = { data: 'aGVsbG8=', mediaType: 'image/jpeg' as const }
const PDF = { data: 'JVBERi0=', mediaType: 'application/pdf' as const }
const ok: Usage = { ok: true, remaining: 1, limit: 2, resetsAt: null }

function deps(over: { month?: Usage; day?: Usage; askJson?: CoursePhotoDeps['askJson'] } = {}) {
  const refundMonth = vi.fn(async () => {})
  const refundDay = vi.fn(async () => {})
  const d: CoursePhotoDeps = {
    useMonth: async () => ({ usage: over.month ?? ok, refund: refundMonth }),
    useDay: async () => ({ usage: over.day ?? ok, refund: refundDay }),
    askJson: over.askJson ?? (async () => ({ found: true, name: 'Escola de Líderes', type: 'Escola de líderes', firstDate: '05/11/2026', lessons: 8, time: '19:30' })),
  }
  return { d, refundMonth, refundDay }
}

describe('curso pela foto ou PDF', () => {
  test('foto: devolve os dados lidos e manda a foto junto com o pedido', async () => {
    const askJson = vi.fn(deps().d.askJson)
    const r = await readCoursePhoto(deps({ askJson }).d, IMG, 2026)
    expect(r).toEqual({ ok: true, course: { name: 'Escola de Líderes', type: 'Escola de líderes', firstDate: '05/11/2026', lessons: 8, time: '19:30' } })
    expect(askJson.mock.calls[0][0].image).toEqual(IMG)
    expect(askJson.mock.calls[0][0].prompt).toContain('2026')
  })

  test('PDF: manda o arquivo como PDF', async () => {
    const askJson = vi.fn(deps().d.askJson)
    await readCoursePhoto(deps({ askJson }).d, PDF, 2026)
    expect(askJson.mock.calls[0][0].image).toEqual(PDF)
    expect(askJson.mock.calls[0][0].prompt).toContain('PDF')
  })

  test('sem o plano, não chama a IA', async () => {
    const askJson = vi.fn()
    const r = await readCoursePhoto(deps({ month: { ok: false, reason: 'no_access' }, askJson }).d, IMG, 2026)
    expect(r).toEqual({ ok: false, reason: 'no_access' })
    expect(askJson).not.toHaveBeenCalled()
  })

  test('cursos do mês acabaram: avisa quando libera, sem gastar tentativa do dia', async () => {
    const useDay = vi.fn()
    const { d } = deps({ month: { ok: false, reason: 'limit', limit: 2, resetsAt: '2026-11-01T03:00:00.000Z' } })
    const r = await readCoursePhoto({ ...d, useDay }, IMG, 2026)
    expect(r).toEqual({ ok: false, reason: 'limit', scope: 'month', resetsAt: '2026-11-01T03:00:00.000Z' })
    expect(useDay).not.toHaveBeenCalled()
  })

  test('tentativas do dia acabaram: devolve o curso do mês', async () => {
    const { d, refundMonth } = deps({ day: { ok: false, reason: 'limit', limit: 5, resetsAt: '2026-10-15T03:00:00.000Z' } })
    expect(await readCoursePhoto(d, IMG, 2026)).toEqual({ ok: false, reason: 'limit', scope: 'day', resetsAt: '2026-10-15T03:00:00.000Z' })
    expect(refundMonth).toHaveBeenCalled()
  })

  test('arquivo que não é cronograma: não conta no mês, mas conta a tentativa do dia', async () => {
    const { d, refundMonth, refundDay } = deps({ askJson: async () => ({ found: false, name: '', type: '', firstDate: '', lessons: 0, time: '' }) })
    expect(await readCoursePhoto(d, IMG, 2026)).toEqual({ ok: false, reason: 'not_found' })
    expect(refundMonth).toHaveBeenCalled()
    expect(refundDay).not.toHaveBeenCalled()
  })

  test('erro da IA devolve as duas contagens', async () => {
    const { d, refundMonth, refundDay } = deps({ askJson: async () => Promise.reject(new Error('fora do ar')) })
    expect(await readCoursePhoto(d, IMG, 2026)).toEqual({ ok: false, reason: 'failed' })
    expect(refundMonth).toHaveBeenCalled()
    expect(refundDay).toHaveBeenCalled()
  })

  test('campo fora do formato fica vazio para a pessoa preencher', () => {
    expect(cleanCourse({ found: true, name: 'Casais', type: 'Inventado', firstDate: '32/13/2026', lessons: 500, time: '7h' })).toEqual({ name: 'Casais', type: '', firstDate: '', lessons: 0, time: '' })
    expect(cleanCourse({ found: true, name: '', type: '', firstDate: '', lessons: 0, time: '' })).toBeNull()
  })

})
