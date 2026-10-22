import { fireEvent, screen } from '@testing-library/react-native'
import { usePathname } from 'expo-router'
import { TabTour, resetTours, toursSeen } from '../src/features/tour/TabTour'
import { TOURS, tabFromPath } from '../src/features/tour/tours'
import { renderApp } from '../test-utils/render'

const path = usePathname as jest.Mock

beforeEach(() => {
  resetTours()
  path.mockReturnValue('/')
})

test('na primeira vez na aba, mostra os passos e termina com Entendi', async () => {
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

test('Pular fecha e não mostra de novo naquela aba', async () => {
  path.mockReturnValue('/celula')
  await renderApp(<TabTour hidden={false} bottom={64} />, { onboarded: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Pular' }))
  expect(screen.queryByText(/Passo/)).toBeNull()
  expect(toursSeen()).toEqual(['celula'])
})

test('espera o aviso do teste grátis e não aparece em telas internas', async () => {
  await renderApp(<TabTour hidden bottom={64} />, { onboarded: true })
  expect(screen.queryByText(/Passo/)).toBeNull()
  expect(tabFromPath('/celula/pedidos')).toBeNull()
  expect(tabFromPath('/biblia')).toBe('biblia')
})
