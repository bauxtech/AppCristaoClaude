// Curso pela foto: a resposta da IA é conferida antes de chegar ao app. O Claude é simulado.
import { describe, expect, test, vi } from 'vitest'
import { cleanCourse, readCoursePhoto, type CoursePhotoDeps } from '../_shared/course-photo.ts'

const IMG = { data: 'aGVsbG8=', mediaType: 'image/jpeg' as const }
const ok = { ok: true as const, remaining: 4, limit: 5, resetsAt: null }

function deps(over: Partial<CoursePhotoDeps> = {}): CoursePhotoDeps {
  return {
    use: async () => ok,
    refund: vi.fn(async () => {}),
    askJson: async () => ({ found: true, name: 'Escola de Líderes', type: 'Escola de líderes', firstDate: '05/11/2026', lessons: 8, time: '19:30' }),
    ...over,
  }
}

describe('curso pela foto', () => {
  test('devolve os dados lidos e manda a foto junto com o pedido', async () => {
    const askJson = vi.fn(deps().askJson)
    const r = await readCoursePhoto(deps({ askJson }), IMG, 2026)
    expect(r).toEqual({ ok: true, course: { name: 'Escola de Líderes', type: 'Escola de líderes', firstDate: '05/11/2026', lessons: 8, time: '19:30' } })
    expect(askJson.mock.calls[0][0].image).toEqual(IMG)
    expect(askJson.mock.calls[0][0].prompt).toContain('2026')
  })

  test('sem o plano, não chama a IA', async () => {
    const askJson = vi.fn()
    const r = await readCoursePhoto(deps({ use: async () => ({ ok: false, reason: 'no_access' }), askJson }), IMG, 2026)
    expect(r).toEqual({ ok: false, reason: 'no_access' })
    expect(askJson).not.toHaveBeenCalled()
  })

  test('no limite do dia, avisa quando zera', async () => {
    const r = await readCoursePhoto(deps({ use: async () => ({ ok: false, reason: 'limit', limit: 5, resetsAt: '2026-10-15T03:00:00.000Z' }) }), IMG, 2026)
    expect(r).toEqual({ ok: false, reason: 'limit', resetsAt: '2026-10-15T03:00:00.000Z' })
  })

  test('foto que não é cronograma: avisa e conta o uso', async () => {
    const d = deps({ askJson: async () => ({ found: false, name: '', type: '', firstDate: '', lessons: 0, time: '' }) })
    expect(await readCoursePhoto(d, IMG, 2026)).toEqual({ ok: false, reason: 'not_found' })
    expect(d.refund).not.toHaveBeenCalled()
  })

  test('erro da IA devolve o uso', async () => {
    const d = deps({ askJson: async () => Promise.reject(new Error('fora do ar')) })
    expect(await readCoursePhoto(d, IMG, 2026)).toEqual({ ok: false, reason: 'failed' })
    expect(d.refund).toHaveBeenCalled()
  })

  test('campo fora do formato fica vazio para a pessoa preencher', () => {
    expect(cleanCourse({ found: true, name: 'Casais', type: 'Inventado', firstDate: '32/13/2026', lessons: 500, time: '7h' })).toEqual({ name: 'Casais', type: '', firstDate: '', lessons: 0, time: '' })
    expect(cleanCourse({ found: true, name: '', type: '', firstDate: '', lessons: 0, time: '' })).toBeNull()
  })
})
