import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { detectKind, splitAudio } from '../_shared/audio-split.ts'

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)))

/** Soma a duração das partes m4a lendo mdhd (timescale e duração). */
function mp4Seconds(b: Uint8Array) {
  const s = Buffer.from(b)
  const i = s.indexOf('mdhd')
  return s.readUInt32BE(i + 20) / s.readUInt32BE(i + 16)
}

function wav(seconds: number, rate = 8000) {
  const pcm = seconds * rate * 2
  const b = Buffer.alloc(44 + pcm)
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(pcm, 40)
  return new Uint8Array(b)
}

describe('divisão do áudio do culto', () => {
  test('reconhece os formatos', () => {
    expect(detectKind(fixture('tom-30s.m4a'))).toBe('mp4')
    expect(detectKind(fixture('tom-30s.mp3'))).toBe('mp3')
    expect(detectKind(wav(1))).toBe('wav')
    expect(detectKind(new Uint8Array([1, 2, 3, 4]))).toBe('other')
  })

  test('m4a: 30 s em partes de até 10 s, sem perder áudio', () => {
    const parts = splitAudio(fixture('tom-30s.m4a'), 10)
    expect(parts.length).toBeGreaterThanOrEqual(3)
    expect(parts.length).toBeLessThanOrEqual(4)
    for (const p of parts) {
      expect(p.name).toMatch(/\.m4a$/)
      expect(mp4Seconds(p.bytes)).toBeLessThanOrEqual(10)
    }
    const total = parts.reduce((t, p) => t + mp4Seconds(p.bytes), 0)
    expect(total).toBeGreaterThan(29.5)
  })

  test('m4a curto segue em uma parte só', () => {
    expect(splitAudio(fixture('tom-30s.m4a'), 600)).toHaveLength(1)
  })

  test('mp3: divide nos quadros, cada parte começa num quadro válido', () => {
    const parts = splitAudio(fixture('tom-30s.mp3'), 10)
    expect(parts.length).toBeGreaterThanOrEqual(3)
    expect(parts.length).toBeLessThanOrEqual(4)
    for (const p of parts) {
      expect(p.bytes[0]).toBe(0xff)
      expect(p.bytes[1] & 0xe0).toBe(0xe0)
    }
  })

  test('wav: divide com cabeçalho novo em cada parte', () => {
    const parts = splitAudio(wav(25), 10)
    const secs = parts.map((p) => Buffer.from(p.bytes).readUInt32LE(40) / 16000)
    expect(secs).toHaveLength(3)
    for (const x of secs) expect(Math.abs(x - 25 / 3)).toBeLessThan(0.01)
    expect(secs.reduce((a, x) => a + x, 0)).toBe(25)
    for (const p of parts) expect(Buffer.from(p.bytes).toString('ascii', 0, 4)).toBe('RIFF')
  })

  test('respeita o limite de tamanho além do de duração', () => {
    const parts = splitAudio(wav(10), 600, 50_000)
    for (const p of parts) expect(p.bytes.length).toBeLessThanOrEqual(50_000)
    expect(parts.length).toBeGreaterThan(1)
  })

  test('formato desconhecido ou quebrado segue inteiro', () => {
    const junk = new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 1, 2, 3, 4])
    expect(splitAudio(junk, 10)).toHaveLength(1)
    expect(splitAudio(new Uint8Array(100), 10)).toHaveLength(1)
  })
})

describe('transcrição em partes', () => {
  test('junta o texto na ordem das partes, mesmo quando uma termina antes', async () => {
    const { transcribeParts } = await import('../_shared/sermon.ts')
    const delays = [30, 5, 20, 1]
    const text = await transcribeParts([0, 1, 2, 3], (i) => new Promise((r) => setTimeout(() => r(` parte ${i} `), delays[i])), 2)
    expect(text).toBe('parte 0\n\nparte 1\n\nparte 2\n\nparte 3')
  })
  test('erro em uma parte falha o culto todo', async () => {
    const { transcribeParts } = await import('../_shared/sermon.ts')
    await expect(transcribeParts([0, 1], async (i) => { if (i === 1) throw new Error('400'); return 'ok' })).rejects.toThrow('400')
  })
})

describe('culto de até 90 minutos', () => {
  test('só as primeiras 9 partes de 10 minutos vão para a transcrição', async () => {
    const { firstParts } = await import('../_shared/audio-split.ts')
    const parts = Array.from({ length: 18 }, (_, i) => i)
    expect(firstParts(parts)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(firstParts([0, 1])).toEqual([0, 1])
  })
})
