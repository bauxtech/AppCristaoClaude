// Testes da lógica das funções do servidor. As chamadas ao Claude, à OpenAI e ao banco são simuladas.
import { describe, expect, test, vi } from 'vitest'
import { answerChat, expandRefs, searchTerms, type ChatDeps } from '../_shared/chat.ts'
import { DAILY_REFS, refForDay, writeDaily } from '../_shared/daily.ts'
import { patchFromEvent, validWebhookAuth } from '../_shared/revenuecat.ts'
import { processSermon, type SermonDeps } from '../_shared/sermon.ts'
import { brMinutes, chunks, decide } from '../_shared/push.ts'
import { isReligious, toChurchRow, validCnpj } from '../_shared/church.ts'
import { ADMIN_EXPORT_TABLES, EXPORT_EITHER, EXPORT_TABLES, SKIP_TABLES, exportFile } from '../_shared/export.ts'

const VERSES = { 'filipenses:4:6': 'Não estejais ansiosos por coisa alguma.', 'salmos:23:1': 'O Senhor é o meu pastor; nada me faltará.' }

function chatDeps(over: Partial<ChatDeps> = {}): ChatDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    use: async () => (calls.push('consume'), { ok: true as const, remaining: 9, limit: 10, resetsAt: '2026-10-13T03:00:00.000Z' }),
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
    const d = chatDeps({ use: async () => ({ ok: false, reason: 'no_access' }) })
    expect(await answerChat(d, { question: 'tenho vontade de morrer' })).toEqual({ kind: 'crisis', phone: '188' })
    expect(d.calls).toEqual([])
    expect(d.askJson).not.toHaveBeenCalled()
  })

  test('sem plano com chat não responde', async () => {
    expect((await answerChat(chatDeps({ use: async () => ({ ok: false, reason: 'no_access' }) }), { question: 'o que é graça' })).kind).toBe('no_access')
  })

  test('limite do dia vem do servidor, com a hora em que zera', async () => {
    const d = chatDeps({ use: async () => ({ ok: false, reason: 'limit', limit: 5, resetsAt: '2026-10-13T03:00:00.000Z' }) })
    expect(await answerChat(d, { question: 'o que é graça' })).toEqual({ kind: 'limit', limit: 5, resetsAt: '2026-10-13T03:00:00.000Z' })
    expect(d.askJson).not.toHaveBeenCalled()
  })

  test('cita só versículos do app; o texto vem do banco, não da IA', async () => {
    const r = await answerChat(chatDeps(), { question: 'o que a Bíblia diz sobre ansiedade?' })
    expect(r.kind).toBe('answer')
    if (r.kind !== 'answer') return
    expect(r.verses).toEqual([{ key: 'filipenses:4:6', text: VERSES['filipenses:4:6'] }])
    expect(r.remaining).toBe(9)
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

  test('passagem inteira vira cada versículo, com limite', () => {
    expect(expandRefs(['lucas:15:11-13', 'joao:3:16', 'texto solto'])).toEqual(['lucas:15:11', 'lucas:15:12', 'lucas:15:13', 'joao:3:16'])
    expect(expandRefs(['salmos:119:1-176'])).toHaveLength(30)
  })

  test('busca liga as palavras por "ou"', () => {
    expect(searchTerms('O que a Bíblia diz sobre ansiedade e medo?', ['preocupação'])).toBe('ansiedade or medo or preocupacao')
  })
})

