// Curso pela foto ou PDF do cronograma (plano Completo e Líder): a IA lê e a pessoa confere antes de salvar.
// Nada fica guardado no servidor. Limites: cursos lidos por mês (só conta leitura que deu certo)
// e tentativas por dia (contam mesmo as que falham, para ninguém mandar arquivo sem parar).

import type { AskJson, FileType } from './claude-types.ts'
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

export const COURSE_SYSTEM = `Você lê a foto ou o PDF do cronograma de um curso de igreja e devolve os dados em JSON.
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

export type CoursePhotoResult =
  | { ok: true; course: CourseRead }
  | { ok: false; reason: 'no_access' | 'not_found' | 'failed' }
  /** month: os cursos do mês acabaram. day: tentativas do dia acabaram. */
  | { ok: false; reason: 'limit'; scope: 'month' | 'day'; resetsAt: string | null }

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
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_PDF_PAGES = 20

/** Páginas do PDF, contando os objetos de página. Aproximado, mas suficiente para barrar arquivo grande. */
export function pdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(bytes)
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length
}

type Used = { usage: Usage; refund: () => Promise<void> }

export interface CoursePhotoDeps {
  /** Conta um curso no mês. Devolvido se a leitura não der certo. */
  useMonth: () => Promise<Used>
  /** Conta uma tentativa no dia. Só devolvida se o servidor falhar. */
  useDay: () => Promise<Used>
  askJson: AskJson
}

const blocked = (u: Usage): CoursePhotoResult | null =>
  u.ok ? null : u.reason === 'limit' ? { ok: false, reason: 'limit', scope: 'month', resetsAt: u.resetsAt } : { ok: false, reason: 'no_access' }

export async function readCoursePhoto(deps: CoursePhotoDeps, file: { data: string; mediaType: FileType }, year: number): Promise<CoursePhotoResult> {
  const month = await deps.useMonth()
  const noMonth = blocked(month.usage)
  if (noMonth) return noMonth
  const day = await deps.useDay()
  if (!day.usage.ok) {
    await month.refund()
    return day.usage.reason === 'limit' ? { ok: false, reason: 'limit', scope: 'day', resetsAt: day.usage.resetsAt } : { ok: false, reason: 'no_access' }
  }
  try {
    const what = file.mediaType === 'application/pdf' ? 'do PDF' : 'da foto'
    const raw = await deps.askJson({ system: COURSE_SYSTEM, prompt: `Ano atual: ${year}. Leia o cronograma ${what}.`, schema: COURSE_SCHEMA, effort: 'low', maxTokens: 1000, image: file })
    const course = cleanCourse(raw)
    if (!course) {
      await month.refund()
      return { ok: false, reason: 'not_found' }
    }
    return { ok: true, course }
  } catch (e) {
    console.error('course-photo', e)
    await month.refund()
    await day.refund()
    return { ok: false, reason: 'failed' }
  }
}
