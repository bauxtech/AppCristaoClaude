// Lógica do chat bíblico, separada do servidor para ser testada.
// Regras (CLAUDE.md): só fala de Bíblia e fé cristã, cita só o texto bíblico do app e mostra a fonte.
// Se a pessoa falar em se machucar, mostra o CVV, telefone 188.

import { DAILY_LIMIT, isCrisis, isDivided, isOffTopic, plain } from './rules.ts'
import type { AskJson } from './claude-types.ts'

export interface Verse {
  key: string
  text: string
}

export interface ChatDeps {
  hasAccess(): Promise<boolean>
  /** Conta uma pergunta. Devolve quantas restam, ou -1 quando o limite do dia acabou. */
  consume(): Promise<number>
  refund(): Promise<void>
  searchVerses(query: string): Promise<Verse[]>
  versesByKeys(keys: string[]): Promise<Verse[]>
  askJson: AskJson
}

export interface ChatInput {
  question: string
  tradition?: string | null
  /** Passagem aberta ou culto de onde veio a pergunta. */
  context?: string | null
  /** Últimas mensagens da conversa, da mais antiga para a mais nova. */
  history?: { role: 'user' | 'assistant'; text: string }[]
}

export type ChatResult =
  | { kind: 'crisis'; phone: '188' }
  | { kind: 'no_access' }
  | { kind: 'limit'; limit: number }
  | { kind: 'off_topic' }
  | { kind: 'answer'; text: string; verses: Verse[]; divided: boolean; remaining: number }

const MAX_QUESTION = 500
const MAX_VERSES = 25

const STOP = new Set(['para', 'como', 'sobre', 'quando', 'onde', 'porque', 'qual', 'quais', 'biblia', 'diz', 'fala', 'isso', 'esse', 'essa', 'este', 'esta', 'tenho', 'estou', 'minha', 'meu', 'muito', 'mais', 'pode', 'posso', 'fazer', 'deus'])

/** "lucas:15:11-32" vira as chaves de cada versículo. Intervalo longo é cortado em 30. */
export function expandRefs(refs: string[]): string[] {
  const out: string[] = []
  for (const r of refs) {
    const m = /^([a-z0-9-]+):(\d+):(\d+)(?:-(\d+))?$/.exec(r.trim())
    if (!m) continue
    const [, book, chapter, from, to] = m
    const end = Math.min(Number(to ?? from), Number(from) + 29)
    for (let v = Number(from); v <= end; v++) out.push(`${book}:${chapter}:${v}`)
  }
  return [...new Set(out)]
}

/** Palavras da pergunta para a busca no texto bíblico, ligadas por "ou". */
export function searchTerms(text: string, extra: string[] = []) {
  const words = plain(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
  const all = [...new Set([...words, ...extra.map(plain)])].filter(Boolean).slice(0, 12)
  return all.join(' or ')
}

export const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    on_topic: { type: 'boolean', description: 'A pergunta é sobre Bíblia, fé cristã ou vida cristã' },
    terms: { type: 'array', items: { type: 'string' }, description: 'Palavras em português para buscar versículos, incluindo sinônimos' },
    refs: { type: 'array', items: { type: 'string' }, description: 'Referências prováveis no formato livro:capitulo:versiculo, com o livro em minúsculas, sem acento e com hífen (ex.: filipenses:4:6, 1-pedro:5:7). Para uma passagem inteira, como uma parábola, use o intervalo (ex.: lucas:15:11-32)' },
  },
  required: ['on_topic', 'terms', 'refs'],
  additionalProperties: false,
} as const

export const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Resposta em português, curta e clara' },
    cited: { type: 'array', items: { type: 'string' }, description: 'Chaves dos versículos usados, só da lista fornecida' },
    divided: { type: 'boolean', description: 'Igrejas cristãs pensam diferente sobre o tema' },
  },
  required: ['answer', 'cited', 'divided'],
  additionalProperties: false,
} as const

export const PLAN_SYSTEM = `Você ajuda um app cristão a encontrar versículos para responder perguntas.
Decida se a pergunta é sobre Bíblia, fé cristã ou vida cristã (oração, família, sofrimento, perdão, igreja). Assuntos como política partidária, receitas, esporte, finanças ou programação não são.
Sugira palavras de busca e referências bíblicas prováveis. Você não escreve o texto dos versículos: o app busca o texto na própria Bíblia dele.`

