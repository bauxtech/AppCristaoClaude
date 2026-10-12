import appConfig from '../app.config'

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
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.acasa' })
})
