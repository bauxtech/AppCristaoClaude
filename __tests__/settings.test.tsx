import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Text } from 'react-native'
import { sampleCell } from '../src/features/cell/data'
import type { CellRole } from '../src/features/cell/permissions'
import { CellPrayersScreen } from '../src/features/cell/screens/GroupScreens'
import { NotesScreen } from '../src/features/profile/screens/ProfileScreens'
import { groupNotices, noticeTime, sampleNotices } from '../src/features/settings/notices'
import { hourLabel, inQuietHours, readingTimeFrom } from '../src/features/settings/prefs'
import { AccountDeletedScreen, BlockScreen, DataSummaryScreen, DeleteAccountScreen, isValidEmail, MyDataScreen, ReportScreen, RevokeConsentScreen, SignOutScreen } from '../src/features/settings/screens/AccountScreens'
import { NoticesScreen, NotificationSettingsScreen, SetTimeScreen } from '../src/features/settings/screens/NoticeScreens'
import { AccountScreen, AppearanceScreen, maskPhone, PrivacyScreen } from '../src/features/settings/screens/SettingsScreens'
import { useTheme } from '../src/theme/ThemeProvider'
import { renderApp } from '../test-utils/render'

beforeEach(() => {
  jest.mocked(router.push).mockClear()
  jest.mocked(router.back).mockClear()
  jest.mocked(router.replace).mockClear()
})

function withCell(role: CellRole) {
  const c = sampleCell(role, 'Teste')
  return { onboarded: true, cellStatus: role === 'lider' ? ('leader' as const) : ('member' as const), cells: { cells: [c], currentId: c.id } }
}

describe('regras de avisos', () => {
  test('silêncio que vira a noite', () => {
    expect(inQuietHours('23:00', '22:00', '07:00')).toBe(true)
    expect(inQuietHours('06:30', '22:00', '07:00')).toBe(true)
    expect(inQuietHours('07:00', '22:00', '07:00')).toBe(false)
    expect(inQuietHours('12:00', '13:00', '15:00')).toBe(false)
    expect(inQuietHours('14:00', '13:00', '15:00')).toBe(true)
  })
  test('horário do primeiro acesso vira horário do lembrete', () => {
    expect(readingTimeFrom('noite')).toBe('20:00')
    expect(readingTimeFrom(null)).toBe('07:00')
    expect(hourLabel('07:30')).toBe('7h30')
    expect(hourLabel('22:00')).toBe('22h')
  })
  test('agrupa em Hoje, Ontem e Anteriores', () => {
    const now = new Date(2026, 9, 3, 15, 0)
    const groups = groupNotices(sampleNotices(now), now)
    expect(groups.map((g) => g.label)).toEqual(['Hoje', 'Ontem', 'Anteriores'])
    expect(noticeTime(new Date(2026, 9, 3, 14, 58).toISOString(), now)).toBe('Agora')
    expect(noticeTime(new Date(2026, 8, 28, 10).toISOString(), now)).toBe('28 set')
  })
})

