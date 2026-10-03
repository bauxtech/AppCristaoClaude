// Culto: transcrição (OpenAI) e resumo (Claude). Regras: 5 cultos por mês; o áudio só fica
// quando a pessoa escolhe, por 30 dias; o versículo mostrado vem sempre do texto do app.

import type { AskJson } from './claude-types.ts'
import type { Verse } from './chat.ts'

export const MONTHLY_LIMIT = 5
export const AUDIO_DAYS = 30
/** Limite da API de transcrição por arquivo. Áudio maior precisa ser dividido no app. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024

export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Título curto da pregação' },
    summary: { type: 'string', description: 'Resumo em 2 ou 3 parágrafos curtos' },
    points: { type: 'array', items: { type: 'string' }, description: 'Pontos principais, de 3 a 6' },
    refs: { type: 'array', items: { type: 'string' }, description: 'Referências bíblicas citadas na pregação, no formato livro:capitulo:versiculo, livro em minúsculas, sem acento, com hífen (ex.: joao:3:16, 1-corintios:13:4)' },
    application: { type: 'string', description: 'Uma frase de aplicação prática' },
  },
  required: ['title', 'summary', 'points', 'refs', 'application'],
  additionalProperties: false,
} as const

export const SUMMARY_SYSTEM = `Você resume pregações para um app pessoal de cristãos. A pessoa gravou o culto e quer lembrar o que foi pregado.
Resuma com fidelidade ao que o pregador disse, sem acrescentar ideias suas e sem julgar a pregação.
Liste só as referências bíblicas que aparecem na fala. Você não escreve o texto dos versículos: o app busca na própria Bíblia.
Escreva em português do Brasil, direto, sem emoji.`

export interface SermonSummary {
  title: string
  summary: string
  points: string[]
  application: string
  verses: Verse[]
}

export interface SermonDeps {
  hasAccess(): Promise<boolean>
  /** Conta o culto do mês. Devolve quantos restam, ou -1 quando acabou. */
  consume(): Promise<number>
  refund(): Promise<void>
  transcribe(): Promise<string>
  versesByKeys(keys: string[]): Promise<Verse[]>
  askJson: AskJson
}

export type SermonResult =
  | { kind: 'no_access' }
  | { kind: 'limit'; limit: number }
  | { kind: 'empty' }
  | { kind: 'ready'; transcript: string; summary: SermonSummary; remaining: number }

export async function processSermon(deps: SermonDeps): Promise<SermonResult> {
  if (!(await deps.hasAccess())) return { kind: 'no_access' }
  const remaining = await deps.consume()
  if (remaining < 0) return { kind: 'limit', limit: MONTHLY_LIMIT }
  try {
    const transcript = (await deps.transcribe()).trim()
    if (transcript.length < 40) {
      await deps.refund()
      return { kind: 'empty' }
    }
    const out = (await deps.askJson({ system: SUMMARY_SYSTEM, prompt: `Transcrição do culto:\n\n${transcript}`, schema: SUMMARY_SCHEMA, effort: 'medium', maxTokens: 8000 })) as {
      title: string
      summary: string
      points: string[]
      refs: string[]
      application: string
    }
    // Só fica o que existe no texto do app. O texto do versículo vem do banco.
    const verses = await deps.versesByKeys([...new Set(out.refs ?? [])].slice(0, 20))
    return { kind: 'ready', transcript, remaining, summary: { title: out.title.trim(), summary: out.summary.trim(), points: (out.points ?? []).slice(0, 6), application: out.application.trim(), verses } }
  } catch (e) {
    await deps.refund()
    throw e
  }
}

/** Data em que o áudio guardado é apagado. */
export function audioExpiry(from = new Date()) {
  return new Date(from.getTime() + AUDIO_DAYS * 86400_000).toISOString()
}
