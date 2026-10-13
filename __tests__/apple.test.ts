import { APPLE_READY, appleName, signInWithApple } from '../src/lib/apple'

test('sem servidor ou fora do iPhone, o botão não aparece e o login não acontece', async () => {
  expect(APPLE_READY).toBe(false)
  expect(await signInWithApple()).toBe('failed')
})

test('nome da Apple: junta nome e sobrenome e ignora o que veio vazio', () => {
  expect(appleName({ givenName: 'Ana', familyName: 'Souza' } as never)).toBe('Ana Souza')
  expect(appleName({ givenName: 'Ana', familyName: null } as never)).toBe('Ana')
  expect(appleName({ givenName: null, familyName: null } as never)).toBeNull()
  expect(appleName(null)).toBeNull()
})
