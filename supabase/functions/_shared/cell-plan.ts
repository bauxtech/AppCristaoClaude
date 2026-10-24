// Roteiro da célula com IA (plano Líder, 24/10): rascunho por tema e leitura do PDF ou da foto do roteiro.
// O líder revisa tudo antes de salvar. Os versículos vêm do texto bíblico do app, nunca da IA.
// Nada fica guardado no servidor. Limites: roteiros por mês (só conta o que deu certo) e tentativas por dia.

import { expandRefs, PLAN_SCHEMA, searchTerms, type Verse } from './chat.ts'
import type { AskJson, FileType } from './claude-types.ts'
import type { Usage } from './usage.ts'

type Used = { usage: Usage; refund: () => Promise<void> }

export interface CellPlanDeps {
  /** Conta um roteiro no mês. Devolvido se não der certo. */
  useMonth: () => Promise<Used>
  /** Conta uma tentativa no dia. Só devolvida se o servidor falhar. */
  useDay: () => Promise<Used>
  askJson: AskJson
}

export interface DraftDeps extends CellPlanDeps {
  searchVerses(query: string): Promise<Verse[]>
  versesByKeys(keys: string[]): Promise<Verse[]>
}

type Fail =
  | { ok: false; reason: 'no_access' | 'failed' }
  /** month: os roteiros do mês acabaram. day: as tentativas do dia acabaram. */
  | { ok: false; reason: 'limit'; scope: 'month' | 'day'; resetsAt: string | null }

export interface PlanDraft {
  title: string
  /** Chaves dos versículos usados (ex.: joao:15:1), todas do texto do app. */
  verseKeys: string[]
  icebreaker: string
  word: string
  questions: string[]
  prayer: string
}

export type DraftResult = { ok: true; draft: PlanDraft } | { ok: false; reason: 'off_topic' } | Fail

export interface ImportedSection {
  title: string
  content: string
  minutes: number
}
export interface ImportedPlan {
  title: string
  ref: string
  sections: ImportedSection[]
}

export type ImportResult = { ok: true; plans: ImportedPlan[] } | { ok: false; reason: 'not_found' } | Fail

const MAX_VERSES = 20
const MAX_PLANS = 6
const MAX_SECTIONS = 12
// Os mesmos tamanhos dos campos do app (src/features/cell/screens/PlanScreens.tsx).
const TITLE = 80
const REF = 60
const SECTION_TITLE = 40
const CONTENT = 1000

const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n).trim() : '')

async function take(deps: CellPlanDeps): Promise<{ fail: Fail | null; month?: Used; day?: Used }> {
  const month = await deps.useMonth()
  if (!month.usage.ok) return { fail: month.usage.reason === 'limit' ? { ok: false, reason: 'limit', scope: 'month', resetsAt: month.usage.resetsAt } : { ok: false, reason: 'no_access' } }
  const day = await deps.useDay()
  if (!day.usage.ok) {
    await month.refund()
    return { fail: day.usage.reason === 'limit' ? { ok: false, reason: 'limit', scope: 'day', resetsAt: day.usage.resetsAt } : { ok: false, reason: 'no_access' } }
  }
  return { fail: null, month, day }
}

// ─── Rascunho por tema ─────────────────────────────────────────────────────────

export const FIND_SYSTEM = `Você ajuda o líder de uma célula (pequeno grupo de uma igreja cristã) a montar o roteiro da reunião.
Decida se o tema é sobre Bíblia, fé cristã ou vida cristã (oração, família, sofrimento, perdão, igreja). Assuntos como política partidária, receitas, esporte, finanças ou programação não são.
Sugira palavras de busca e as passagens bíblicas que melhor servem ao tema. Se o líder informou um texto base, use essa passagem.
Você não escreve o texto dos versículos: o app busca o texto na própria Bíblia dele.`

