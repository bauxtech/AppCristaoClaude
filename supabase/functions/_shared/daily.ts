// Conteúdo diário escrito pela IA. O versículo vem sempre do texto bíblico do app, nunca da IA.
// EM ABERTO (CLAUDE.md): quem revisa antes de publicar. Até decidir, nasce como rascunho (published = false).

import type { AskJson } from './claude-types.ts'
import type { Verse } from './chat.ts'

/**
 * Passagens para o versículo do dia. É só a lista de referências: o texto vem do banco.
 * A equipe pode trocar esta lista.
 */
export const DAILY_REFS = [
  'salmos:23:1', 'joao:3:16', 'filipenses:4:6', 'filipenses:4:13', 'isaias:41:10', 'romanos:8:28', 'mateus:11:28',
  'proverbios:3:5', 'salmos:46:1', 'jeremias:29:11', 'mateus:6:33', 'josue:1:9', '1-corintios:13:4', 'efesios:4:32',
  'lamentacoes:3:22', 'salmos:121:1', 'joao:14:27', 'romanos:12:2', 'galatas:5:22', 'hebreus:11:1', '2-timoteo:1:7',
  'salmos:37:5', 'mateus:5:9', 'tiago:1:5', '1-pedro:5:7', 'salmos:119:105', 'joao:15:5', 'colossenses:3:23',
  'miqueias:6:8', 'salmos:139:14',
]

/** Mesmo versículo para todo mundo no mesmo dia, girando pela lista. */
export function refForDay(day: string, refs = DAILY_REFS) {
  const d = new Date(`${day}T12:00:00Z`)
  const n = Math.floor(d.getTime() / 86400_000)
  return refs[((n % refs.length) + refs.length) % refs.length]
}

export const DAILY_SCHEMA = {
  type: 'object',
  properties: {
    reflection: { type: 'string', description: 'Reflexão de 2 ou 3 parágrafos curtos sobre o versículo' },
    prayer: { type: 'string', description: 'Oração curta, em primeira pessoa, de 3 a 5 frases' },
  },
  required: ['reflection', 'prayer'],
  additionalProperties: false,
} as const

export const DAILY_SYSTEM = `Você escreve o conteúdo do dia de um app pessoal para cristãos de várias igrejas evangélicas e católicos.
Escreva uma reflexão e uma oração a partir do versículo fornecido. Não cite outros versículos nem escreva texto bíblico além do fornecido.
Evite temas em que as igrejas pensam diferente. Português do Brasil, linguagem simples, tom acolhedor e sem exagero, sem emoji.`

export async function writeDaily(deps: { verse: (key: string) => Promise<Verse | null>; askJson: AskJson }, day: string) {
  const key = refForDay(day)
  const verse = await deps.verse(key)
  if (!verse) throw new Error(`Versículo ${key} não está no texto do app`)
  const out = (await deps.askJson({ system: DAILY_SYSTEM, prompt: `Versículo (${verse.key}): ${verse.text}`, schema: DAILY_SCHEMA, effort: 'medium' })) as { reflection: string; prayer: string }
  return { day, verse_key: verse.key, reflection: out.reflection.trim(), prayer: out.prayer.trim() }
}
