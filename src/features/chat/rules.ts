// Regras do chat que valem antes de qualquer resposta:
// - Se a pessoa falar em se machucar, mostra o CVV, telefone 188.
// - Só fala de Bíblia e fé cristã.
// - 20 perguntas por dia.
// No servidor, as mesmas regras se repetem. Aqui elas protegem a pessoa mesmo sem internet.

export const DAILY_LIMIT = 20

const CRISIS = [
  'me machucar', 'me ferir', 'me cortar', 'suicid', 'me matar', 'tirar minha vida', 'tirar a minha vida', 'acabar com tudo', 'nao quero mais viver', 'quero morrer', 'sumir de vez', 'nao aguento mais viver',
]

const OFF_TOPIC = ['receita', 'futebol', 'eleicao', 'eleição', 'partido', 'presidente', 'codigo', 'código', 'programar', 'bolsa de valores', 'investimento', 'aposta', 'horoscopo', 'horóscopo', 'signo']

const FAITH = [
  'biblia', 'versiculo', 'salmo', 'evangelho', 'deus', 'jesus', 'cristo', 'espirito', 'oracao', 'orar', 'fe', 'perdao', 'graca', 'pecado', 'igreja', 'pastor', 'parabola', 'apostolo', 'profeta', 'genesis', 'joao', 'mateus', 'marcos', 'lucas', 'romanos', 'filipenses', 'proverbios', 'ceu', 'salvacao', 'batismo', 'ansiedade', 'medo', 'culto', 'pregacao', 'amor', 'esperanca', 'louvor', 'jejum', 'davi', 'moises', 'abraao', 'paulo', 'pedro', 'senhor', 'pai nosso', 'cruz', 'ressurreicao', 'celula',
]

/** Temas em que igrejas cristãs pensam diferente. A resposta avisa. */
const DIVIDED = ['batismo', 'dizimo', 'dons', 'linguas', 'predestinacao', 'santa ceia', 'ceia', 'arrebatamento', 'divorcio']

export function plain(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function isCrisis(text: string) {
  const t = plain(text)
  return CRISIS.some((k) => t.includes(plain(k)))
}

export function isOffTopic(text: string) {
  const t = plain(text)
  const words = t.split(/[^a-z0-9]+/)
  const faith = FAITH.some((k) => (k.includes(' ') ? t.includes(k) : words.includes(k)))
  if (faith) return false
  return OFF_TOPIC.some((k) => t.includes(plain(k)))
}

export function isDivided(text: string) {
  const t = plain(text)
  return DIVIDED.some((k) => t.includes(k))
}
