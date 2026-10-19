import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { sampleCell, type Cell } from '../src/features/cell/data'
import type { CellRole } from '../src/features/cell/permissions'
import { CellHubScreen } from '../src/features/cell/screens/CellHubScreen'
import { BoardScreen } from '../src/features/cell/screens/CommunityScreens'
import { CellPrayersScreen } from '../src/features/cell/screens/GroupScreens'
import { JoinRequestsScreen } from '../src/features/cell/screens/JoinRequestsScreen'
import { MemberDetailScreen, MembersScreen } from '../src/features/cell/screens/PeopleScreens'
import { ScheduleScreen } from '../src/features/cell/screens/ScheduleScreen'
import { CoursesScreen } from '../src/features/church/screens/CourseScreens'
import { accessFromServer } from '../src/features/subscription/plan'
import { renderApp } from '../test-utils/render'

let mockSeatless = false
const mockSetSeat = jest.fn(async () => 'ok' as const)

jest.mock('../src/features/subscription/SubscriptionContext', () => {
  const actual = jest.requireActual('../src/features/subscription/SubscriptionContext')
  return { ...actual, useSubscription: () => ({ ...actual.useSubscription(), cellSeatless: () => mockSeatless }) }
})
jest.mock('../src/features/cell/sync', () => ({ ...jest.requireActual('../src/features/cell/sync'), setMemberSeatRemote: (...a: unknown[]) => mockSetSeat(...(a as [])) }))

const params = jest.mocked(useLocalSearchParams)

function asRole(role: CellRole, patch: Partial<Cell> = {}) {
  const c = { ...sampleCell(role, 'Teste'), ...patch }
  return { onboarded: true, cellStatus: role === 'lider' ? ('leader' as const) : ('member' as const), cells: { cells: [c], currentId: c.id } }
}

beforeEach(() => {
  mockSeatless = false
  mockSetSeat.mockClear()
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
})

describe('membro sem vaga', () => {
  test('vê a reunião, confirma presença e entende por que está sem vaga', async () => {
    mockSeatless = true
    await renderApp(<CellHubScreen />, asRole('membro'))
    expect(screen.getByText('Você está sem vaga nesta célula')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Vou' })).toBeTruthy()
  })

  test('pedidos, escala e mural aparecem com cadeado e o texto combinado', async () => {
    mockSeatless = true
    await renderApp(<CellHubScreen />, asRole('membro'))
    for (const label of ['Pedidos', 'Minha escala', 'Mural', 'Carona', 'Materiais', 'Playlist', 'Plano de leitura']) {
      expect(screen.getByRole('button', { name: `${label}. Bloqueado. Peça uma vaga ao líder ou assine o plano Essencial` })).toBeTruthy()
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Pedidos. Bloqueado. Peça uma vaga ao líder ou assine o plano Essencial' }))
    expect(router.push).toHaveBeenCalledWith('/assinatura?plano=essencial&origem=celula-vaga')
  })

  test.each([
    ['pedidos', CellPrayersScreen],
    ['mural', BoardScreen],
    ['escala', ScheduleScreen],
  ] as const)('aberto por um link, %s mostra o cadeado', async (_name, Screen) => {
    mockSeatless = true
    await renderApp(<Screen />, asRole('membro'))
    expect(screen.getByText('Peça uma vaga ao líder ou assine o plano Essencial.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver plano Essencial' })).toBeTruthy()
  })

  test('com vaga, as mesmas telas abrem normalmente', async () => {
    await renderApp(<CellHubScreen />, asRole('membro'))
    expect(screen.queryByText('Você está sem vaga nesta célula')).toBeNull()
    expect(screen.queryByRole('button', { name: /Bloqueado/ })).toBeNull()
  })
})

describe('líder e as vagas', () => {
  function leaderCell() {
    const c = sampleCell('lider', 'Teste')
    return {
      seats: { total: 20, left: 0 },
      members: c.members.map((m) => (m.id === 'u4' ? { ...m, seat: 'none' as const, active: false } : m.id === 'u5' ? { ...m, seat: 'seat' as const } : m.id === 'u3' ? { ...m, seat: 'plan' as const } : m)),
    }
  }

  test('na lista, vê quantas vagas estão em uso e quem está sem vaga', async () => {
    await renderApp(<MembersScreen />, asRole('lider', leaderCell()))
    expect(screen.getByText('Vagas sem plano: 20 de 20 em uso')).toBeTruthy()
    expect(screen.getByText('Sem vaga')).toBeTruthy()
    expect(screen.getByText('Com vaga')).toBeTruthy()
  })

  test('tira a vaga de quem tem', async () => {
    params.mockReturnValue({ id: 'u5' })
    await renderApp(<MemberDetailScreen />, asRole('lider', leaderCell()))
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar vaga' }))
    expect(mockSetSeat).toHaveBeenCalledWith('c-central', 'u5', false)
  })

  test('sem vaga livre, o botão de dar vaga fica desligado e explica como trocar', async () => {
    params.mockReturnValue({ id: 'u4' })
    await renderApp(<MemberDetailScreen />, asRole('lider', leaderCell()))
    expect(screen.getByText(/todas estão em uso/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dar vaga' }).props.accessibilityState?.disabled).toBe(true)
  })

  test('com vaga livre, dá a vaga', async () => {
    params.mockReturnValue({ id: 'u4' })
    await renderApp(<MemberDetailScreen />, asRole('lider', { ...leaderCell(), seats: { total: 20, left: 1 } }))
    await fireEvent.press(screen.getByRole('button', { name: 'Dar vaga' }))
    expect(mockSetSeat).toHaveBeenCalledWith('c-central', 'u4', true)
  })

  test('quem tem plano próprio não usa vaga', async () => {
    params.mockReturnValue({ id: 'u3' })
    await renderApp(<MemberDetailScreen />, asRole('lider', leaderCell()))
    expect(screen.getByText('Maria tem plano próprio e não usa vaga.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Dar vaga' })).toBeNull()
  })

  test('aprova como visitante', async () => {
    await renderApp(<JoinRequestsScreen />, asRole('lider'))
    await fireEvent.press(screen.getByRole('button', { name: 'Aprovar como visitante' }))
    expect(await screen.findByText('Fernanda Reis entrou como visitante')).toBeTruthy()
  })
})

describe('curso pela foto', () => {
  test('no Essencial, o botão aparece com cadeado e "No plano Completo"', async () => {
    await renderApp(<CoursesScreen />, { onboarded: true, subscription: { trialStart: new Date(Date.now() - 30 * 86400_000).toISOString(), introSeen: true, plan: { id: 'essencial', billing: 'monthly', status: 'active', renewsAt: new Date(Date.now() + 86400_000).toISOString() } } })
    expect(screen.getByRole('button', { name: /Curso pela foto do cronograma\. Bloqueado\. No plano Completo/ })).toBeTruthy()
  })

  test('o servidor manda a vaga de cada célula', () => {
    const a = accessFromServer({ plan: 'free', cells: { c1: { active: true, can_use: false, seat: 'none' }, c2: { active: true, can_use: true, seat: 'xyz' } } })
    expect(a.cells.c1).toEqual({ active: true, canUse: false, seat: 'none' })
    expect(a.cells.c2.seat).toBeNull()
  })
})
