import appConfig from '../app.config'

const base = { name: 'App Cristão', slug: 'app-cristao', android: { package: 'com.bauxtech.appcristao' } }

test('sem a variável do EAS, o app compila sem o arquivo do Firebase', () => {
  delete process.env.GOOGLE_SERVICES_JSON
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.appcristao' })
})

test('com a variável do EAS, o arquivo do Firebase entra no Android', () => {
  process.env.GOOGLE_SERVICES_JSON = '/tmp/google-services.json'
  expect(appConfig({ config: base } as never).android).toEqual({ package: 'com.bauxtech.appcristao', googleServicesFile: '/tmp/google-services.json' })
  delete process.env.GOOGLE_SERVICES_JSON
})
