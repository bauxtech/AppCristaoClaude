// Testes da lógica das funções do servidor. As chamadas ao Claude, à OpenAI e ao banco são simuladas.
import { describe, expect, test, vi } from 'vitest'
import { answerChat, searchTerms, type ChatDeps } from '../_shared/chat.ts'
import { DAILY_REFS, refForDay, writeDaily } from '../_shared/daily.ts'
import { patchFromEvent, validWebhookAuth } from '../_shared/revenuecat.ts'
import { processSermon, type SermonDeps } from '../_shared/sermon.ts'

const VERSES = { 'filipenses:4:6': 'Não estejais ansiosos por coisa alguma.', 'salmos:23:1': 'O Senhor é o meu pastor; nada me faltará.' }

function chatDeps(over: Partial<ChatDeps> = {}): ChatDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    hasAccess: async () => true,
    consume: async () => (calls.push('consume'), 19),
    refund: async () => void calls.push('refund'),
    searchVerses: async () => [{ key: 'salmos:23:1', text: VERSES['salmos:23:1'] }],
    versesByKeys: async (keys) => keys.filter((k) => k in VERSES).map((k) => ({ key: k, text: VERSES[k as keyof typeof VERSES] })),
    askJson: vi.fn(async (req) => {
      if ('on_topic' in (req.schema as { properties: object }).properties) return { on_topic: true, terms: ['ansiedade'], refs: ['filipenses:4:6', 'inventado:1:1'] }
      return { answer: 'Filipenses 4.6 fala sobre levar a ansiedade a Deus em oração.', cited: ['filipenses:4:6', 'mateus:99:1'], divided: false }
    }),
    ...over,
  }
}

describe('chat no servidor', () => {
  test('crise mostra o CVV antes de tudo, sem gastar pergunta nem chamar a IA', async () => {
    const d = chatDeps({ hasAccess: async () => false })
    expect(await answerChat(d, { question: 'tenho vontade de morrer' })).toEqual({ kind: 'crisis', phone: '188' })
    expect(d.calls).toEqual([])
    expect(d.askJson).not.toHaveBeenCalled()
  })

  test('sem assinatura não responde', async () => {
    expect((await answerChat(chatDeps({ hasAccess: async () => false }), { question: 'o que é graça' })).kind).toBe('no_access')
  })

  test('limite de 20 por dia vem do servidor', async () => {
    const d = chatDeps({ consume: async () => -1 })
    expect(await answerChat(d, { question: 'o que é graça' })).toEqual({ kind: 'limit', limit: 20 })
    expect(d.askJson).not.toHaveBeenCalled()
  })

  test('cita só versículos do app; o texto vem do banco, não da IA', async () => {
    const r = await answerChat(chatDeps(), { question: 'o que a Bíblia diz sobre ansiedade?' })
    expect(r.kind).toBe('answer')
    if (r.kind !== 'answer') return
    expect(r.verses).toEqual([{ key: 'filipenses:4:6', text: VERSES['filipenses:4:6'] }])
    expect(r.remaining).toBe(19)
  })

  test('a IA recebe só os versículos encontrados no banco', async () => {
    const d = chatDeps()
    await answerChat(d, { question: 'ansiedade' })
    const prompt = (d.askJson as ReturnType<typeof vi.fn>).mock.calls[1][0].prompt as string
    expect(prompt).toContain('[filipenses:4:6]')
    expect(prompt).not.toContain('inventado:1:1')
  })

  test('fora do assunto, pela IA, devolve a pergunta', async () => {
    const d = chatDeps({ askJson: vi.fn(async () => ({ on_topic: false, terms: [], refs: [] })) })
    expect((await answerChat(d, { question: 'qual o melhor celular?' })).kind).toBe('off_topic')
    expect(d.calls).toEqual(['consume', 'refund'])
  })

  test('erro na IA devolve a pergunta', async () => {
    const d = chatDeps({ askJson: vi.fn(async () => { throw new Error('fora do ar') }) })
    await expect(answerChat(d, { question: 'o que é graça' })).rejects.toThrow()
    expect(d.calls).toEqual(['consume', 'refund'])
  })

  test('tema em que as igrejas pensam diferente é marcado', async () => {
    const r = await answerChat(chatDeps(), { question: 'batismo de criança é bíblico?' })
    expect(r.kind === 'answer' && r.divided).toBe(true)
  })

  test('busca liga as palavras por "ou"', () => {
    expect(searchTerms('O que a Bíblia diz sobre ansiedade e medo?', ['preocupação'])).toBe('ansiedade or medo or preocupacao')
  })
})

