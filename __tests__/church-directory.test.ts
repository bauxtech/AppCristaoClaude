import { DIRECTORY_ID, fetchChurch, searchChurches } from '../src/features/church/sync'

const mockRpc = jest.fn()
const mockIn = jest.fn()
const mockEq = jest.fn()
jest.mock('../src/lib/supabase', () => ({
  callFunction: jest.fn(),
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: () => ({ select: () => ({ in: (...a: unknown[]) => mockIn(...a), eq: (...a: unknown[]) => ({ maybeSingle: () => mockEq(...a) }) }) }),
  },
}))

const APP_ID = '7b0f3b8e-5d1a-4c2e-9a77-2f1c3d4e5f60'

beforeEach(() => jest.clearAllMocks())

test('busca junta as igrejas do app e as da lista da Receita', async () => {
  mockRpc.mockResolvedValue({
    data: [
      { id: APP_ID, cnpj: null, name: 'Igreja do Bairro', address: 'Centro, Salvador, BA', neighborhood: 'Centro', city: 'Salvador, BA' },
      { id: null, cnpj: '11111111000111', name: 'Primeira Igreja Batista do Brasil', address: 'Garcia, Salvador, BA', neighborhood: 'Garcia', city: 'Salvador, BA' },
    ],
    error: null,
  })
  mockIn.mockResolvedValue({
    data: [{ id: APP_ID, cnpj: null, name: 'Igreja do Bairro', address: 'Centro, Salvador, BA', neighborhood: 'Centro', city: 'Salvador, BA', created_by: 'x' }],
    error: null,
  })
  const r = await searchChurches('pib salvador', 'u1')
  expect(mockRpc).toHaveBeenCalledWith('search_churches', { p_q: 'pib salvador' })
  expect(r.kind).toBe('ok')
  if (r.kind !== 'ok') return
  expect(r.list.map((c) => [c.id, c.source])).toEqual([
    [APP_ID, 'manual'],
    [`${DIRECTORY_ID}11111111000111`, 'cnpj'],
  ])
  expect(r.list[1].cnpj).toBe('11.111.111/0001-11')
})

test('escolher uma igreja da lista da Receita: ela entra no app e vem com o id de verdade', async () => {
  mockRpc.mockResolvedValue({ data: APP_ID, error: null })
  mockEq.mockResolvedValue({
    data: { id: APP_ID, cnpj: '11111111000111', name: 'Primeira Igreja Batista do Brasil', address: 'Garcia, Salvador, BA', neighborhood: 'Garcia', city: 'Salvador, BA', created_by: null },
    error: null,
  })
  const c = await fetchChurch(`${DIRECTORY_ID}11111111000111`, 'u1')
  expect(mockRpc).toHaveBeenCalledWith('church_from_directory', { p_cnpj: '11111111000111' })
  expect(c?.id).toBe(APP_ID)
})

test('falha do servidor na busca aparece como falha, sem lista', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'x' } })
  expect(await searchChurches('batista', 'u1')).toEqual({ kind: 'failed' })
})
