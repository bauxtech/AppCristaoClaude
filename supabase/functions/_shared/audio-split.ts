// Divide o áudio do culto em partes menores antes da transcrição.
// O modelo de transcrição recusa áudio com mais de uns 23 minutos (teste de 11/10: 30 minutos deu erro 400)
// e arquivos acima de 25 MB. Cada parte sai com no máximo PART_SECONDS e PART_BYTES.
// Formatos: m4a/mp4 com AAC (gravação do app), mp3 e wav. Outros seguem inteiros, como antes.
// Tudo em TypeScript puro: as funções do Supabase não têm ffmpeg.

export const PART_SECONDS = 600
export const PART_BYTES = 24 * 1024 * 1024

export interface AudioPart {
  bytes: Uint8Array
  name: string
  type: string
}

export type AudioKind = 'mp4' | 'mp3' | 'wav' | 'other'

export function detectKind(b: Uint8Array): AudioKind {
  if (b.length >= 12 && str(b, 4, 4) === 'ftyp') return 'mp4'
  if (b.length >= 12 && str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WAVE') return 'wav'
  if (b.length >= 3 && str(b, 0, 3) === 'ID3') return 'mp3'
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'mp3'
  return 'other'
}

/** Divide o áudio. Se o formato não for reconhecido ou o arquivo estiver fora do padrão, devolve o arquivo inteiro. */
export function splitAudio(b: Uint8Array, maxSeconds = PART_SECONDS, maxBytes = PART_BYTES): AudioPart[] {
  const kind = detectKind(b)
  try {
    if (kind === 'mp4') {
      const parts = splitMp4(b, maxSeconds, maxBytes)
      if (parts) return parts.map((bytes, i) => ({ bytes, name: `parte-${i + 1}.m4a`, type: 'audio/mp4' }))
    }
    if (kind === 'mp3') {
      const parts = splitMp3(b, maxSeconds, maxBytes)
      if (parts) return parts.map((bytes, i) => ({ bytes, name: `parte-${i + 1}.mp3`, type: 'audio/mpeg' }))
    }
    if (kind === 'wav') {
      const parts = splitWav(b, maxSeconds, maxBytes)
      if (parts) return parts.map((bytes, i) => ({ bytes, name: `parte-${i + 1}.wav`, type: 'audio/wav' }))
    }
  } catch {
    // Arquivo fora do padrão: segue inteiro.
  }
  const ext = kind === 'mp4' ? 'm4a' : kind === 'other' ? 'audio' : kind
  return [{ bytes: b, name: `culto.${ext}`, type: 'application/octet-stream' }]
}

// ---------- ajudas de bytes ----------

function str(b: Uint8Array, at: number, len: number) {
  let s = ''
  for (let i = 0; i < len; i++) s += String.fromCharCode(b[at + i])
  return s
}
function u32(b: Uint8Array, at: number) {
  return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0
}
function u64(b: Uint8Array, at: number) {
  return u32(b, at) * 2 ** 32 + u32(b, at + 4)
}
function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/**
 * Agrupa itens em partes de tamanho parecido, sem passar dos limites. Devolve o índice de início de cada parte.
 * Partes iguais evitam sobrar um pedaço de meio segundo no fim, que a transcrição leria como ruído.
 */
function groupBy(count: number, seconds: (i: number) => number, size: (i: number) => number, maxSeconds: number, maxBytes: number) {
  let totalT = 0
  let totalB = 0
  for (let i = 0; i < count; i++) {
    totalT += seconds(i)
    totalB += size(i)
  }
  const n = Math.max(1, Math.ceil(totalT / maxSeconds), Math.ceil(totalB / maxBytes))
  const targetT = totalT / n
  const targetB = totalB / n
  const starts = [0]
  let t = 0
  let b = 0
  let cumT = 0
  let cumB = 0
  for (let i = 0; i < count; i++) {
    const dt = seconds(i)
    const sz = size(i)
    const k = starts.length
    const passTarget = k < n && (cumT + dt / 2 > k * targetT || cumB + sz / 2 > k * targetB)
    const passMax = t + dt > maxSeconds || b + sz > maxBytes
    if (i > starts[k - 1] && (passTarget || passMax)) {
      starts.push(i)
      t = 0
      b = 0
    }
    t += dt
    b += sz
    cumT += dt
    cumB += sz
  }
  return starts
}

// ---------- MP4 / M4A ----------

interface Box {
  type: string
  start: number
  header: number
  end: number
}

function boxes(b: Uint8Array, from: number, to: number): Box[] {
  const out: Box[] = []
  let at = from
  while (at + 8 <= to) {
    let size = u32(b, at)
    const type = str(b, at + 4, 4)
    let header = 8
    if (size === 1) {
      size = u64(b, at + 8)
      header = 16
    } else if (size === 0) size = to - at
    if (size < header || at + size > to) break
    out.push({ type, start: at, header, end: at + size })
    at += size
  }
  return out
}
function child(b: Uint8Array, parent: Box, type: string) {
  return boxes(b, parent.start + parent.header, parent.end).find((x) => x.type === type)
}
function path(b: Uint8Array, parent: Box, types: string[]) {
  let cur: Box | undefined = parent
  for (const t of types) {
    cur = cur && child(b, cur, t)
    if (!cur) return undefined
  }
  return cur
}

function box(type: string, ...payload: Uint8Array[]) {
  const body = concat(payload)
  const out = new Uint8Array(8 + body.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, out.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  return out
}
function words(...values: number[]) {
  const out = new Uint8Array(values.length * 4)
  const dv = new DataView(out.buffer)
  values.forEach((v, i) => dv.setUint32(i * 4, v >>> 0))
  return out
}

function splitMp4(b: Uint8Array, maxSeconds: number, maxBytes: number): Uint8Array[] | null {
  const top = boxes(b, 0, b.length)
  const moov = top.find((x) => x.type === 'moov')
  if (!moov || top.some((x) => x.type === 'moof')) return null
  const trak = boxes(b, moov.start + moov.header, moov.end)
    .filter((x) => x.type === 'trak')
    .find((t) => {
      const hdlr = path(b, t, ['mdia', 'hdlr'])
      return hdlr && str(b, hdlr.start + hdlr.header + 8, 4) === 'soun'
    })
  if (!trak) return null
  const mdhd = path(b, trak, ['mdia', 'mdhd'])
  const stbl = path(b, trak, ['mdia', 'minf', 'stbl'])
  if (!mdhd || !stbl) return null
  const mv = b[mdhd.start + mdhd.header]
  const timescale = u32(b, mdhd.start + mdhd.header + (mv === 1 ? 20 : 12))
  const stsd = child(b, stbl, 'stsd')
  const stts = child(b, stbl, 'stts')
  const stsc = child(b, stbl, 'stsc')
  const stsz = child(b, stbl, 'stsz')
  const stco = child(b, stbl, 'stco') ?? child(b, stbl, 'co64')
  if (!timescale || !stsd || !stts || !stsc || !stsz || !stco) return null

  // Tamanhos
  const zb = stsz.start + stsz.header
  const fixed = u32(b, zb + 4)
  const count = u32(b, zb + 8)
  const sizes = new Array<number>(count)
  for (let i = 0; i < count; i++) sizes[i] = fixed || u32(b, zb + 12 + i * 4)

  // Durações
  const deltas = new Array<number>(count)
  const tb = stts.start + stts.header
  let k = 0
  for (let e = 0, n = u32(b, tb + 4); e < n && k < count; e++) {
    const c = u32(b, tb + 8 + e * 8)
    const d = u32(b, tb + 12 + e * 8)
    for (let j = 0; j < c && k < count; j++) deltas[k++] = d
  }
  if (k < count) return null

  // Posições: blocos (stco/co64) com N amostras cada (stsc)
  const cb = stco.start + stco.header
  const chunkCount = u32(b, cb + 4)
  const wide = stco.type === 'co64'
  const chunkOffset = (i: number) => (wide ? u64(b, cb + 8 + i * 8) : u32(b, cb + 8 + i * 4))
  const sb = stsc.start + stsc.header
  const entries = u32(b, sb + 4)
  const offsets = new Array<number>(count)
  let s = 0
  for (let e = 0; e < entries; e++) {
    const first = u32(b, sb + 8 + e * 12) - 1
    const per = u32(b, sb + 12 + e * 12)
    const last = e + 1 < entries ? u32(b, sb + 8 + (e + 1) * 12) - 1 : chunkCount
    for (let c = first; c < last && s < count; c++) {
      let at = chunkOffset(c)
      for (let j = 0; j < per && s < count; j++) {
        offsets[s] = at
        at += sizes[s++]
      }
    }
  }
  if (s < count) return null
  for (let i = 0; i < count; i++) if (offsets[i] + sizes[i] > b.length) return null

  const starts = groupBy(count, (i) => deltas[i] / timescale, (i) => sizes[i], maxSeconds, maxBytes)
  const stsdBytes = b.subarray(stsd.start, stsd.end)
  return starts.map((from, p) => {
    const to = p + 1 < starts.length ? starts[p + 1] : count
    const n = to - from
    const duration = deltas.slice(from, to).reduce((a, d) => a + d, 0)
    const data = concat(Array.from({ length: n }, (_, i) => b.subarray(offsets[from + i], offsets[from + i] + sizes[from + i])))
    // stts compacto
    const runs: number[] = []
    for (let i = from; i < to; i++) {
      if (runs.length && runs[runs.length - 1] === deltas[i]) runs[runs.length - 2]++
      else runs.push(1, deltas[i])
    }
    const build = (mdatOffset: number) => {
      const stblNew = box(
        'stbl',
        stsdBytes,
        box('stts', words(0, runs.length / 2, ...runs)),
        box('stsc', words(0, 1, 1, n, 1)),
        box('stsz', words(0, 0, n, ...sizes.slice(from, to))),
        box('stco', words(0, 1, mdatOffset)),
      )
      const minf = box('minf', box('smhd', words(0, 0)), box('dinf', box('dref', words(0, 1), box('url ', words(1)))), stblNew)
      const hdlr = box('hdlr', words(0, 0), new Uint8Array([0x73, 0x6f, 0x75, 0x6e]), words(0, 0, 0), new Uint8Array([0]))
      const mdia = box('mdia', box('mdhd', words(0, 0, 0, timescale, duration, 0x55c40000)), hdlr, minf)
      const tkhd = box('tkhd', words(0x00000007, 0, 0, 1, 0, duration, 0, 0, 0, 0x01000000), words(0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000, 0, 0))
      const mvhd = box('mvhd', words(0, 0, 0, timescale, duration, 0x00010000), new Uint8Array([0x01, 0x00, 0, 0]), words(0, 0), words(0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000), words(0, 0, 0, 0, 0, 0, 2))
      return box('moov', mvhd, box('trak', tkhd, mdia))
    }
    const ftyp = box('ftyp', new Uint8Array([0x4d, 0x34, 0x41, 0x20]), words(0), new Uint8Array([0x4d, 0x34, 0x41, 0x20, 0x69, 0x73, 0x6f, 0x6d]))
    const moovSize = build(0).length
    const moovNew = build(ftyp.length + moovSize + 8)
    return concat([ftyp, moovNew, box('mdat', data)])
  })
}

// ---------- MP3 ----------

const MP3_BITRATES: Record<string, number[]> = {
  // MPEG-1 camada III e MPEG-2/2.5 camada III, em kbps
  '1': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  '2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}
const MP3_RATES: Record<string, number[]> = { '1': [44100, 48000, 32000], '2': [22050, 24000, 16000], '2.5': [11025, 12000, 8000] }

function mp3Frame(b: Uint8Array, at: number): { size: number; seconds: number } | null {
  if (at + 4 > b.length || b[at] !== 0xff || (b[at + 1] & 0xe0) !== 0xe0) return null
  const ver = (b[at + 1] >> 3) & 3 // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
  const layer = (b[at + 1] >> 1) & 3 // 1 = camada III
  if (ver === 1 || layer !== 1) return null
  const v = ver === 3 ? '1' : ver === 2 ? '2' : '2.5'
  const kbps = MP3_BITRATES[v === '1' ? '1' : '2'][(b[at + 2] >> 4) & 15]
  const rate = MP3_RATES[v][(b[at + 2] >> 2) & 3]
  if (!kbps || !rate) return null
  const pad = (b[at + 2] >> 1) & 1
  const samples = v === '1' ? 1152 : 576
  const size = Math.floor(((samples / 8) * kbps * 1000) / rate) + pad
  return { size, seconds: samples / rate }
}

function splitMp3(b: Uint8Array, maxSeconds: number, maxBytes: number): Uint8Array[] | null {
  let at = 0
  if (str(b, 0, 3) === 'ID3') at = 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f))
  const frames: { at: number; size: number; seconds: number }[] = []
  while (at < b.length) {
    const f = mp3Frame(b, at)
    if (!f) {
      // Lixo entre quadros: procura o próximo começo de quadro válido.
      at++
      continue
    }
    frames.push({ at, ...f })
    at += f.size
  }
  // O primeiro quadro pode ser só um cabeçalho (Xing, Info ou VBRI) com a duração do arquivo inteiro: sai das partes.
  if (frames.length) {
    const head = str(b, frames[0].at, Math.min(frames[0].size, 64))
    if (/Xing|Info|VBRI/.test(head)) frames.shift()
  }
  if (!frames.length) return null
  const starts = groupBy(frames.length, (i) => frames[i].seconds, (i) => frames[i].size, maxSeconds, maxBytes)
  return starts.map((from, p) => {
    const to = p + 1 < starts.length ? starts[p + 1] : frames.length
    const last = frames[to - 1]
    return b.slice(frames[from].at, Math.min(b.length, last.at + last.size))
  })
}

// ---------- WAV ----------

function splitWav(b: Uint8Array, maxSeconds: number, maxBytes: number): Uint8Array[] | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let at = 12
  let fmt: Uint8Array | null = null
  let byteRate = 0
  let align = 0
  let data: [number, number] | null = null
  while (at + 8 <= b.length) {
    const id = str(b, at, 4)
    const size = dv.getUint32(at + 4, true)
    if (id === 'fmt ') {
      fmt = b.subarray(at, at + 8 + size)
      byteRate = dv.getUint32(at + 16, true)
      align = dv.getUint16(at + 20, true)
    }
    if (id === 'data') {
      data = [at + 8, Math.min(b.length, at + 8 + size)]
      break
    }
    at += 8 + size + (size & 1)
  }
  if (!fmt || !data || !byteRate || !align) return null
  // Partes iguais, cada uma dentro dos limites de duração e tamanho.
  const maxBlocks = Math.max(1, Math.floor(Math.min(maxSeconds * byteRate, maxBytes - fmt.length - 20) / align))
  const totalBlocks = Math.ceil((data[1] - data[0]) / align)
  const parts = Math.max(1, Math.ceil(totalBlocks / maxBlocks))
  const partBytes = Math.ceil(totalBlocks / parts) * align
  const out: Uint8Array[] = []
  for (let from = data[0]; from < data[1]; from += partBytes) {
    const pcm = b.subarray(from, Math.min(data[1], from + partBytes))
    const head = new Uint8Array(12)
    const hv = new DataView(head.buffer)
    head.set([0x52, 0x49, 0x46, 0x46], 0)
    hv.setUint32(4, 4 + fmt.length + 8 + pcm.length, true)
    head.set([0x57, 0x41, 0x56, 0x45], 8)
    const dh = new Uint8Array(8)
    dh.set([0x64, 0x61, 0x74, 0x61], 0)
    new DataView(dh.buffer).setUint32(4, pcm.length, true)
    out.push(concat([head, fmt, dh, pcm]))
  }
  return out
}