export function answerSystem(tradition?: string | null) {
  const trad = tradition && tradition !== 'Prefiro não dizer' && tradition !== 'Outra' ? `\nA pessoa se identifica como ${tradition}. Leve isso em conta ao falar de práticas da igreja, sem dizer que outras tradições estão erradas.` : ''
  return `Você responde perguntas sobre a Bíblia e a fé cristã dentro de um app pessoal para cristãos.
Use somente os versículos fornecidos na mensagem, identificados pela chave. Não cite nem parafraseie como citação nenhum outro texto bíblico.
Cada ideia que você liga a uma referência precisa estar no texto daquele versículo. Não junte a frase de um versículo com a referência de outro.
Só quando o assunto principal da pergunta não aparece nos versículos (por exemplo, uma situação de hoje que a Bíblia não menciona), diga uma vez, numa frase simples, que a Bíblia não trata disso diretamente, e responda o que os versículos sustentam. Quando os versículos tratam do assunto, não use essa frase.
Não fale da lista de versículos, do texto fornecido nem do app.
Quando citar, use a chave em "cited"; o app mostra o texto e a fonte. No texto da resposta, mencione a referência por extenso (ex.: Filipenses 4.6), sem copiar o versículo.
Quando igrejas cristãs ensinam coisas diferentes sobre o tema (doutrina ou prática, como batismo ou ceia), diga isso em uma frase, marque "divided" e sugira conversar com o pastor. Diferença só de ênfase não conta.
Escreva em português do Brasil, em tom direto e acolhedor, em até 3 parágrafos curtos. Sem emoji.${trad}`
}

export async function answerChat(deps: ChatDeps, input: ChatInput): Promise<ChatResult> {
  const question = input.question.trim().slice(0, MAX_QUESTION)
  // A segurança da pessoa vem antes de tudo, inclusive antes do limite e da assinatura.
  if (isCrisis(question)) return { kind: 'crisis', phone: '188' }
  if (!(await deps.hasAccess())) return { kind: 'no_access' }
  if (isOffTopic(question)) return { kind: 'off_topic' }

  const remaining = await deps.consume()
  if (remaining < 0) return { kind: 'limit', limit: DAILY_LIMIT }

  try {
    const plan = (await deps.askJson({ system: PLAN_SYSTEM, prompt: `${input.context ? `Contexto: ${input.context}\n` : ''}Pergunta: ${question}`, schema: PLAN_SCHEMA, effort: 'low' })) as {
      on_topic: boolean
      terms: string[]
      refs: string[]
    }
    if (!plan.on_topic) {
      await deps.refund()
      return { kind: 'off_topic' }
    }

    const found = new Map<string, Verse>()
    for (const v of await deps.versesByKeys(expandRefs((plan.refs ?? []).slice(0, 10)).slice(0, MAX_VERSES))) found.set(v.key, v)
    const terms = searchTerms(question, plan.terms ?? [])
    if (terms) for (const v of await deps.searchVerses(terms)) if (found.size < MAX_VERSES) found.set(v.key, v)
    const verses = [...found.values()].slice(0, MAX_VERSES)

    const list = verses.length ? verses.map((v) => `[${v.key}] ${v.text}`).join('\n') : '(nenhum versículo encontrado no texto do app)'
    const history = (input.history ?? []).slice(-6).map((m) => `${m.role === 'user' ? 'Pessoa' : 'Você'}: ${m.text}`).join('\n')
    const prompt = `${input.context ? `Contexto: ${input.context}\n\n` : ''}${history ? `Conversa até aqui:\n${history}\n\n` : ''}Versículos disponíveis (texto do app):\n${list}\n\nPergunta: ${question}`

    const out = (await deps.askJson({ system: answerSystem(input.tradition), prompt, schema: ANSWER_SCHEMA, effort: 'medium' })) as { answer: string; cited: string[]; divided: boolean }
    // A IA só pode citar o que o app forneceu. O texto mostrado vem do banco, nunca da IA.
    const cited = (out.cited ?? []).map((k) => found.get(k)).filter((v): v is Verse => !!v)
    return { kind: 'answer', text: out.answer.trim(), verses: cited, divided: !!out.divided || isDivided(question), remaining }
  } catch (e) {
    await deps.refund()
    throw e
  }
}
