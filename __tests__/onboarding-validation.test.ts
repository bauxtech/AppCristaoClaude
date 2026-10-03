import { DEMO_CODES, searchChurches } from '../src/features/onboarding/data'
import { checkCode, formatPhoneNumber, isValidPhone, missingConsents, normalizeInvite } from '../src/features/onboarding/validation'

test('celular válido: DDD de 2 dígitos e 9 números começando por 9', () => {
  expect(isValidPhone('11', '98765-4321')).toBe(true)
  expect(isValidPhone('1', '987654321')).toBe(false)
  expect(isValidPhone('11', '87654321')).toBe(false)
  expect(isValidPhone('11', '887654321')).toBe(false)
  expect(isValidPhone('05', '987654321')).toBe(false)
})

test('formata o número enquanto digita', () => {
  expect(formatPhoneNumber('98765')).toBe('98765')
  expect(formatPhoneNumber('987654321')).toBe('98765-4321')
  expect(formatPhoneNumber('9876543210000')).toBe('98765-4321')
})

test('código: certo, errado, expirado, muitas tentativas e incompleto', () => {
  expect(checkCode('123456', DEMO_CODES)).toBe('ok')
  expect(checkCode('654321', DEMO_CODES)).toBe('wrong')
  expect(checkCode('000000', DEMO_CODES)).toBe('expired')
  expect(checkCode('111111', DEMO_CODES)).toBe('tooMany')
  expect(checkCode('123', DEMO_CODES)).toBe('incomplete')
})

test('termos: pede os três aceites, inclusive 18 anos', () => {
  expect(missingConsents({ terms: true, faith: true, adult: true })).toEqual([])
  expect(missingConsents({ terms: true, faith: true, adult: false })).toEqual(['confirmar que tem 18 anos ou mais'])
  expect(missingConsents({ terms: false, faith: false, adult: false })).toHaveLength(3)
})

test('código de convite aceita hífen e minúsculas', () => {
  expect(normalizeInvite('abc-123')).toBe('ABC123')
})

test('busca de igreja por nome, cidade e CNPJ', () => {
  expect(searchChurches('rhema')).toHaveLength(1)
  expect(searchChurches('campinas')).toHaveLength(1)
  expect(searchChurches('12.345')).toHaveLength(1)
  expect(searchChurches('xyz')).toHaveLength(0)
  expect(searchChurches('')).toHaveLength(0)
})
