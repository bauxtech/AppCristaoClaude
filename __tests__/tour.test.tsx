import { fireEvent, screen } from '@testing-library/react-native'
import { usePathname } from 'expo-router'
import { setItem } from '../src/lib/storage'
import { ELIGIBLE_KEY, TabTour, toursSeen } from '../src/features/tour/TabTour'
import { CELL_TOURS, TOURS, cellVariant, isNewAccount, tabFromPath } from '../src/features/tour/tours'
import { renderApp } from '../test-utils/render'

const path = usePathname as jest.Mock

beforeEach(() => {
  setItem('toursSeen', [])
  setItem(ELIGIBLE_KEY, true)
  path.mockReturnValue('/')
})

test('conta nova: mostra os passos da aba e termina com Entendi', async () => {
  await renderApp(<TabTour hidden={false} bottom={64} />, { onboarded: true })
  expect(screen.getByText('Passo 1 de 3')).toBeTruthy()
  expect(screen.getByRole('header', { name: TOURS.index[0].title })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Próximo' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('header', { name: TOURS.index[2].title })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Entendi' }))
  expect(screen.queryByText(/Passo/)).toBeNull()
  expect(toursSeen()).toEqual(['index'])
})

test('quem já usava o app antes do passo a passo não vê', async () => {
  setItem(ELIGIBLE_KEY, null)
  await renderApp(<TabTour hidden={false} bottom={64} />, { onboarded: true })
  expect(screen.queryByText(/Passo/)).toBeNull()
})

test('conta com mais de uma semana não vê, mesmo depois de entrar de novo', () => {
  const now = new Date('2026-10-22T12:00:00Z')
  expect(isNewAccount(null, now)).toBe(true)
  expect(isNewAccount('2026-10-20T12:00:00Z', now)).toBe(true)
  expect(isNewAccount('2026-10-10T12:00:00Z', now)).toBe(false)
})

test('Pular fecha e não mostra de novo naquela aba', async () => {
  path.mockReturnValue('/biblia')
  await renderApp(<TabTour hidden={false} bottom={64} />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Pular' }))
  expect(screen.queryByText(/Passo/)).toBeNull()
  expect(toursSeen()).toEqual(['biblia'])
})

test('Célula: passo a passo diferente para quem não tem célula, membro, líder e líder sem o plano', () => {
  const base = { hasCell: false, pending: false, isLeader: false, leadPlan: false, cellActive: true }
  expect(cellVariant(base)).toBe('sem')
  expect(cellVariant({ ...base, leadPlan: true })).toBe('semLider')
  expect(cellVariant({ ...base, pending: true })).toBeNull()
  expect(cellVariant({ ...base, hasCell: true })).toBe('membro')
  expect(cellVariant({ ...base, hasCell: true, isLeader: true, leadPlan: true })).toBe('lider')
  expect(cellVariant({ ...base, hasCell: true, isLeader: true, cellActive: false })).toBe('liderParada')
  expect(CELL_TOURS.lider.map((s) => s.title)).toContain('Site da célula')
  expect(CELL_TOURS.sem.map((s) => s.title)).toContain('Como entrar')
})

test('espera o aviso do teste grátis e não aparece em telas internas', async () => {
  await renderApp(<TabTour hidden bottom={64} />, { onboarded: true })
  expect(screen.queryByText(/Passo/)).toBeNull()
  expect(tabFromPath('/celula/pedidos')).toBeNull()
  expect(tabFromPath('/biblia')).toBe('biblia')
})
