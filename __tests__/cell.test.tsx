import { fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { sampleCell, type Cell } from '../src/features/cell/data'
import { checkInviteCode, codeFromQr } from '../src/features/cell/join'
import { missedTwoWeeks, nextMeeting, upcomingMeetings } from '../src/features/cell/meetings'
import { can, type CellRole } from '../src/features/cell/permissions'
import { CellHubScreen } from '../src/features/cell/screens/CellHubScreen'
import { BoardScreen } from '../src/features/cell/screens/CommunityScreens'
import { CreateCellScreen } from '../src/features/cell/screens/CreateCellScreen'
import { EditCellScreen } from '../src/features/cell/screens/EditCellScreen'
import { CarpoolScreen, CellPrayersScreen } from '../src/features/cell/screens/GroupScreens'
import { JoinRequestsScreen } from '../src/features/cell/screens/JoinRequestsScreen'
import { JoinScreen } from '../src/features/cell/screens/JoinScreen'
import { AttendanceScreen, MemberDetailScreen, MembersScreen } from '../src/features/cell/screens/PeopleScreens'
import { EditScheduleScreen } from '../src/features/cell/screens/ScheduleScreen'
import { renderApp } from '../test-utils/render'

const params = jest.mocked(useLocalSearchParams)

function asRole(role: CellRole, patch: Partial<Cell> = {}) {
  const c = { ...sampleCell(role, 'Teste'), ...patch }
  return { onboarded: true, cellStatus: role === 'lider' ? ('leader' as const) : ('member' as const), cells: { cells: [c], currentId: c.id } }
}

beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
  jest.mocked(router.replace).mockClear()
})

describe('regras de permissão', () => {
  test('o auxiliar marca presença e edita a escala, mas não edita a célula', () => {
    expect(can('auxiliar', 'markAttendance')).toBe(true)
    expect(can('auxiliar', 'editSchedule')).toBe(true)
    expect(can('auxiliar', 'editCell')).toBe(false)
    expect(can('auxiliar', 'approveJoin')).toBe(false)
  })

  test('o anfitrião não tem permissão a mais que o membro', () => {
    const actions = ['editCell', 'invite', 'approveJoin', 'manageMembers', 'seePhones', 'editPlan', 'markAttendance', 'editSchedule', 'postBoard', 'multiply', 'seePrayers', 'askSwap', 'vote', 'participate'] as const
    for (const a of actions) expect(can('anfitriao', a)).toBe(can('membro', a))
  })

  test('só o líder vê telefones e aprova entradas', () => {
    for (const r of ['auxiliar', 'anfitriao', 'membro', 'visitante'] as const) {
      expect(can(r, 'seePhones')).toBe(false)
      expect(can(r, 'approveJoin')).toBe(false)
    }
    expect(can('lider', 'seePhones')).toBe(true)
  })

  test('visitante não vê pedidos de oração', () => {
    expect(can('visitante', 'seePrayers')).toBe(false)
    expect(can('membro', 'seePrayers')).toBe(true)
  })
})

describe('visitante', () => {
  test('não abre os pedidos da célula', async () => {
    await renderApp(<CellPrayersScreen />, asRole('visitante'))
    expect(screen.getByText('Os pedidos de oração da célula aparecem só para os membros.')).toBeTruthy()
    expect(screen.queryByText(/Saúde da minha mãe/)).toBeNull()
  })

  test('vê reunião, endereço e roteiro, sem os atalhos de membro', async () => {
    await renderApp(<CellHubScreen />, asRole('visitante'))
    expect(screen.getByText('Casa da Maria, Rua das Flores, 42')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver roteiro completo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Pedidos,/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Membros,/ })).toBeNull()
  })

  test('a Home não mostra os pedidos da célula', async () => {
    await renderApp(<HomeScreen />, asRole('visitante'))
    expect(screen.queryByRole('header', { name: 'Pedidos da célula' })).toBeNull()
  })
})

describe('telefone dos membros', () => {
  test('membro não vê telefone e não abre o detalhe', async () => {
    await renderApp(<MembersScreen />, asRole('membro'))
    expect(screen.queryByText(/\(11\)/)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Ana Souza/ })).toBeNull()
  })

  test('membro não abre a tela de detalhe pelo endereço', async () => {
    params.mockReturnValue({ id: 'u2' })
    await renderApp(<MemberDetailScreen />, asRole('membro'))
    expect(screen.queryByText(/\(11\) 99222/)).toBeNull()
    expect(screen.getByText('Você não tem acesso a esta parte da célula.')).toBeTruthy()
  })

  test('o líder vê o telefone e o aviso de quem faltou', async () => {
    params.mockReturnValue({ id: 'u2' })
    await renderApp(<MemberDetailScreen />, asRole('lider'))
    expect(screen.getByText('(11) 99222-3333')).toBeTruthy()
    expect(screen.getByText('Ana faltou nas últimas 2 semanas. Considere entrar em contato.')).toBeTruthy()
  })
})