export const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Título curto do roteiro, até 60 letras' },
    cited: { type: 'array', items: { type: 'string' }, description: 'Chaves dos versículos usados, só da lista fornecida, em ordem' },
    icebreaker: { type: 'string', description: 'Quebra-gelo: uma pergunta ou dinâmica simples ligada ao tema, para todos responderem' },
    word: { type: 'string', description: 'Palavra: explicação da passagem para o líder conduzir, em até 3 parágrafos curtos' },
    questions: { type: 'array', items: { type: 'string' }, description: 'De 3 a 5 perguntas para reflexão em grupo' },
    prayer: { type: 'string', description: 'Oração: como conduzir o momento de oração, ligado ao tema, em 1 ou 2 frases' },
  },
  required: ['title', 'cited', 'icebreaker', 'word', 'questions', 'prayer'],
  additionalProperties: false,
} as const

export const DRAFT_SYSTEM = `Você escreve o rascunho do roteiro de uma reunião de célula (pequeno grupo de uma igreja cristã). O líder revisa antes de usar.
Use somente os versículos fornecidos na mensagem, identificados pela chave. Não cite nem parafraseie como citação nenhum outro texto bíblico.
Cada ideia que você liga a uma referência precisa estar no texto daquele versículo.
No texto, mencione a referência por extenso (ex.: João 15.5), sem copiar o versículo: o app mostra o texto.
Fique no que as igrejas cristãs têm em comum. Em temas de doutrina ou prática em que as igrejas ensinam diferente (como batismo ou ceia), não tome partido e sugira seguir a orientação da igreja.
Escreva em português do Brasil, em tom simples e direto, para ser lido em voz alta num grupo. Sem emoji, sem listas com marcadores.`

export interface DraftInput {
  theme: string
  /** Texto base informado pelo líder, como ele escreveu (ex.: João 15:1-17). */
  ref?: string | null
  /** De onde veio o tema (ex.: o resumo do culto gravado). */
  context?: string | null
}

export function cleanDraft(raw: unknown, found: Map<string, Verse>): PlanDraft | null {
  const r = (raw ?? {}) as Record<string, unknown>
  const word = cut(r.word, CONTENT)
  if (!word) return null
  const cited = Array.isArray(r.cited) ? r.cited.filter((k): k is string => typeof k === 'string' && found.has(k)) : []
  const questions = Array.isArray(r.questions)
    ? r.questions
        .map((q) => cut(q, 200))
        .filter(Boolean)
        .slice(0, 5)
    : []
  return {
    title: cut(r.title, TITLE),
    verseKeys: [...new Set(cited)].slice(0, MAX_VERSES),
    icebreaker: cut(r.icebreaker, CONTENT),
    word,
    questions,
    prayer: cut(r.prayer, CONTENT),
  }
}

export async function draftCellPlan(deps: DraftDeps, input: DraftInput): Promise<DraftResult> {
  const theme = input.theme.trim().slice(0, 120)
  const ref = (input.ref ?? '').trim().slice(0, REF)
  const context = (input.context ?? '').trim().slice(0, 600)
  const taken = await take(deps)
  if (taken.fail) return taken.fail
  const { month, day } = taken as { month: Used; day: Used }
  try {
    const ask = `Tema da reunião: ${theme || '(não informado)'}${ref ? `\nTexto base: ${ref}` : ''}${context ? `\nContexto: ${context}` : ''}`
    const plan = (await deps.askJson({ system: FIND_SYSTEM, prompt: ask, schema: PLAN_SCHEMA, effort: 'low', maxTokens: 800 })) as { on_topic: boolean; terms: string[]; refs: string[] }
    if (!plan.on_topic) {
      await month.refund()
      return { ok: false, reason: 'off_topic' }
    }
    const found = new Map<string, Verse>()
    for (const v of await deps.versesByKeys(expandRefs((plan.refs ?? []).slice(0, 6)).slice(0, MAX_VERSES))) found.set(v.key, v)
    const terms = searchTerms(theme, plan.terms ?? [])
    if (terms && found.size < 8) for (const v of await deps.searchVerses(terms)) if (found.size < MAX_VERSES) found.set(v.key, v)
    if (!found.size) {
      await month.refund()
      return { ok: false, reason: 'failed' }
    }
    const list = [...found.values()].map((v) => `[${v.key}] ${v.text}`).join('\n')
    const raw = await deps.askJson({ system: DRAFT_SYSTEM, prompt: `${ask}\n\nVersículos disponíveis (texto do app):\n${list}`, schema: DRAFT_SCHEMA, effort: 'low', maxTokens: 2500 })
    const draft = cleanDraft(raw, found)
    if (!draft) {
      await month.refund()
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, draft }
  } catch (e) {
    console.error('cell-plan draft', e)
    await month.refund()
    await day.refund()
    return { ok: false, reason: 'failed' }
  }
}

