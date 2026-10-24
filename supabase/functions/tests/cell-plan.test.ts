// Roteiro da célula com IA: versículos só do texto do app, limites contados certo e resposta conferida. O Claude é simulado.
import { describe, expect, test, vi } from 'vitest'
import { cleanImport, draftCellPlan, importCellPlan, type DraftDeps } from '../_shared/cell-plan.ts'
import type { AskJsonRequest } from '../_shared/claude-types.ts'
import type { Usage } from '../_shared/usage.ts'

const ok: Usage = { ok: true, remaining: 9, limit: 10, resetsAt: null }
const VERSES = [
  { key: 'joao:15:1', text: 'Eu sou a videira verdadeira.' },
  { key: 'joao:15:5', text: 'Eu sou a videira, vós as varas.' },
]
const DRAFT = {
  title: 'Permanecer',
  cited: ['joao:15:5', 'salmos:23:1'],
  icebreaker: 'Qual planta você já cuidou?',
  word: 'Em João 15.5 Jesus fala de permanecer.',
  questions: ['O que é permanecer?', ''],
  prayer: 'Orem uns pelos outros.',
}

function deps(over: { month?: Usage; day?: Usage; answers?: unknown[]; fail?: boolean } = {}) {
  const refundMonth = vi.fn(async () => {})
  const refundDay = vi.fn(async () => {})
  const answers = [...(over.answers ?? [{ on_topic: true, terms: ['permanecer'], refs: ['joao:15:1-8'] }, DRAFT])]
  const askJson = vi.fn(async (_r: AskJsonRequest) => {
    if (over.fail) throw new Error('caiu')
    return answers.shift()
  })
  const versesByKeys = vi.fn(async (keys: string[]) => VERSES.filter((v) => keys.includes(v.key)))
  const d: DraftDeps = {
    useMonth: async () => ({ usage: over.month ?? ok, refund: refundMonth }),
    useDay: async () => ({ usage: over.day ?? ok, refund: refundDay }),
    askJson,
    versesByKeys,
    searchVerses: async () => [],
  }
  return { d, refundMonth, refundDay, askJson, versesByKeys }
}

describe('rascunho do roteiro por tema', () => {
  test('usa só os versículos do app e descarta o que a IA citou de fora', async () => {
    const { d, askJson, versesByKeys } = deps()
    const r = await draftCellPlan(d, { theme: 'Permanecer em Cristo', ref: 'João 15:1-8' })
    expect(r).toEqual({
      ok: true,
      draft: {
        title: 'Permanecer',
        verseKeys: ['joao:15:5'],
        icebreaker: 'Qual planta você já cuidou?',
        word: 'Em João 15.5 Jesus fala de permanecer.',
        questions: ['O que é permanecer?'],
        prayer: 'Orem uns pelos outros.',
      },
    })
    expect(versesByKeys.mock.calls[0][0]).toContain('joao:15:8')
    expect(askJson.mock.calls[0][0].prompt).toContain('Texto base: João 15:1-8')
    expect(askJson.mock.calls[1][0].prompt).toContain('[joao:15:1] Eu sou a videira verdadeira.')
  })

  test('sem o plano Líder, não chama a IA', async () => {
    const { d, askJson } = deps({ month: { ok: false, reason: 'no_access' } })
    expect(await draftCellPlan(d, { theme: 'Perdão' })).toEqual({ ok: false, reason: 'no_access' })
    expect(askJson).not.toHaveBeenCalled()
  })

  test('roteiros do mês acabaram: avisa quando libera', async () => {
    const { d } = deps({ month: { ok: false, reason: 'limit', limit: 10, resetsAt: '2026-11-01T03:00:00.000Z' } })
    expect(await draftCellPlan(d, { theme: 'Perdão' })).toEqual({ ok: false, reason: 'limit', scope: 'month', resetsAt: '2026-11-01T03:00:00.000Z' })
  })

  test('tentativas do dia acabaram: devolve o roteiro do mês', async () => {
    const { d, refundMonth } = deps({ day: { ok: false, reason: 'limit', limit: 5, resetsAt: '2026-10-25T03:00:00.000Z' } })
    expect(await draftCellPlan(d, { theme: 'Perdão' })).toEqual({ ok: false, reason: 'limit', scope: 'day', resetsAt: '2026-10-25T03:00:00.000Z' })
    expect(refundMonth).toHaveBeenCalled()
  })

  test('tema fora da fé: não conta no mês', async () => {
    const { d, refundMonth, askJson } = deps({ answers: [{ on_topic: false, terms: [], refs: [] }] })
    expect(await draftCellPlan(d, { theme: 'Receita de bolo' })).toEqual({ ok: false, reason: 'off_topic' })
    expect(refundMonth).toHaveBeenCalled()
    expect(askJson).toHaveBeenCalledTimes(1)
  })

  test('servidor falhou: devolve o mês e a tentativa do dia', async () => {
    const { d, refundMonth, refundDay } = deps({ fail: true })
    expect(await draftCellPlan(d, { theme: 'Perdão' })).toEqual({ ok: false, reason: 'failed' })
    expect(refundMonth).toHaveBeenCalled()
    expect(refundDay).toHaveBeenCalled()
  })
})

describe('roteiro pelo PDF ou pela foto', () => {
  const PDF = { data: 'JVBERi0=', mediaType: 'application/pdf' as const }

  test('manda o arquivo e devolve os roteiros conferidos', async () => {
    const { d, askJson } = deps({
      answers: [
        {
          found: true,
          plans: [
            {
              title: 'Semana 1',
              ref: 'Jo 15.1-8',
              sections: [
                { title: 'Quebra-gelo', content: 'Conte algo bom.', minutes: 12 },
                { title: 'Avisos', content: '', minutes: 0 },
              ],
            },
          ],
        },
      ],
    })
    const r = await importCellPlan(d, PDF)
    expect(r).toEqual({ ok: true, plans: [{ title: 'Semana 1', ref: 'Jo 15.1-8', sections: [{ title: 'Quebra-gelo', content: 'Conte algo bom.', minutes: 10 }] }] })
    expect(askJson.mock.calls[0][0].image).toEqual(PDF)
  })

  test('arquivo que não é roteiro: não conta no mês, mas conta a tentativa do dia', async () => {
    const { d, refundMonth, refundDay } = deps({ answers: [{ found: false, plans: [] }] })
    expect(await importCellPlan(d, PDF)).toEqual({ ok: false, reason: 'not_found' })
    expect(refundMonth).toHaveBeenCalled()
    expect(refundDay).not.toHaveBeenCalled()
  })

  test('corta o que passa do tamanho dos campos do app e limita a 6 roteiros', () => {
    const long = 'a'.repeat(1500)
    const plans = cleanImport({ found: true, plans: Array.from({ length: 8 }, () => ({ title: long, ref: long, sections: [{ title: long, content: long, minutes: 200 }] })) })
    expect(plans).toHaveLength(6)
    expect(plans[0].title).toHaveLength(80)
    expect(plans[0].ref).toHaveLength(60)
    expect(plans[0].sections[0]).toEqual({ title: 'a'.repeat(40), content: 'a'.repeat(1000), minutes: 90 })
  })
})
