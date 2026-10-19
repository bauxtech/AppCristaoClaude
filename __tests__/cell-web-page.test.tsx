import { act, fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { sampleCell, type Cell } from '../src/features/cell/data'
import { CreateCellScreen } from '../src/features/cell/screens/CreateCellScreen'
import { OptionsScreen } from '../src/features/cell/screens/OptionsScreen'
import { WebPageScreen } from '../src/features/cell/screens/WebPageScreen'
import { cleanSlugInput, codeUrl, publicUrl, slugFormatOk, slugify, webUrl } from '../src/features/cell/webPage'
import { renderApp } from '../test-utils/render'

function asLeader(patch: Partial<Cell> = {}) {
  const c = { ...sampleCell('lider', 'Teste'), ...patch }
  return { onboarded: true, cellStatus: 'leader' as const, cells: { cells: [c], currentId: c.id } }
}

beforeEach(() => jest.mocked(router.replace).mockClear())

describe('endereço da página', () => {
  test('o nome da célula vira a sugestão de endereço', () => {
    expect(slugify('Célula dos Jovens!')).toBe('celula-dos-jovens')
    expect(slugify('  São João  ')).toBe('sao-joao')
    expect(slugify('a'.repeat(40))).toHaveLength(30)
  })

  test('enquanto digita, fica só o que o endereço aceita', () => {
    expect(cleanSlugInput('Minha Célula')).toBe('minha-celula')
    expect(cleanSlugInput('ABC_123!')).toBe('abc123')
  })

  test('formato: de 3 a 30, sem hífen nas pontas nem dois seguidos', () => {
    expect(slugFormatOk('viva')).toBe(true)
    expect(slugFormatOk('ab')).toBe(false)
    expect(slugFormatOk('a'.repeat(31))).toBe(false)
    expect(slugFormatOk('-viva')).toBe(false)
    expect(slugFormatOk('viva-')).toBe(false)
    expect(slugFormatOk('vi--va')).toBe(false)
  })

  test('o link fica no domínio do acasa', () => {
    expect(webUrl('celula-viva')).toBe('https://www.acasa.app.br/celulas/celula-viva')
  })

  test('sem endereço próprio, o link público é o do código de convite', () => {
    expect(codeUrl('AB12CD')).toBe('https://www.acasa.app.br/c/AB12CD')
    expect(publicUrl({ webSlug: null, code: 'AB12CD' })).toBe('https://www.acasa.app.br/c/AB12CD')
    expect(publicUrl({ webSlug: 'celula-viva', code: 'AB12CD' })).toBe('https://www.acasa.app.br/celulas/celula-viva')
  })
})

describe('criar célula com endereço', () => {
  test('o endereço segue o nome até o líder mexer', async () => {
    await renderApp(<CreateCellScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Nome da célula (obrigatório)'), 'Célula do Bairro')
    expect(screen.getByLabelText('Endereço da página').props.value).toBe('celula-do-bairro')
    await fireEvent.changeText(screen.getByLabelText('Endereço da página'), 'bairro-sul')
    await fireEvent.changeText(screen.getByLabelText('Nome da célula (obrigatório)'), 'Outro nome')
    expect(screen.getByLabelText('Endereço da página').props.value).toBe('bairro-sul')
  })

  test('endereço que não vale impede criar e explica', async () => {
    await renderApp(<CreateCellScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Nome da célula (obrigatório)'), 'Célula do Bairro')
    await fireEvent.changeText(screen.getByLabelText('Endereço da página'), 'ab')
    await fireEvent.press(screen.getByRole('button', { name: 'Qua' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Criar e convidar pessoas' }))
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.getAllByText(/Use de 3 a 30 letras/).length).toBeGreaterThan(0)
  })

  test('endereço em branco: cria e escolhe depois', async () => {
    await renderApp(<CreateCellScreen />, { onboarded: true })
    await fireEvent.changeText(screen.getByLabelText('Nome da célula (obrigatório)'), 'Célula do Bairro')
    await fireEvent.changeText(screen.getByLabelText('Endereço da página'), '')
    await fireEvent.press(screen.getByRole('button', { name: 'Qua' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Criar e convidar pessoas' }))
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/celula/convidar', params: { nova: '1' } })
  })
})

describe('página na internet', () => {
  test('o líder vê o link e pode copiar e compartilhar', async () => {
    await renderApp(<WebPageScreen />, asLeader({ webSlug: 'celula-viva' }))
    expect(screen.getByText('www.acasa.app.br/celulas/celula-viva')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy()
    expect(screen.getByText('Se trocar, o endereço antigo leva para o novo por 30 dias.')).toBeTruthy()
  })

  test('troca o endereço depois de conferir que está livre', async () => {
    jest.useFakeTimers()
    await renderApp(<WebPageScreen />, asLeader({ webSlug: 'celula-viva' }))
    expect(screen.getByRole('button', { name: 'Salvar endereço' }).props.accessibilityState?.disabled).toBe(true)
    await fireEvent.changeText(screen.getByLabelText('Endereço da página'), 'viva-moema')
    await act(async () => {
      jest.advanceTimersByTime(600)
    })
    jest.useRealTimers()
    expect(await screen.findByText('Endereço livre')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar endereço' }))
    expect(await screen.findByText('www.acasa.app.br/celulas/viva-moema')).toBeTruthy()
  })

  test('célula sem endereço próprio já tem link, pelo código de convite', async () => {
    await renderApp(<WebPageScreen />, asLeader({ webSlug: null, code: 'AB12CD' }))
    expect(screen.getByText('www.acasa.app.br/c/AB12CD')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeTruthy()
  })

  test('o líder escolhe capa e logo, com prévia do topo da página', async () => {
    await renderApp(<WebPageScreen />, asLeader({ webSlug: 'celula-viva' }))
    expect(screen.getByText('Capa e logo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Escolher capa' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Escolher logo' })).toBeTruthy()
    expect(screen.getByLabelText('Prévia do topo da página: sem capa e sem logo')).toBeTruthy()
  })

  test('capa tirada pela equipe: o líder é avisado', async () => {
    await renderApp(<WebPageScreen />, asLeader({ webCoverHidden: true }))
    expect(screen.getByText(/A equipe do acasa tirou a capa/)).toBeTruthy()
  })

  test('logo tirado pela equipe: o líder é avisado', async () => {
    await renderApp(<WebPageScreen />, asLeader({ logoHidden: true }))
    expect(screen.getByText(/A equipe do acasa tirou o logo/)).toBeTruthy()
  })

  test('o líder escreve o texto sobre a célula e esconde o horário', async () => {
    await renderApp(<WebPageScreen />, asLeader({ webSlug: 'celula-viva' }))
    expect(screen.getByRole('button', { name: 'Salvar texto' }).props.accessibilityState?.disabled).toBe(true)
    await fireEvent.changeText(screen.getByLabelText('Texto da página'), 'Jovens que se encontram em casa')
    expect(screen.getByText(/31 de 300 letras/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar texto' }))
    expect(await screen.findByText('Texto da página salvo')).toBeTruthy()
    const sw = screen.getByRole('switch', { name: 'Mostrar dia e horário na página' })
    expect(sw.props.accessibilityState?.checked).toBe(true)
    await fireEvent.press(sw)
    expect(screen.getByRole('switch', { name: 'Mostrar dia e horário na página' }).props.accessibilityState?.checked).toBe(false)
  })

  test('só o líder abre a página na internet', async () => {
    const c = sampleCell('membro', 'Teste')
    await renderApp(<WebPageScreen />, { onboarded: true, cellStatus: 'member', cells: { cells: [c], currentId: c.id } })
    expect(screen.queryByLabelText('Endereço da página')).toBeNull()
  })

  test('nas opções, o líder acha a página na internet', async () => {
    await renderApp(<OptionsScreen />, asLeader({ webSlug: 'celula-viva' }))
    await fireEvent.press(screen.getByRole('button', { name: /Página na internet/ }))
    expect(router.push).toHaveBeenCalledWith('/celula/pagina')
  })
})