describe('central de avisos', () => {
  test('conta nova: nenhum aviso', async () => {
    await renderApp(<NoticesScreen />, { onboarded: true, sampleData: false })
    expect(screen.getByText('Nenhum aviso por enquanto')).toBeTruthy()
  })

  test('marca de não lido, marcar todas e Tudo em dia', async () => {
    await renderApp(<NoticesScreen />, { onboarded: true, settings: { notices: sampleNotices() } })
    expect(screen.getByText('Avisos (3)')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Não lidas (3)' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    expect(screen.getByText('Tudo em dia')).toBeTruthy()
  })

  test('cada aviso abre o item dele e pode ser dispensado', async () => {
    await renderApp(<NoticesScreen />, { onboarded: true, settings: { notices: sampleNotices() } })
    await fireEvent.press(screen.getByRole('button', { name: /^Não lido\. Célula\. Encontro da célula hoje/ }))
    expect(router.push).toHaveBeenCalledWith('/celula')
    expect(screen.getByText('Avisos (2)')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar aviso: Plano bíblico' }))
    expect(screen.queryByText('Plano bíblico')).toBeNull()
  })

  test('avisos desligados no celular mostram como ligar', async () => {
    await renderApp(<NoticesScreen />, { onboarded: true })
    expect(await screen.findByText('Avisos desligados no celular')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Permitir avisos' })).toBeTruthy()
  })
})

describe('configurar avisos', () => {
  test('11 tipos com chave e lembrete dentro do silêncio avisado', async () => {
    await renderApp(<NotificationSettingsScreen />, { onboarded: true, settings: {} })
    expect(screen.getAllByRole('switch')).toHaveLength(13)
    const culto = screen.getByRole('switch', { name: 'Culto' })
    expect(culto.props.accessibilityState.checked).toBe(false)
    await fireEvent.press(culto)
    expect(screen.getByRole('switch', { name: 'Culto' }).props.accessibilityState.checked).toBe(true)
  })

  test('escolher horário salva e avisa quando cai no silêncio', async () => {
    await renderApp(<SetTimeScreen which="leitura" />, { onboarded: true })
    // padrão 07:00; descer uma hora cai em 06:00, dentro do silêncio 22h às 7h
    await fireEvent.press(screen.getByRole('button', { name: 'Menos horas' }))
    expect(screen.getByText('Dentro do horário de silêncio')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Mais horas' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Mais horas' }))
    expect(screen.queryByText('Dentro do horário de silêncio')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }))
    expect(router.back).toHaveBeenCalled()
  })
})

describe('configurações', () => {
  test('alto contraste e fonte grande mudam o tema de verdade', async () => {
    function Probe() {
      const t = useTheme()
      return <Text>{`modo ${t.mode} ${t.largeText ? 'grande' : 'normal'}`}</Text>
    }
    await renderApp(
      <>
        <AppearanceScreen />
        <Probe />
      </>,
      { onboarded: true },
    )
    expect(screen.getByText(/modo (light|dark) normal/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('switch', { name: 'Alto contraste' }))
    await fireEvent.press(screen.getByRole('switch', { name: 'Fonte grande' }))
    expect(screen.getByText(/modo highContrast(Light|Dark) grande/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('tab', { name: 'Escuro' }))
    expect(screen.getByText('modo highContrastDark grande')).toBeTruthy()
  })

  test('privacidade atualiza a frase de efeito', async () => {
    await renderApp(<PrivacyScreen />, { onboarded: true })
    expect(screen.getByText('Só você vê quantos livros leu.')).toBeTruthy()
    const groups = screen.getAllByRole('button', { name: 'Minha célula' })
    await fireEvent.press(groups[0])
    expect(screen.getByText('Membros da sua célula veem quantos livros você leu.')).toBeTruthy()
  })

  test('trocar número: código errado e código certo', async () => {
    await renderApp(<AccountScreen />, { onboarded: true })
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar número' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
    expect(screen.getByText('Digite o DDD e o celular com 9 números.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('DDD'), '21')
    await fireEvent.changeText(screen.getByLabelText('Celular'), '988887777')
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }))
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '999999')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText('Código incorreto. Confira e digite de novo.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '123456')
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getAllByText('Número atualizado').length).toBeGreaterThan(0)
    expect(screen.getByText('•••• 7777')).toBeTruthy()
  })

  test('e-mail e telefone mascarado', () => {
    expect(isValidEmail('ana@email.com')).toBe(true)
    expect(isValidEmail('ana@email')).toBe(false)
    expect(maskPhone('+55 (11) 98765-4321')).toBe('•••• 4321')
  })

  test('anotações com trava pedem biometria', async () => {
    await renderApp(<NotesScreen />, { onboarded: true, settings: { notesLock: true } })
    expect(screen.getByText('Anotações protegidas')).toBeTruthy()
    await fireEvent.press(await screen.findByRole('button', { name: 'Usar biometria' }))
    expect(await screen.findByLabelText('Buscar nas anotações')).toBeTruthy()
  })
})

