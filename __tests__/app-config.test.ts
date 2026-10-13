import appConfig, { googleIosUrlScheme } from '../app.config'

/* eslint-disable @typescript-eslint/no-require-imports */
const { mkdtempSync, writeFileSync } = require('fs') as { mkdtempSync(p: string): string; writeFileSync(p: string, d: string): void }
const { tmpdir } = require('os') as { tmpdir(): string }
const { join } = require('path') as { join(...p: string[]): string }

const base = { name: 'acasa', slug: 'app-cristao', android: { package: 'com.bauxtech.acasa' } }
const dir = mkdtempSync(join(tmpdir(), 'gs-'))
const file = (pkg: string) => {
  const f = join(dir, `${pkg}.json`)
  writeFileSync(f, JSON.stringify({ client: [{ client_info: { android_client_info: { package_name: pkg } } }] }))
  return f
}

afterEach(() => delete process.env.GOOGLE_SERVICES_JSON)

test('sem a variável do EAS, o app compila sem o arquivo do Firebase', () => {
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.acasa' })
})

test('com o arquivo do Firebase do acasa, ele entra no Android', () => {
  process.env.GOOGLE_SERVICES_JSON = file('com.bauxtech.acasa')
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.acasa', googleServicesFile: process.env.GOOGLE_SERVICES_JSON })
})

test('arquivo do Firebase do identificador antigo fica de fora, para o build não falhar', () => {
  process.env.GOOGLE_SERVICES_JSON = file('com.bauxtech.appcristao')
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.acasa' })
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('com.bauxtech.acasa'))
  warn.mockRestore()
})

describe('Google no iPhone', () => {
  afterEach(() => delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)

  test('o endereço de volta é o ID do cliente iOS ao contrário', () => {
    expect(googleIosUrlScheme('123-abc.apps.googleusercontent.com')).toBe('com.googleusercontent.apps.123-abc')
    expect(googleIosUrlScheme(' 123-abc.apps.googleusercontent.com ')).toBe('com.googleusercontent.apps.123-abc')
    expect(googleIosUrlScheme('qualquer coisa')).toBeNull()
    expect(googleIosUrlScheme(undefined)).toBeNull()
  })

  test('sem o ID do cliente iOS, o plugin do Google não entra (ele quebraria o build)', () => {
    const c = appConfig({ config: { ...base, plugins: ['expo-router'] } } as never)
    expect(c.plugins).toEqual(['expo-router'])
  })

  test('com o ID do cliente iOS, o plugin entra com o endereço de volta', () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '123-abc.apps.googleusercontent.com'
    const c = appConfig({ config: { ...base, plugins: ['expo-router'] } } as never)
    expect(c.plugins).toEqual(['expo-router', ['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.123-abc' }]])
  })
})