describe('culto no servidor', () => {
  const base = (over: Partial<SermonDeps> = {}): SermonDeps => ({
    use: async () => ({ ok: true as const, remaining: 3, limit: 4, resetsAt: null }),
    refund: vi.fn(async () => {}),
    transcribe: async () => 'Irmãos, hoje vamos ler Filipenses 4 versículo 6 e também o Salmo 23. '.repeat(3),
    versesByKeys: async (keys) => keys.filter((k) => k in VERSES).map((k) => ({ key: k, text: VERSES[k as keyof typeof VERSES] })),
    askJson: async () => ({ title: 'Sem ansiedade', summary: 'Resumo.', points: ['a', 'b', 'c'], refs: ['filipenses:4:6', 'salmos:23:1', 'nao-existe:1:1'], application: 'Orar.' }),
    ...over,
  })

  test('limite de cultos do período, com a renovação', async () => {
    expect(await processSermon(base({ use: async () => ({ ok: false, reason: 'limit', limit: 4, resetsAt: '2026-11-01T03:00:00.000Z' }) }))).toEqual({ kind: 'limit', limit: 4, resetsAt: '2026-11-01T03:00:00.000Z' })
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

describe('avisos para o celular', () => {
  const noon = new Date('2026-10-08T15:00:00Z') // 12h em São Paulo
  const night = new Date('2026-10-09T02:00:00Z') // 23h em São Paulo
  test('horário de São Paulo', () => {
    expect(brMinutes(noon)).toBe(12 * 60)
    expect(brMinutes(night)).toBe(23 * 60)
  })
  test('tipo desligado não vai; padrão do app vale para quem não mexeu', () => {
    expect(decide({ types: { orou: false } }, 'orou', noon)).toBe('skip')
    expect(decide(null, 'orou', noon)).toBe('send')
    expect(decide(null, 'novoPedido', noon)).toBe('skip')
    expect(decide(null, null, noon)).toBe('send')
  })
  test('no horário de silêncio, espera para depois', () => {
    const prefs = { quietFrom: '22:00', quietTo: '07:00' }
    expect(decide(prefs, 'orou', night)).toBe('later')
    expect(decide(prefs, 'orou', noon)).toBe('send')
  })
  test('envia em lotes de 100', () => {
    expect(chunks(Array.from({ length: 250 }, (_, i) => i)).map((c) => c.length)).toEqual([100, 100, 50])
  })
})

describe('igreja pelo CNPJ', () => {
  test('confere os dígitos do CNPJ', () => {
    expect(validCnpj('11.222.333/0001-81')).toBe(true)
    expect(validCnpj('11.222.333/0001-82')).toBe(false)
    expect(validCnpj('11111111111111')).toBe(false)
    expect(validCnpj('123')).toBe(false)
  })
  test('só aceita organização religiosa, pela atividade principal ou secundária', () => {
    expect(isReligious({ cnae_fiscal: 9491000 })).toBe(true)
    expect(isReligious({ cnae_fiscal: '4711301', cnaes_secundarios: [{ codigo: 9491000 }] })).toBe(true)
    expect(isReligious({ cnae_fiscal: 4711301 })).toBe(false)
  })
  test('monta nome, endereço, bairro e cidade a partir da Receita', () => {
    const row = toChurchRow('11.222.333/0001-81', {
      razao_social: 'IGREJA EVANGELICA BATISTA DO BAIRRO',
      nome_fantasia: '',
      descricao_tipo_de_logradouro: 'RUA',
      logradouro: 'DAS FLORES',
      numero: '100',
      bairro: 'PINHEIROS',
      municipio: 'SAO PAULO',
      uf: 'sp',
    })
    expect(row).toEqual({ cnpj: '11222333000181', name: 'Igreja Evangelica Batista do Bairro', address: 'Rua das Flores, 100, Pinheiros, Sao Paulo, SP', neighborhood: 'Pinheiros', city: 'Sao Paulo, SP' })
  })
})

describe('baixar meus dados', () => {
  test('o arquivo traz as partes sensíveis (diário, pedidos, chat, cultos) e nada do aparelho de avisos', () => {
    const tables = EXPORT_TABLES.map(([t]) => t)
    for (const t of ['profiles', 'prayer_diary', 'prayer_requests', 'chat_messages', 'sermons', 'bible_notes', 'notes']) expect(tables).toContain(t)
    for (const t of SKIP_TABLES) expect(tables).not.toContain(t)
  })
  test('escala, trocas e denúncias também vão no arquivo, sem repetir tabela', () => {
    const all = [...EXPORT_TABLES.map(([t]) => t), ...EXPORT_EITHER.map(([t]) => t), ...ADMIN_EXPORT_TABLES.map(([t]) => t)]
    for (const t of ['cell_schedule', 'cell_swaps', 'reports']) expect(all).toContain(t)
    expect(new Set(all).size).toBe(all.length)
  })
  test('cabeçalho do arquivo', () => {
    const f = exportFile('u1', { notes: [] }, new Date('2026-10-09T03:00:00Z'))
    expect(f).toMatchObject({ conta: 'u1', gerado_em: '2026-10-09T03:00:00.000Z', dados: { notes: [] } })
  })
})

describe('limites do plano', () => {
  test('lê a resposta do banco', async () => {
    const { usageFrom } = await import('../_shared/usage.ts')
    expect(usageFrom({ ok: true, remaining: 2, limit: 5, resets_at: 'x' })).toEqual({ ok: true, remaining: 2, limit: 5, resetsAt: 'x' })
    expect(usageFrom({ ok: false, reason: 'limit', limit: 5, resets_at: 'x' })).toEqual({ ok: false, reason: 'limit', limit: 5, resetsAt: 'x' })
    expect(usageFrom({ ok: false, reason: 'no_access' })).toEqual({ ok: false, reason: 'no_access' })
    expect(usageFrom(null)).toEqual({ ok: false, reason: 'no_access' })
  })
  test('devolve o uso com o contador e o período certos', async () => {
    const { useLimit } = await import('../_shared/usage.ts')
    const calls: unknown[] = []
    const db = { rpc: async (fn: string, args: Record<string, unknown>) => (calls.push([fn, args]), { data: fn === 'use_limit' ? { ok: true, remaining: 1, limit: 2, counter: 'sermon_period', period: 'p1' } : null, error: null }) }
    const r = await useLimit(db, 'u1', 'sermon')
    await r.refund()
    expect(calls).toEqual([['use_limit', { p_user: 'u1', p_kind: 'sermon' }], ['refund_usage', { p_user: 'u1', p_kind: 'sermon_period', p_period: 'p1' }]])
  })
})

describe('assinatura pela loja', () => {
  const user = '11111111-2222-3333-4444-555555555555'
  test('o plano vem do entitlement do RevenueCat, o maior quando há mais de um', async () => {
    const { planFrom } = await import('../_shared/revenuecat.ts')
    expect(planFrom(['essencial', 'lider'])).toBe('lider')
    expect(planFrom([], 'acasa_completo_anual')).toBe('completo')
    expect(planFrom(null, 'outra_coisa')).toBeNull()
  })
  test('compra e renovação marcam o plano e o início do período (zera os cultos)', async () => {
    const { patchFromEvent } = await import('../_shared/revenuecat.ts')
    expect(patchFromEvent({ type: 'RENEWAL', app_user_id: user, product_id: 'acasa_completo_mensal', entitlement_ids: ['completo'], purchased_at_ms: Date.UTC(2026, 9, 12), expiration_at_ms: Date.UTC(2026, 10, 12) })).toMatchObject({
      status: 'active', plan: 'completo', billing: 'monthly', period_start: '2026-10-12T00:00:00.000Z', renews_at: '2026-11-12T00:00:00.000Z',
    })
    // Troca agendada não muda o plano na hora: com a chave secreta, o webhook consulta o RevenueCat.
    expect(patchFromEvent({ type: 'PRODUCT_CHANGE', app_user_id: user, product_id: 'acasa_lider_mensal', new_product_id: 'acasa_completo_mensal' })).toBeNull()
  })
  test('consulta direta: plano ativo, cancelado ou com pagamento falhando', async () => {
    const { patchFromSubscriber } = await import('../_shared/revenuecat.ts')
    const now = new Date('2026-10-12T12:00:00Z')
    const sub = {
      entitlements: { lider: { expires_date: '2026-11-12T00:00:00Z', product_identifier: 'acasa_lider_mensal', purchase_date: '2026-10-12T00:00:00Z' }, essencial: { expires_date: '2026-01-01T00:00:00Z', product_identifier: 'velho', purchase_date: '2025-12-01T00:00:00Z' } },
      subscriptions: { acasa_lider_mensal: { expires_date: '2026-11-12T00:00:00Z', purchase_date: '2026-10-12T00:00:00Z', store: 'app_store' } },
    }
    expect(patchFromSubscriber(user, sub, now)).toMatchObject({ status: 'active', plan: 'lider', store: 'app_store', period_start: '2026-10-12T00:00:00Z', renews_at: '2026-11-12T00:00:00Z' })
    expect(patchFromSubscriber(user, { ...sub, subscriptions: { acasa_lider_mensal: { ...sub.subscriptions.acasa_lider_mensal, unsubscribe_detected_at: '2026-10-13T00:00:00Z' } } }, now)?.status).toBe('canceled_active')
    expect(patchFromSubscriber(user, { entitlements: { lider: { expires_date: '2026-10-01T00:00:00Z', product_identifier: 'x', purchase_date: '2026-09-01T00:00:00Z' } } }, now)).toEqual({ user_id: user, status: 'expired' })
    expect(patchFromSubscriber(user, {}, now)).toBeNull()
    expect(patchFromSubscriber('$RCAnonymousID:x', sub, now)).toBeNull()
  })
  test('compra de teste (sandbox) não libera em produção, só com a liberação dos testes', async () => {
    const { patchFromSubscriber } = await import('../_shared/revenuecat.ts')
    const now = new Date('2026-10-12T12:00:00Z')
    const sub = {
      entitlements: { completo: { expires_date: '2026-11-12T00:00:00Z', product_identifier: 'acasa_completo_mensal', purchase_date: '2026-10-12T00:00:00Z' } },
      subscriptions: { acasa_completo_mensal: { expires_date: '2026-11-12T00:00:00Z', purchase_date: '2026-10-12T00:00:00Z', is_sandbox: true } },
    }
    expect(patchFromSubscriber(user, sub, now)?.status).toBe('expired')
    expect(patchFromSubscriber(user, sub, now, true)?.plan).toBe('completo')
  })
  test('transferência ("Restaurar compra" em outra conta) afeta as duas contas', async () => {
    const { affectedUsers } = await import('../_shared/revenuecat.ts')
    const other = '99999999-2222-3333-4444-555555555555'
    expect(affectedUsers({ type: 'TRANSFER', app_user_id: user, transferred_from: [user], transferred_to: [other, '$RCAnonymousID:x'] })).toEqual([user, other])
    expect(affectedUsers({ type: 'RENEWAL', app_user_id: user })).toEqual([user])
  })
})

import { emailText, outboxAction, resendPayload, unsubscribeUrl, validToken } from '../_shared/email.ts'

describe('e-mails da régua', () => {
  const token = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'
  const row = (over: Partial<{ email: string | null; offers_email: boolean }> = {}) => ({
    id: 1,
    subject: 'Plano anual do acasa',
    body: 'No plano anual, o mês sai mais barato.',
    attempts: 0,
    profiles: { email: 'lia@exemplo.com', offers_email: true, offers_token: token, name: 'Lia Souza', ...over },
  })

  test('todo e-mail diz por que chegou e traz o link para não receber mais', () => {
    const url = unsubscribeUrl('https://x.supabase.co/', token)
    expect(url).toBe(`https://x.supabase.co/functions/v1/descadastrar?t=${token}`)
    const text = emailText(row(), 'Lia Souza', url)
    expect(text.startsWith('Olá, Lia.')).toBe(true)
    expect(text).toContain('autorizou ofertas do acasa por e-mail')
    expect(text).toContain(url)
  })

  test('quem saiu das ofertas ou apagou o e-mail depois de entrar na fila não recebe', () => {
    expect(outboxAction(row())).toBe('send')
    expect(outboxAction(row({ offers_email: false }))).toBe('drop')
    expect(outboxAction(row({ email: null }))).toBe('drop')
    expect(outboxAction({ ...row(), profiles: null })).toBe('drop')
  })

  test('descadastro em um clique para Gmail e Yahoo', () => {
    const p = resendPayload('acasa <ofertas@acasa.app.br>', 'lia@exemplo.com', 'Assunto', 'texto', 'https://u')
    expect(p.headers).toEqual({ 'List-Unsubscribe': '<https://u>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
    expect(p.to).toEqual(['lia@exemplo.com'])
  })

  test('o link só aceita o código no formato certo', () => {
    expect(validToken(token)).toBe(true)
    expect(validToken("1' or '1'='1")).toBe(false)
    expect(validToken(null)).toBe(false)
  })
})
