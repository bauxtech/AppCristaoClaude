import { callFunction } from '../../lib/supabase'
import { bookBySlug } from '../bible/books'
import type { PlanSection } from './data'

// Roteiro da célula com IA (plano Líder, 24/10): rascunho por tema e leitura do PDF ou da foto do roteiro.
// O servidor (supabase/functions/cell-plan) confere o plano e os limites. O líder revisa antes de salvar.

export interface PlanDraft {
  title: string
  verseKeys: string[]
  icebreaker: string
  word: string
  questions: string[]
  prayer: string
}

export interface ImportedPlan {
  title: string
  ref: string
  sections: { title: string; content: string; minutes: number }[]
}

export type PlanAiFail = 'no_access' | 'limit_month' | 'limit_day' | 'off_topic' | 'not_found' | 'too_big' | 'too_many_pages' | 'failed'
type Fail = { ok: false; reason: PlanAiFail; resetsAt?: string | null }
export type DraftResult = { ok: true; draft: PlanDraft } | Fail
export type ImportResult = { ok: true; plans: ImportedPlan[] } | Fail

type Raw = { ok?: boolean; draft?: PlanDraft; plans?: ImportedPlan[]; reason?: string; scope?: string; resetsAt?: string | null } | null

const PLAIN = ['no_access', 'off_topic', 'not_found', 'too_big', 'too_many_pages', 'failed'] as const

function fail(r: Raw): Fail {
  if (r?.reason === 'limit') return { ok: false, reason: r.scope === 'day' ? 'limit_day' : 'limit_month', resetsAt: r.resetsAt ?? null }
  if (r && PLAIN.includes(r.reason as (typeof PLAIN)[number])) return { ok: false, reason: r.reason as PlanAiFail }
  return { ok: false, reason: 'failed' }
}

export async function draftPlanRemote(input: { theme: string; ref: string; context?: string }): Promise<DraftResult> {
  try {
    const r = await callFunction<Raw>('cell-plan', { mode: 'draft', ...input })
    return r?.ok && r.draft ? { ok: true, draft: r.draft } : fail(r)
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

export async function importPlanRemote(base64: string, mimeType: string): Promise<ImportResult> {
  try {
    const mediaType = ['image/png', 'image/webp', 'application/pdf'].includes(mimeType) ? mimeType : 'image/jpeg'
    const r = await callFunction<Raw>('cell-plan', { mode: 'import', image: base64, mediaType })
    return r?.ok && r.plans?.length ? { ok: true, plans: r.plans } : fail(r)
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

/** ["joao:15:1", "joao:15:2", "joao:15:5"] vira "João 15:1-2, 5". Até 60 letras, o tamanho do campo. */
export function refLabel(keys: string[]): string {
  const groups: { book: string; chapter: number; verses: number[] }[] = []
  for (const k of keys) {
    const [slug, c, v] = k.split(':')
    const book = bookBySlug(slug)?.name
    if (!book || !Number(c) || !Number(v)) continue
    let g = groups.find((x) => x.book === book && x.chapter === Number(c))
    if (!g) groups.push((g = { book, chapter: Number(c), verses: [] }))
    if (!g.verses.includes(Number(v))) g.verses.push(Number(v))
  }
  const parts = groups.map((g) => {
    const vs = [...g.verses].sort((a, b) => a - b)
    const runs: string[] = []
    for (let i = 0; i < vs.length; i++) {
      let j = i
      while (vs[j + 1] === vs[j] + 1) j++
      runs.push(j > i ? `${vs[i]}-${vs[j]}` : `${vs[i]}`)
      i = j
    }
    return `${g.book} ${g.chapter}:${runs.join(', ')}`
  })
  let out = ''
  for (const p of parts) {
    const next = out ? `${out}; ${p}` : p
    if (next.length > 60) break
    out = next
  }
  return out
}

const CONTENT = 1000
const DEFAULT_PRAYER = 'Pedidos do grupo.'
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

type Part = 'icebreaker' | 'word' | 'questions' | 'prayer'
function partOf(title: string): Part | null {
  const t = norm(title)
  if (t.startsWith('quebra')) return 'icebreaker'
  if (t.startsWith('palavra') || t.startsWith('estudo') || t.startsWith('mensagem')) return 'word'
  if (t.startsWith('pergunta')) return 'questions'
  if (t.startsWith('oracao')) return 'prayer'
  return null
}

const questionsText = (d: PlanDraft) => d.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')

/**
 * Junta o rascunho ao roteiro sem apagar o que o líder escreveu: só preenche as seções vazias.
 * A Palavra que só tem a linha do tema ou do texto base recebe a explicação embaixo.
 * Sem seções, monta a reunião inteira.
 */
export function mergeDraft(sections: PlanSection[], draft: PlanDraft, ref: string, newId: () => string): { sections: PlanSection[]; filled: number } {
  const word = (ref ? `Leitura: ${ref}\n\n${draft.word}` : draft.word).slice(0, CONTENT)
  if (!sections.length) {
    const s = (title: string, content: string, minutes: number): PlanSection => ({ id: newId(), title, content, minutes })
    return {
      filled: 4,
      sections: [
        s('Quebra-gelo', draft.icebreaker, 10),
        s('Louvor', '', 15),
        s('Palavra', word, 20),
        s('Perguntas para reflexão', questionsText(draft), 10),
        s('Oração', `${draft.prayer}\n${DEFAULT_PRAYER}`.trim().slice(0, CONTENT), 10),
        s('Avisos', '', 5),
      ],
    }
  }
  let filled = 0
  const next = sections.map((s) => {
    const part = partOf(s.title)
    const content = s.content.trim()
    let add = ''
    if (part === 'icebreaker' && !content) add = draft.icebreaker
    else if (part === 'questions' && !content) add = questionsText(draft)
    else if (part === 'prayer' && (!content || content === DEFAULT_PRAYER)) add = `${draft.prayer}${content ? `\n${content}` : ''}`
    else if (part === 'word' && content.length < 200) add = content ? `${content}\n\n${draft.word}` : word
    if (!add.trim()) return s
    filled++
    return { ...s, content: add.slice(0, CONTENT) }
  })
  return { sections: next, filled }
}

/** Na prévia, sem servidor: um rascunho de exemplo, para ver como fica. */
export const SAMPLE_DRAFT: PlanDraft = {
  title: 'Permanecer em Cristo',
  verseKeys: ['joao:15:4', 'joao:15:5'],
  icebreaker: 'Conte de alguma coisa que você cultivou e viu crescer: uma planta, um projeto, uma amizade.',
  word: 'Em João 15.5, Jesus usa a imagem da videira e dos ramos. O ramo não dá fruto por esforço próprio: ele dá fruto porque está ligado à videira. Permanecer é manter essa ligação no dia a dia, na oração, na Palavra e na vida em comunidade.',
  questions: ['O que tem ajudado você a permanecer ligado a Jesus?', 'O que costuma afastar você dessa ligação?', 'Que fruto você gostaria de ver na sua vida neste mês?'],
  prayer: 'Orem em duplas, pedindo a Deus constância na vida com Ele.',
}