// ─── Leitura do PDF ou da foto ─────────────────────────────────────────────────

export const IMPORT_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean', description: 'false se o arquivo não mostra o roteiro de uma reunião de célula ou pequeno grupo' },
    plans: {
      type: 'array',
      description: 'Um item por roteiro (um arquivo pode trazer as reuniões de várias semanas)',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título ou tema do roteiro, como está escrito' },
          ref: { type: 'string', description: 'Texto bíblico base, como está escrito. Vazio se não aparecer' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Nome da parte (ex.: Quebra-gelo, Louvor, Palavra, Perguntas, Oração, Avisos)' },
                content: { type: 'string', description: 'O texto da parte, copiado do arquivo' },
                minutes: { type: 'integer', description: 'Duração em minutos, se aparecer. 0 se não aparecer' },
              },
              required: ['title', 'content', 'minutes'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'ref', 'sections'],
        additionalProperties: false,
      },
    },
  },
  required: ['found', 'plans'],
  additionalProperties: false,
} as const

export const IMPORT_SYSTEM = `Você lê o PDF ou a foto do roteiro de uma reunião de célula (pequeno grupo de uma igreja) e devolve o roteiro em JSON.
Copie o texto que está no arquivo, sem inventar nem completar. Pode corrigir quebras de linha e juntar o que foi cortado entre páginas.
Separe o roteiro nas partes em que ele já está dividido, com os nomes que o arquivo usa. Se não houver divisão, use uma parte só, chamada Palavra.
Se o arquivo traz as reuniões de várias semanas, devolva um roteiro para cada uma.`

/** Minutos de 5 em 5, entre 5 e 90, como no editor do app. Sem duração: 10. */
const minutesOf = (m: unknown) => (typeof m === 'number' && m > 0 ? Math.min(90, Math.max(5, Math.round(m / 5) * 5)) : 10)

export function cleanImport(raw: unknown): ImportedPlan[] {
  const r = (raw ?? {}) as Record<string, unknown>
  if (r.found === false || !Array.isArray(r.plans)) return []
  const out: ImportedPlan[] = []
  for (const p of r.plans.slice(0, MAX_PLANS) as Record<string, unknown>[]) {
    const sections = (Array.isArray(p?.sections) ? (p.sections as Record<string, unknown>[]) : [])
      .map((s) => ({ title: cut(s?.title, SECTION_TITLE) || 'Seção', content: cut(s?.content, CONTENT), minutes: minutesOf(s?.minutes) }))
      .filter((s) => s.content)
      .slice(0, MAX_SECTIONS)
    if (sections.length) out.push({ title: cut(p.title, TITLE), ref: cut(p.ref, REF), sections })
  }
  return out
}

export async function importCellPlan(deps: CellPlanDeps, file: { data: string; mediaType: FileType }): Promise<ImportResult> {
  const taken = await take(deps)
  if (taken.fail) return taken.fail
  const { month, day } = taken as { month: Used; day: Used }
  try {
    const what = file.mediaType === 'application/pdf' ? 'do PDF' : 'da foto'
    const raw = await deps.askJson({ system: IMPORT_SYSTEM, prompt: `Leia o roteiro ${what}.`, schema: IMPORT_SCHEMA, effort: 'low', maxTokens: 8000, image: file })
    const plans = cleanImport(raw)
    if (!plans.length) {
      await month.refund()
      return { ok: false, reason: 'not_found' }
    }
    return { ok: true, plans }
  } catch (e) {
    console.error('cell-plan import', e)
    await month.refund()
    await day.refund()
    return { ok: false, reason: 'failed' }
  }
}
