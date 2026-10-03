import { act, fireEvent, screen } from '@testing-library/react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { sampleCell } from '../src/features/cell/data'
import { MONTHLY_LIMIT, sampleSermons, searchSermons, usedThisMonth, type Sermon } from '../src/features/sermon/data'
import { BeforeScreen } from '../src/features/sermon/screens/BeforeScreen'
import { SermonListScreen } from '../src/features/sermon/screens/ListScreen'
import { ResultScreen } from '../src/features/sermon/screens/ResultScreen'
import { TrimScreen } from '../src/features/sermon/screens/TrimScreen'
import { useSermons } from '../src/features/sermon/SermonContext'
import { renderApp } from '../test-utils/render'
import { useEffect } from 'react'

const params = jest.mocked(useLocalSearchParams)
const samples = sampleSermons()

beforeEach(() => {
  params.mockReturnValue({})
  jest.mocked(router.push).mockClear()
  jest.mocked(router.replace).mockClear()
})

function monthFull(): Sermon[] {
  const today = new Date().toISOString().slice(0, 10)
  return Array.from({ length: MONTHLY_LIMIT }, (_, i) => ({ ...samples[0], id: `x${i}`, createdAt: today }))
}

describe('regras do culto', () => {
  test('conta os cultos do mês', () => {
    expect(usedThisMonth(monthFull())).toBe(5)
    expect(usedThisMonth([{ ...samples[0], createdAt: '2020-01-01' }])).toBe(0)
  })

  test('busca devolve o trecho, sem reticências', () => {
    const r = searchSermons(samples, 'perdão')
    expect(r.map((x) => x.sermon.id)).toEqual(['s3'])
    expect(r[0].snippet).not.toMatch(/…|\.\.\./)
  })
})

describe('lista de cultos', () => {
  test('conta nova mostra o estado vazio e o limite do mês', async () => {
    await renderApp(<SermonListScreen />, { onboarded: true, sampleData: false })
    expect(screen.getByText('Nenhum culto gravado ainda. Grave o próximo culto para ver o texto e o resumo aqui.')).toBeTruthy()
    expect(screen.getAllByText('0 de 5 cultos usados neste mês').length).toBeGreaterThan(0)
  })

  test('com 5 cultos no mês, gravar e importar ficam bloqueados', async () => {
    await renderApp(<SermonListScreen />, { onboarded: true, sermons: monthFull() })
    expect(screen.getByRole('button', { name: 'Gravar culto' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Importar áudio' })).toBeDisabled()
    expect(screen.getByText('Limite atingido')).toBeTruthy()
  })
})

describe('antes de gravar', () => {
  test('o padrão é guardar só o texto, e explica o microfone antes de pedir', async () => {
    await renderApp(<BeforeScreen />, { onboarded: true })
    expect(screen.getByRole('switch', { name: 'Guardar o áudio por 30 dias' })).not.toBeChecked()
    expect(screen.getByText(/fica só o texto/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Começar a gravar' }))
    expect(await screen.findByRole('header', { name: 'O app precisa do microfone' })).toBeTruthy()
  })
})

function WithDraft({ children }: { children: React.ReactNode }) {
  const { setDraft, draft } = useSermons()
  useEffect(() => {
    setDraft({ uri: null, durationSec: 3000, notes: [], moments: [{ ts: 600, label: 'Momento marcado' }], keepAudio: false, source: 'gravado', church: 'Igreja Teste' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return draft ? <>{children}</> : null
}

describe('ajustar e processar', () => {
  test('ajustar início e transcrever cria o culto e abre o resultado', async () => {
    jest.useFakeTimers()
    await renderApp(
      <WithDraft>
        <TrimScreen />
      </WithDraft>,
      { onboarded: true },
    )
    await fireEvent.press(screen.getByRole('button', { name: 'Início: avançar 1 minuto' }))
    expect(screen.getByLabelText('Início em 01:00')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Transcrever' }))
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/culto/[id]', params: { id: expect.any(String) } })
    jest.useRealTimers()
  })
})

describe('resultado', () => {
  test('processando mostra que pode sair do app', async () => {
    params.mockReturnValue({ id: 'p1' })
    await renderApp(<ResultScreen />, { onboarded: true, sermons: [{ ...samples[0], id: 'p1', status: 'processing' }] })
    expect(screen.getByText('Pode sair do app. Avisamos quando ficar pronto.')).toBeTruthy()
  })

  test('falhou mostra tentar de novo', async () => {
    params.mockReturnValue({ id: 'f1' })
    await renderApp(<ResultScreen />, { onboarded: true, sermons: [{ ...samples[0], id: 'f1', status: 'failed' }] })
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  test('versículo citado abre a Bíblia', async () => {
    params.mockReturnValue({ id: 's1' })
    await renderApp(<ResultScreen />, { onboarded: true, sermons: samples })
    await fireEvent.press(screen.getByRole('button', { name: 'Filipenses 4:13' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: 'filipenses', capitulo: '4', v: '13' } })
  })

  test('só o líder transforma em roteiro da célula', async () => {
    params.mockReturnValue({ id: 's1' })
    const member = sampleCell('membro', 'T')
    await renderApp(<ResultScreen />, { onboarded: true, sermons: samples, cellStatus: 'member', cells: { cells: [member], currentId: member.id } })
    expect(screen.queryByRole('button', { name: 'Transformar em roteiro da célula' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar resumo para a célula' })).toBeTruthy()
  })

  test('líder transforma em roteiro e vai editar', async () => {
    params.mockReturnValue({ id: 's1' })
    const leader = sampleCell('lider', 'T')
    await renderApp(<ResultScreen />, { onboarded: true, sermons: samples, cellStatus: 'leader', cells: { cells: [leader], currentId: leader.id } })
    await fireEvent.press(screen.getByRole('button', { name: 'Transformar em roteiro da célula' }))
    expect(router.push).toHaveBeenCalledWith('/celula/roteiro-editar')
  })

  test('aba de notas mostra o que a pessoa anotou', async () => {
    params.mockReturnValue({ id: 's1' })
    await renderApp(<ResultScreen />, { onboarded: true, sermons: samples })
    await fireEvent.press(screen.getByRole('tab', { name: 'Notas' }))
    expect(screen.getByText('O propósito não é encontrado, é revelado por Deus.')).toBeTruthy()
  })

  test('sem áudio guardado, diz que ficou só o texto', async () => {
    params.mockReturnValue({ id: 's1' })
    await renderApp(<ResultScreen />, { onboarded: true, sermons: samples })
    expect(screen.getByText('Só o texto foi guardado.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ouvir gravação' })).toBeNull()
  })

  test('áudio guardado mostra a data em que será apagado', async () => {
    params.mockReturnValue({ id: 'a1' })
    await act(async () => {
      await renderApp(<ResultScreen />, { onboarded: true, sermons: [{ ...samples[0], id: 'a1', audioUri: 'file:///a.m4a', audioExpiresAt: '2099-11-02', keepAudio: true }] })
    })
    expect(screen.getByText('Áudio guardado até 02/11/2099. O texto fica para sempre.')).toBeTruthy()
  })
})
