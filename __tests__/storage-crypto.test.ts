import { fromBase64, open, seal, toBase64, utf8Decode, utf8Encode } from '../src/lib/storage'

const key = Uint8Array.from({ length: 32 }, (_, i) => i)
const nonce = Uint8Array.from({ length: 24 }, (_, i) => 100 + i)

test('texto com acento e símbolos volta igual depois de virar bytes', () => {
  const s = 'Oração: "Senhor, guarda minha mãe" ✝ 🙏 — São João 3:16'
  expect(utf8Decode(utf8Encode(s))).toBe(s)
})

test('base64 volta igual, em qualquer tamanho', () => {
  for (const n of [0, 1, 2, 3, 31, 32, 33]) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256)
    expect(Array.from(fromBase64(toBase64(b)))).toEqual(Array.from(b))
  }
})

test('o diário guardado não fica legível no arquivo e abre com a chave certa', () => {
  const raw = JSON.stringify({ prayer: { diary: [{ text: 'Pedi por emprego' }] } })
  const sealed = seal(raw, key, nonce)
  expect(JSON.stringify(sealed)).not.toContain('emprego')
  expect(open(sealed, key)).toBe(raw)
})

test('com outra chave ou com o arquivo alterado, não abre', () => {
  const sealed = seal('{"a":1}', key, nonce)
  const other = Uint8Array.from({ length: 32 }, () => 7)
  expect(() => open(sealed, other)).toThrow()
  const tampered = { ...sealed, c: toBase64(fromBase64(sealed.c).map((x, i) => (i === 0 ? x ^ 1 : x))) }
  expect(() => open(tampered, key)).toThrow()
})

afterAll(() => {
  delete (globalThis as { __secureStore?: unknown }).__secureStore
})

describe('arquivo no celular', () => {
  const disk: Record<string, string> = {}
  const keychain: Record<string, string> = {}
  beforeEach(() => {
    ;(globalThis as { __secureStore?: Record<string, string> }).__secureStore = keychain
    for (const k of Object.keys(disk)) delete disk[k]
    for (const k of Object.keys(keychain)) delete keychain[k]
  })
  // O módulo pede o expo-crypto na hora de gravar, então o teste roda dentro do mesmo registro de módulos.
  function withApp(fn: (m: typeof import('../src/lib/storage')) => void) {
    jest.isolateModules(() => {
      jest.doMock('expo-file-system', () => ({
        Paths: { document: '/doc' },
        File: class {
          name: string
          constructor(_dir: string, name: string) {
            this.name = name
          }
          get exists() {
            return this.name in disk
          }
          create() {
            disk[this.name] = ''
          }
          textSync() {
            return disk[this.name]
          }
          write(s: string) {
            disk[this.name] = s
          }
        },
      }))
      jest.doMock('expo-crypto', () => ({ getRandomBytes: (n: number) => Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256)) }))
      fn(require('../src/lib/storage'))
    })
  }

  test('grava criptografado e lê de novo depois de abrir o app', () => {
    withApp((a) => {
      a.setItem('prayer', { diary: ['Agradeci pela família'] })
      a.flushStorageForTests()
    })
    expect(disk['app-estado.json']).not.toContain('família')
    expect(keychain['app-estado-chave']).toBeTruthy()
    withApp((b) => expect(b.getItem('prayer', null)).toEqual({ diary: ['Agradeci pela família'] }))
  })

  test('arquivo antigo, sem criptografia, é lido e gravado de novo criptografado', () => {
    disk['app-estado.json'] = JSON.stringify({ notes: ['nota antiga'] })
    withApp((a) => {
      expect(a.getItem('notes', [])).toEqual(['nota antiga'])
      a.flushStorageForTests()
    })
    expect(disk['app-estado.json']).not.toContain('nota antiga')
  })

  test('sem a chave (app reinstalado), o arquivo antigo não abre e o app começa vazio', () => {
    withApp((a) => {
      a.setItem('x', 'segredo')
      a.flushStorageForTests()
    })
    delete keychain['app-estado-chave']
    withApp((b) => expect(b.getItem('x', 'vazio')).toBe('vazio'))
  })
})