describe('auxiliar', () => {
  test('marca presença', async () => {
    await renderApp(<AttendanceScreen />, asRole('auxiliar'))
    expect(screen.getByRole('button', { name: 'Salvar presença' })).toBeTruthy()
  })

  test('não edita a célula', async () => {
    await renderApp(<EditCellScreen />, asRole('auxiliar'))
    expect(screen.getByText('Só o líder edita a célula.')).toBeTruthy()
  })

  test('edita a escala, e quem é inativo não aparece para escolher', async () => {
    await renderApp(<EditScheduleScreen />, asRole('auxiliar'))
    await fireEvent.press(screen.getAllByRole('button', { name: 'Trocar' })[0])
    expect(screen.getByRole('button', { name: 'Maria Santos' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pedro Costa' })).toBeNull()
    expect(screen.getByText(/Pedro Costa está inativo/)).toBeTruthy()
  })
})

describe('membro comum', () => {
  test('não marca presença', async () => {
    await renderApp(<AttendanceScreen />, asRole('membro'))
    expect(screen.getByText('Só o líder e o auxiliar marcam presença.')).toBeTruthy()
  })
})

describe('entrada na célula', () => {
  test('códigos', () => {
    expect(checkInviteCode('ABC123')).toBe('ok')
    expect(checkInviteCode('000000')).toBe('expired')
    expect(checkInviteCode('ZZZ999')).toBe('invalid')
    expect(codeFromQr('appcristao://celula/entrar?codigo=abc123')).toBe('ABC123')
  })

  test('código inválido avisa e código certo segue para confirmar', async () => {
    await renderApp(<JoinScreen />, { onboarded: true })
    const field = screen.getByLabelText('Código da célula')
    await fireEvent.changeText(field, 'zzz999')
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Código não encontrado. Confira com o líder.')).toBeTruthy()
    await fireEvent.changeText(field, '000000')
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Este código venceu. Peça um novo ao líder.')).toBeTruthy()
    await fireEvent.changeText(field, 'abc-123')
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/celula/confirmar', params: { codigo: 'ABC123' } })
  })

  test('o líder aprova cada entrada', async () => {
    await renderApp(
      <>
        <JoinRequestsScreen />
        <MembersScreen />
      </>,
      asRole('lider'),
    )
    expect(screen.queryByRole('button', { name: /^Fernanda Reis/ })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Aprovar' }))
    expect(screen.getByText('Nenhum pedido de entrada.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Fernanda Reis, Membro/ })).toBeTruthy()
  })
})

describe('criar e editar', () => {
  test('criar sem nome e sem dia mostra o que falta', async () => {
    await renderApp(<CreateCellScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Criar célula' }))
    expect(screen.getByText('Falta preencher o nome e o dia da semana.')).toBeTruthy()
    expect(router.replace).not.toHaveBeenCalled()
    await fireEvent.changeText(screen.getByLabelText('Nome da célula (obrigatório)'), 'Célula do bairro')
    await fireEvent.press(screen.getByRole('button', { name: 'Qua' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Criar e convidar pessoas' }))
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/celula/convidar', params: { nova: '1' } })
  })

  test('mudar o dia pede confirmação e avisa todos', async () => {
    await renderApp(<EditCellScreen />, asRole('lider'))
    await fireEvent.press(screen.getByRole('button', { name: 'Qui' }))
    expect(screen.getByText('Mudar dia, horário ou endereço avisa todas as pessoas da célula.')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('header', { name: 'Mudar dia, horário ou local?' })).toBeTruthy()
  })
})

describe('carona', () => {
  test('o WhatsApp só aparece depois que o pedido é aceito', async () => {
    await renderApp(<CarpoolScreen />, asRole('membro'))
    expect(screen.getByRole('button', { name: 'Conversar com Paula no WhatsApp' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Conversar com João no WhatsApp' })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Pedir carona' }))
    expect(screen.getByText('Aguardando resposta')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Conversar com João no WhatsApp' })).toBeNull()
  })
})

describe('denúncia', () => {
  test('o pedido denunciado some na hora para quem denunciou', async () => {
    await renderApp(<CellPrayersScreen />, asRole('membro'))
    expect(screen.getByText('Saúde da minha mãe, ela está internada')).toBeTruthy()
    const buttons = screen.getAllByRole('button', { name: 'Denunciar' })
    await fireEvent.press(buttons[1])
    expect(screen.queryByText('Saúde da minha mãe, ela está internada')).toBeNull()
  })
})

describe('mural', () => {
  test('votar na enquete marca a opção e conta o voto', async () => {
    await renderApp(<BoardScreen />, asRole('membro'))
    await fireEvent.press(screen.getByRole('radio', { name: /^19h,/ }))
    expect(screen.getByRole('radio', { name: /^19h, 42 por cento, 5 votos/ })).toBeChecked()
    expect(screen.getByText('12 votos · Você votou')).toBeTruthy()
  })

  test('membro não publica aviso', async () => {
    await renderApp(<BoardScreen />, asRole('membro'))
    expect(screen.queryByLabelText('Novo aviso')).toBeNull()
  })
})

describe('reuniões', () => {
  test('a próxima reunião de quarta, vista no sábado 3 de outubro, é dia 7', () => {
    const cell = { day: 3, time: '20:00', cancelledDates: [], extraMeetings: [] }
    expect(upcomingMeetings(cell, new Date(2026, 9, 3, 10)).map((m) => m.date)).toEqual(['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'])
  })

  test('reunião cancelada pula para a seguinte', () => {
    const cell = { day: 3, time: '20:00', cancelledDates: ['2026-10-07'], extraMeetings: [] }
    expect(nextMeeting(cell, new Date(2026, 9, 3))?.date).toBe('2026-10-14')
  })

  test('faltou duas semanas seguidas', () => {
    expect(missedTwoWeeks([true, true, false, false])).toBe(true)
    expect(missedTwoWeeks([false, true, false])).toBe(false)
  })
})
