import { GOOGLE_READY, signInWithGoogle } from '../src/lib/google'

test('sem servidor ou sem o ID do Google, o botão não aparece e o login não acontece', async () => {
  expect(GOOGLE_READY).toBe(false)
  expect(await signInWithGoogle()).toBe('failed')
})
