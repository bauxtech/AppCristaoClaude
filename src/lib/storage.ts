import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import * as SecureStore from 'expo-secure-store'
import { File, Paths } from 'expo-file-system'
import { AppState, Platform } from 'react-native'

// Guarda os dados do app no próprio aparelho, num arquivo da pasta do app.
// O arquivo é criptografado (XChaCha20-Poly1305). A chave fica no armazenamento seguro do celular
// (Keychain no iPhone, Keystore no Android) e nunca sai dele. O backup do Android está desligado
// (app.json, allowBackup: false). Na web (só para teste), fica sem criptografia no navegador.

const FILE_NAME = 'app-estado.json'
const KEY_NAME = 'app-estado-chave'

// ─── Bytes, texto e base64 (sem depender do que o motor de JavaScript oferece) ─

export function utf8Encode(s: string): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1)
      if (d >= 0xdc00 && d < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00)
        i++
      }
    }
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return Uint8Array.from(out)
}

export function utf8Decode(b: Uint8Array): string {
  let s = ''
  const chunk: number[] = []
  const flush = () => {
    s += String.fromCharCode(...chunk)
    chunk.length = 0
  }
  for (let i = 0; i < b.length; ) {
    const x = b[i]
    let c: number
    if (x < 0x80) (c = x), (i += 1)
    else if (x < 0xe0) (c = ((x & 31) << 6) | (b[i + 1] & 63)), (i += 2)
    else if (x < 0xf0) (c = ((x & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63)), (i += 3)
    else (c = ((x & 7) << 18) | ((b[i + 1] & 63) << 12) | ((b[i + 2] & 63) << 6) | (b[i + 3] & 63)), (i += 4)
    if (c >= 0x10000) {
      c -= 0x10000
      chunk.push(0xd800 + (c >> 10), 0xdc00 + (c & 1023))
    } else chunk.push(c)
    if (chunk.length > 8000) flush()
  }
  flush()
  return s
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0)
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=')
  }
  return s
}

export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let o = 0
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2] ?? 'A') & 63) << 6) | (B64.indexOf(clean[i + 3] ?? 'A') & 63)
    out[o++] = (n >> 16) & 255
    if (o < out.length) out[o++] = (n >> 8) & 255
    if (o < out.length) out[o++] = n & 255
  }
  return out
}

// ─── Criptografia ────────────────────────────────────────────────────────────

/** Bytes aleatórios do sistema. Null quando o app instalado ainda não tem o módulo (APK antigo). */
function randomBytes(n: number): Uint8Array | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto') as typeof import('expo-crypto')
    return Crypto.getRandomBytes(n)
  } catch {
    return null
  }
}

let cachedKey: Uint8Array | null | undefined

/** Chave do arquivo, guardada no armazenamento seguro. Criada na primeira vez. */
function key(): Uint8Array | null {
  if (cachedKey !== undefined) return cachedKey
  try {
    const saved = SecureStore.getItem(KEY_NAME)
    if (saved) return (cachedKey = fromBase64(saved))
    const fresh = randomBytes(32)
    if (!fresh) return (cachedKey = null)
    SecureStore.setItem(KEY_NAME, toBase64(fresh))
    return (cachedKey = fresh)
  } catch {
    return (cachedKey = null)
  }
}

type Sealed = { v: 1; n: string; c: string }

export function seal(raw: string, k: Uint8Array, nonce: Uint8Array): Sealed {
  return { v: 1, n: toBase64(nonce), c: toBase64(xchacha20poly1305(k, nonce).encrypt(utf8Encode(raw))) }
}

export function open(sealed: Sealed, k: Uint8Array): string {
  return utf8Decode(xchacha20poly1305(k, fromBase64(sealed.n)).decrypt(fromBase64(sealed.c)))
}

const isSealed = (x: unknown): x is Sealed => !!x && typeof x === 'object' && (x as Sealed).v === 1 && typeof (x as Sealed).c === 'string'

// ─── Leitura e escrita ───────────────────────────────────────────────────────

let cache: Record<string, unknown> | null = null
let pending: ReturnType<typeof setTimeout> | null = null

function readAll(): Record<string, unknown> {
  if (cache) return cache
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(FILE_NAME)
      return (cache = raw ? JSON.parse(raw) : {})
    }
    const f = new File(Paths.document, FILE_NAME)
    if (!f.exists) return (cache = {})
    const parsed = JSON.parse(f.textSync())
    if (isSealed(parsed)) {
      const k = key()
      // Sem a chave (app reinstalado), o arquivo antigo não abre: começa vazio e o banco traz a conta de volta.
      cache = k ? JSON.parse(open(parsed, k)) : {}
      return cache!
    }
    // Arquivo de antes da criptografia: lê e grava de novo já criptografado.
    cache = parsed as Record<string, unknown>
    scheduleWrite()
    return cache
  } catch {
    return (cache = {})
  }
}

function writeNow() {
  pending = null
  if (!cache) return
  try {
    const raw = JSON.stringify(cache)
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(FILE_NAME, raw)
      return
    }
    const k = key()
    const nonce = k ? randomBytes(24) : null
    const content = k && nonce ? JSON.stringify(seal(raw, k, nonce)) : raw
    const f = new File(Paths.document, FILE_NAME)
    if (!f.exists) f.create()
    f.write(content)
  } catch {
    // sem espaço ou armazenamento bloqueado: o app segue sem guardar
  }
}

/** Junta as gravações de um mesmo instante numa só (criptografar o arquivo inteiro a cada letra digitada pesa). */
function scheduleWrite() {
  if (pending) return
  pending = setTimeout(writeNow, 400)
}

// Antes de o app ir para segundo plano, grava o que falta.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s !== 'active' && pending) {
      clearTimeout(pending)
      writeNow()
    }
  })
}

export function getItem<T>(key: string, fallback: T): T {
  const all = readAll()
  return key in all ? (all[key] as T) : fallback
}

export function setItem(key: string, value: unknown) {
  const all = readAll()
  all[key] = value
  scheduleWrite()
}

/** Só para testes: esquece o que está em memória, como se o app abrisse de novo. */
export function resetStorageCacheForTests() {
  if (pending) clearTimeout(pending)
  pending = null
  cache = null
  cachedKey = undefined
}

/** Só para testes: grava agora. */
export function flushStorageForTests() {
  if (pending) clearTimeout(pending)
  writeNow()
}
