// Curso pela foto do cronograma (plano Completo e Líder): a IA lê a foto e a pessoa confere antes de salvar.
// Nada da foto fica guardado no servidor.

import type { AskJson } from './claude-types.ts'
import type { Usage } from './usage.ts'

// Os mesmos tipos do app (src/features/church/data.ts). Vazio quando nenhum combina.
export const COURSE_TYPES = ['Batismo', 'Escola de líderes', 'Teologia', 'Encontro'] as const

export const COURSE_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean', description: 'false se a foto não mostra o cronograma de um curso' },
    name: { type: 'string', description: 'Nome do curso, como está escrito. Vazio se não aparecer' },
    type: { type: 'string', enum: [...COURSE_TYPES, ''] },
    firstDate: { type: 'string', description: 'Data da primeira aula em DD/MM/AAAA. Vazio se não aparecer' },
    lessons: { type: 'integer', description: 'Quantidade de aulas. 0 se não der para saber' },
    time: { type: 'string', description: 'Horário das aulas em HH:MM (24 horas). Vazio se não aparecer' },
  },
  required: ['found', 'name', 'type', 'firstDate', 'lessons', 'time'],
  additionalProperties: false,
}

export const COURSE_SYSTEM = `Você lê a foto do cronograma de um curso de igreja e devolve os dados em JSON.
Copie só o que está escrito na foto. Não invente: o que não aparecer fica vazio (ou 0 em lessons).
Se o ano da primeira aula não aparecer, use o ano informado no pedido.
type: escolha o tipo da lista que combina com o nome do curso; se nenhum combinar, deixe vazio.`

export interface CourseRead {
  name: string
  type: (typeof COURSE_TYPES)[number] | ''
  firstDate: string
  lessons: number
  time: string
}

export type CoursePhotoResult = { ok: true; course: CourseRead } | { ok: false; reason: 'no_access' | 'limit' | 'not_found' | 'failed'; resetsAt?: string | null }

const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Confere o que a IA devolveu: campo fora do formato fica vazio, para a pessoa preencher. */
export function cleanCourse(raw: unknown): CourseRead | null {
  const r = (raw ?? {}) as Record<string, unknown>
  if (r.found === false) return null
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : ''
  const type = COURSE_TYPES.includes(r.type as (typeof COURSE_TYPES)[number]) ? (r.type as CourseRead['type']) : ''
  const d = typeof r.firstDate === 'string' ? DATE.exec(r.firstDate.trim()) : null
  const validDate = d && +d[1] >= 1 && +d[1] <= 31 && +d[2] >= 1 && +d[2] <= 12
  const lessons = typeof r.lessons === 'number' && Number.isInteger(r.lessons) && r.lessons >= 1 && r.lessons <= 99 ? r.lessons : 0
  const time = typeof r.time === 'string' && TIME.test(r.time.trim()) ? r.time.trim() : ''
  if (!name && !validDate && !lessons && !time) return null
  return { name, type, firstDate: validDate ? r.firstDate!.toString().trim() : '', lessons, time }
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export interface CoursePhotoDeps {
  /** Confere o plano e conta um uso (limite por dia). */
  use: () => Promise<Usage>
  /** Devolve o uso quando a leitura falha. */
  refund: () => Promise<void>
  askJson: AskJson
}

export async function readCoursePhoto(deps: CoursePhotoDeps, image: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }, year: number): Promise<CoursePhotoResult> {
  const usage = await deps.use()
  if (!usage.ok) return usage.reason === 'limit' ? { ok: false, reason: 'limit', resetsAt: usage.resetsAt } : { ok: false, reason: 'no_access' }
  try {
    const raw = await deps.askJson({ system: COURSE_SYSTEM, prompt: `Ano atual: ${year}. Leia o cronograma da foto.`, schema: COURSE_SCHEMA, effort: 'low', maxTokens: 1000, image })
    const course = cleanCourse(raw)
    if (!course) return { ok: false, reason: 'not_found' }
    return { ok: true, course }
  } catch (e) {
    console.error('course-photo', e)
    await deps.refund()
    return { ok: false, reason: 'failed' }
  }
}
