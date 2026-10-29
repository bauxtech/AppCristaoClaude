import Purchases from 'react-native-purchases'

// A loja precisa estar ligada (chave do RevenueCat) para purchase() falar com ela.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_teste'
process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_teste'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = require('../src/lib/store') as typeof import('../src/lib/store')

const pkg = { product: { identifier: 'acasa_completo_anual' } }
const mocked = jest.mocked(Purchases)

beforeAll(() => store.configureStore('u1'))
beforeEach(() => {
  jest.clearAllMocks()
  mocked.getOfferings.mockResolvedValue({ current: { availablePackages: [pkg] } } as never)
})

describe('compra na loja', () => {
  test('cancelar volta sem erro', async () => {
    mocked.purchasePackage.mockRejectedValueOnce({ code: '1' })
    expect(await store.purchase('completo', 'annual')).toBe('cancelled')
  })

  test('pagamento pendente não vira erro', async () => {
    mocked.purchasePackage.mockRejectedValueOnce({ code: '20' })
    expect(await store.purchase('completo', 'annual')).toBe('pending')
  })

  test('plano sem pacote na loja avisa que não achou o plano', async () => {
    expect(await store.purchase('lider', 'monthly')).toBe('no_package')
    expect(mocked.purchasePackage).not.toHaveBeenCalled()
  })
})