describe('culto no servidor', () => {
  const base = (over: Partial<SermonDeps> = {}): SermonDeps => ({
    hasAccess: async () => true,
    consume: async () => 3,
    refund: vi.fn(async () => {}),
    transcribe: async () => 'Irmãos, hoje vamos ler Filipenses 4 versículo 6 e também o Salmo 23. '.repeat(3),
    versesByKeys: async (keys) => keys.filter((k) => k in VERSES).map((k) => ({ key: k, text: VERSES[k as keyof typeof VERSES] })),
    askJson: async () => ({ title: 'Sem ansiedade', summary: 'Resumo.', points: ['a', 'b', 'c'], refs: ['filipenses:4:6', 'salmos:23:1', 'nao-existe:1:1'], application: 'Orar.' }),
    ...over,
  })

  test('limite de 5 por mês', async () => {
    expect(await processSermon(base({ consume: async () => -1 }))).toEqual({ kind: 'limit', limit: 5 })
  })

  test('resumo com versículos só do texto do app', async () => {
    const r = await processSermon(base())
    expect(r.kind).toBe('ready')
    if (r.kind === 'ready') expect(r.summary.verses.map((v) => v.key)).toEqual(['filipenses:4:6', 'salmos:23:1'])
  })

  test('áudio sem fala não gasta o culto do mês', async () => {
    const d = base({ transcribe: async () => '...' })
    expect((await processSermon(d)).kind).toBe('empty')
    expect(d.refund).toHaveBeenCalled()
  })
})

describe('conteúdo diário', () => {
  test('mesmo versículo para todos no mesmo dia, girando pela lista', () => {
    expect(refForDay('2026-10-04')).toBe(refForDay('2026-10-04'))
    expect(refForDay('2026-10-04')).not.toBe(refForDay('2026-10-05'))
    expect(DAILY_REFS).toContain(refForDay('2026-12-25'))
  })

  test('o versículo vem do banco; sem ele, não publica', async () => {
    const askJson = vi.fn(async () => ({ reflection: 'Reflexão.', prayer: 'Oração.' }))
    await expect(writeDaily({ verse: async () => null, askJson }, '2026-10-04')).rejects.toThrow()
    const out = await writeDaily({ verse: async (key) => ({ key, text: 'Texto do banco' }), askJson }, '2026-10-04')
    expect(out.verse_key).toBe(refForDay('2026-10-04'))
    expect((askJson.mock.calls[0] as unknown as [{ prompt: string }])[0].prompt).toContain('Texto do banco')
  })
})

describe('RevenueCat', () => {
  const user = '00000000-0000-0000-0000-00000000000b'
  test('compra e renovação ativam com a próxima cobrança', () => {
    expect(patchFromEvent({ type: 'INITIAL_PURCHASE', app_user_id: user, product_id: 'plano_anual', store: 'PLAY_STORE', expiration_at_ms: Date.UTC(2027, 9, 4) })).toMatchObject({ status: 'active', billing: 'annual', store: 'play_store', renews_at: '2027-10-04T00:00:00.000Z' })
  })
  test('cancelada continua ativa até o fim do período', () => {
    expect(patchFromEvent({ type: 'CANCELLATION', app_user_id: user, expiration_at_ms: Date.UTC(2026, 10, 1) })?.status).toBe('canceled_active')
  })
  test('pagamento falhou dá prazo de 7 dias quando a loja não informa', () => {
    const now = new Date(Date.UTC(2026, 9, 4))
    expect(patchFromEvent({ type: 'BILLING_ISSUE', app_user_id: user }, now)?.grace_until).toBe('2026-10-11T00:00:00.000Z')
  })
  test('id que não é de usuário do app é ignorado', () => {
    expect(patchFromEvent({ type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc' })).toBeNull()
  })
  test('webhook sem o segredo certo é recusado', () => {
    expect(validWebhookAuth('Bearer certo', 'certo')).toBe(true)
    expect(validWebhookAuth('Bearer errado', 'certo')).toBe(false)
    expect(validWebhookAuth(null, 'certo')).toBe(false)
    expect(validWebhookAuth('Bearer x', undefined)).toBe(false)
  })
})