describe('meus dados', () => {
  test('conta nova: nada guardado, com contagens reais', async () => {
    await renderApp(<DataSummaryScreen />, { onboarded: true, sampleData: false, prayer: { requests: [], diary: [] } })
    expect(screen.getByText('Ainda não há nada guardado além do seu nome e telefone.')).toBeTruthy()
    expect(screen.getByLabelText('Pedidos de oração: 0')).toBeTruthy()
  })

  test('baixar dados pede e-mail antes', async () => {
    await renderApp(<MyDataScreen />, { onboarded: true })
    expect(screen.getByText(/Cadastre um e-mail na sua conta/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar e-mail' }))
    expect(router.push).toHaveBeenCalledWith('/configuracoes/conta')
  })

  test('retirar consentimento: o que deixa de funcionar e confirmação', async () => {
    await renderApp(<RevokeConsentScreen />, { onboarded: true })
    expect(screen.getByText('Sugestões personalizadas de leitura')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Retirar' }))
    expect(screen.getByText('Consentimento retirado.')).toBeTruthy()
  })
})

describe('bloquear e denunciar', () => {
  test('bloquear pede confirmação e vai para a lista', async () => {
    await renderApp(<BlockScreen />, withCell('membro'))
    expect(screen.getByText('Ninguém bloqueado.')).toBeTruthy()
    const ana = screen.getAllByRole('button', { name: 'Bloquear' }).find((b) => b.props.accessibilityHint === 'Bloquear Ana Souza')!
    await fireEvent.press(ana)
    expect(screen.getByText('Bloquear Ana Souza?')).toBeTruthy()
    const confirm = screen.getAllByRole('button', { name: 'Bloquear' })
    await fireEvent.press(confirm[0])
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeTruthy()
  })

  test('sem célula: explica', async () => {
    await renderApp(<BlockScreen />, { onboarded: true })
    expect(screen.getByText(/Você ainda não participa de uma célula/)).toBeTruthy()
  })

  test('denúncia precisa de pessoa e motivo', async () => {
    await renderApp(<ReportScreen />, withCell('membro'))
    expect(screen.getByRole('button', { name: 'Denunciar' })).toBeDisabled()
    await fireEvent.press(screen.getByRole('button', { name: 'Carlos Lima' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Spam' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Denunciar' }))
    expect(screen.getByText('Recebemos sua denúncia')).toBeTruthy()
  })

  test('permissão: pedido de quem foi bloqueado some para quem bloqueou', async () => {
    await renderApp(<CellPrayersScreen />, { ...withCell('membro'), settings: { blocked: [{ id: 'u2', name: 'Ana Souza' }] } })
    expect(screen.queryByText(/Saúde da minha mãe/)).toBeNull()
    expect(screen.getByText(/Sabedoria na faculdade/)).toBeTruthy()
  })
})

describe('sair e excluir', () => {
  test('sair da conta volta para Entrar', async () => {
    await renderApp(<SignOutScreen />, { onboarded: true })
    expect(screen.getByText(/A Bíblia offline fica/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }))
    expect(router.replace).toHaveBeenCalledWith('/entrar')
  })

  test('líder com membros precisa passar a liderança antes', async () => {
    await renderApp(<DeleteAccountScreen />, withCell('lider'))
    expect(screen.getByText('Você é líder da célula')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continuar com a exclusão' })).toBeDisabled()
  })

  test('excluir só depois de digitar a frase, com 30 dias e cancelar', async () => {
    await renderApp(<DeleteAccountScreen />, withCell('membro'))
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar com a exclusão' }))
    expect(screen.getByRole('button', { name: 'Excluir conta permanentemente' })).toBeDisabled()
    await fireEvent.changeText(screen.getByLabelText('Frase de confirmação'), 'excluir minha conta')
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta permanentemente' }))
    expect(router.replace).toHaveBeenCalledWith('/configuracoes/exclusao')
  })

  test('conta marcada mostra a data e permite cancelar', async () => {
    const at = new Date(2026, 10, 2).toISOString()
    await renderApp(<AccountDeletedScreen />, { onboarded: true, settings: { deletionAt: at } })
    expect(screen.getByText('Sua conta será excluída em 2 de novembro de 2026 (30 dias).')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar exclusão' }))
    expect(router.replace).toHaveBeenCalledWith('/eu')
  })
})
