import { speechChunks } from '../src/features/audio/speechChunks'

describe('leitura em voz alta em partes', () => {
  test('texto curto vai inteiro', () => {
    expect(speechChunks('1. No princípio criou Deus os céus e a terra.')).toEqual(['1. No princípio criou Deus os céus e a terra.'])
  })

  test('capítulo longo vira partes abaixo do limite, cortadas no fim de frase, sem perder texto', () => {
    const verse = (n: number) => `${n}. E disse Deus: Haja luz; e houve luz, e viu Deus que era bom.`
    const text = Array.from({ length: 120 }, (_, i) => verse(i + 1)).join(' ')
    const parts = speechChunks(text, 3000)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(3000)
    for (const p of parts.slice(0, -1)) expect(p.endsWith('.')).toBe(true)
    expect(parts.join(' ')).toBe(text)
  })

  test('texto vazio não fala nada', () => {
    expect(speechChunks('   ')).toEqual([])
  })
})
