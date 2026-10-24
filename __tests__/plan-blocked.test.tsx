import { act, fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Text } from 'react-native'
import { useCell } from '../src/features/cell/CellContext'
import { sampleCell } from '../src/features/cell/data'
import { CellGuard } from '../src/features/cell/screens/Guard'
import { PlanBlockedSheet } from '../src/features/subscription/PlanBlocked'
import { renderApp } from '../test-utils/render'

const Sub = require('../src/features/subscription/SubscriptionContext')
const real = Sub.useSubscription

function pausedCell() {
  const c = sampleCell('lider', 'Teste')
  jest.spyOn(Sub, 'useSubscription').mockImplementation(() => ({ ...real(), cellActive: () => false }))
  return { onboarded: true, cellStatus: 'leader' as const, cells: { cells: [c], currentId: c.id } }
}

afterEach(() => jest.restoreAllMocks())

test('célula parada: telas de edição explicam e oferecem o plano Líder, sem abrir o formulário', async () => {
  await renderApp(
    <CellGuard title="Presença" action="markAttendance">
      {() => <Text>Formulário</Text>}
    </CellGuard>,
    pausedCell(),
  )
  expect(screen.queryByText('Formulário')).toBeNull()
  expect(screen.getByRole('header', { name: 'Célula parada' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Ver plano Líder' }))
  expect(router.push).toHaveBeenCalledWith('/assinatura?plano=lider&origem=celula-parada')
})

test('célula parada: leitura continua aberta', async () => {
  await renderApp(
    <CellGuard title="Membros" action="participate">
      {() => <Text>Lista</Text>}
    </CellGuard>,
    pausedCell(),
  )
  expect(screen.getByText('Lista')).toBeTruthy()
})

test('célula parada: qualquer mudança vira aviso com a oferta, não erro', async () => {
  let update: ReturnType<typeof useCell>['update'] = () => {}
  function Probe() {
    update = useCell().update
    return <PlanBlockedSheet />
  }
  await renderApp(<Probe />, pausedCell())
  await act(async () => update((c) => ({ ...c, name: 'Outro nome' })))
  expect(screen.getByRole('header', { name: 'Célula parada' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ver plano Líder' })).toBeTruthy()
})

test('recusa do servidor por acesso vira aviso; erro de rede não', () => {
  const { isAccessRefusal } = require('../src/lib/sync')
  const { refusedBlock } = require('../src/features/subscription/PlanBlocked')
  expect(isAccessRefusal({ error: { code: '42501', message: 'new row violates row-level security policy' }, status: 403 })).toBe(true)
  expect(isAccessRefusal({ error: { message: 'new row violates row-level security policy' }, status: 400 })).toBe(true)
  expect(isAccessRefusal({ error: { message: 'Network request failed' }, status: 0 })).toBe(false)
  expect(isAccessRefusal({ error: null, status: 200 })).toBe(false)
  expect(refusedBlock('cells').plan).toBe('lider')
  expect(refusedBlock('sermons').plan).toBe('completo')
  expect(refusedBlock('prayer_diary')).toMatchObject({ title: 'Não foi salvo', plan: 'essencial' })
})
