// Cultos gravados pela pessoa. Uso pessoal.
// Regras decididas: 5 cultos por mês no plano. O padrão é guardar só o texto; quem escolhe guardar o áudio fica com ele 30 dias.

export interface VerseRef {
  book: string
  chapter: number
  verse?: number
}

export interface Sermon {
  id: string
  createdAt: string
  date: string
  church: string
  preacher: string
  theme: string
  durationSec: number
  trim: { start: number; end: number }
  source: 'gravado' | 'importado'
  status: 'processing' | 'ready' | 'failed'
  keepAudio: boolean
  audioUri?: string
  audioExpiresAt?: string
  transcript: string
  summary: string
  points: string[]
  questions: string[]
  verses: VerseRef[]
  notes: { ts: number; text: string }[]
  moments: { ts: number; label: string }[]
  /** O resultado é o de exemplo da prévia, não veio do servidor. */
  sample?: boolean
  /** Frase de aplicação prática, do resumo do servidor. */
  application?: string
  /** Por que o processamento falhou, quando o servidor diz. */
  failReason?: 'too_big' | 'no_audio' | 'limit' | 'no_access' | 'empty' | 'no_login' | 'error'
  /** Culto que está no banco (com servidor). */
  remote?: boolean
}

export const MONTHLY_LIMIT = 5
export const AUDIO_DAYS = 30

export function verseLabel(v: VerseRef) {
  return `${v.book} ${v.chapter}${v.verse ? `:${v.verse}` : ''}`
}

/** Resultado de exemplo do protótipo, usado enquanto a transcrição e o resumo não estão ligados ao servidor. */
export const SAMPLE_RESULT = {
  theme: 'Vivendo com propósito',
  preacher: 'Pr. Carlos Matos',
  transcript:
    'Bom dia a todos. Hoje quero falar sobre uma questão que cada um de nós enfrenta: como viver com propósito. Em João 3:16 lemos que Deus amou o mundo de tal maneira que nos deu o seu Filho. Em Romanos 8:28, Paulo nos lembra que todas as coisas cooperam para o bem daqueles que amam a Deus. E em Filipenses 4:13 somos encorajados: posso tudo naquele que me fortalece.',
  summary: 'A pregação fala sobre viver com propósito em Cristo, com relacionamentos que refletem o amor de Deus e a fé praticada no dia a dia.',
  points: ['Viver com propósito em Cristo', 'Relacionamentos que refletem o amor de Deus', 'A prática diária da fé no cotidiano'],
  questions: ['Como você tem buscado viver com propósito?', 'O que significa "permanecer em Cristo" no seu dia a dia?'],
  verses: [
    { book: 'João', chapter: 3, verse: 16 },
    { book: 'Romanos', chapter: 8, verse: 28 },
    { book: 'Filipenses', chapter: 4, verse: 13 },
  ],
}

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Três cultos de exemplo do protótipo. */
export function sampleSermons(now = new Date()): Sermon[] {
  const ago = (n: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n))
  const base = { church: 'Igreja Batista Central de São Paulo', source: 'gravado' as const, status: 'ready' as const, keepAudio: false, sample: true, notes: [], moments: [] }
  return [
    {
      ...base,
      id: 's1',
      createdAt: ago(0),
      date: ago(0),
      preacher: SAMPLE_RESULT.preacher,
      theme: SAMPLE_RESULT.theme,
      durationSec: 47 * 60,
      trim: { start: 0, end: 47 * 60 },
      transcript: SAMPLE_RESULT.transcript,
      summary: SAMPLE_RESULT.summary,
      points: SAMPLE_RESULT.points,
      questions: SAMPLE_RESULT.questions,
      verses: SAMPLE_RESULT.verses,
      notes: [
        { ts: 312, text: 'O propósito não é encontrado, é revelado por Deus.' },
        { ts: 1114, text: 'Relacionamentos saudáveis espelham o caráter de Cristo.' },
      ],
      moments: [
        { ts: 622, label: 'Momento marcado' },
        { ts: 1545, label: 'Momento marcado' },
      ],
    },
    { ...base, id: 's2', createdAt: ago(7), date: ago(7), preacher: '', theme: 'A oração que transforma', durationSec: 52 * 60, trim: { start: 0, end: 52 * 60 }, transcript: 'A oração muda o coração de quem ora.', summary: 'A oração muda o coração de quem ora.', points: [], questions: [], verses: [], },
    { ...base, id: 's3', createdAt: ago(11), date: ago(11), preacher: '', theme: 'Graça e perdão', durationSec: 38 * 60, trim: { start: 0, end: 38 * 60 }, transcript: 'O perdão não é fraqueza, é força.', summary: 'O perdão não é fraqueza, é força.', points: [], questions: [], verses: [], },
  ]
}

export function usedThisMonth(sermons: Sermon[], now = new Date()) {
  const prefix = iso(now).slice(0, 7)
  return sermons.filter((s) => s.createdAt.startsWith(prefix) && s.status !== 'failed').length
}

/** Busca por palavra no tema, no pregador e no texto. Devolve o trecho encontrado. */
export function searchSermons(sermons: Sermon[], query: string) {
  const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = plain(query.trim())
  if (q.length < 2) return []
  return sermons
    .filter((s) => s.status === 'ready')
    .map((s) => {
      const fields = [s.theme, s.preacher, s.transcript, s.summary]
      const hit = fields.find((f) => plain(f).includes(q))
      if (!hit) return null
      const i = plain(hit).indexOf(q)
      const start = Math.max(0, i - 40)
      const snippet = hit.slice(start, i + q.length + 60).trim()
      return { sermon: s, snippet }
    })
    .filter((x): x is { sermon: Sermon; snippet: string } => !!x)
}
