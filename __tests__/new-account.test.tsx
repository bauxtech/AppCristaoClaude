import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { CATALOG, planState, readingLabel, readingsForDay, totalChapters } from '../src/features/bible/plans'
import { CreatePlanScreen } from '../src/features/bible/screens/CreatePlanScreen'
import { PlansScreen } from '../src/features/bible/screens/PlansScreen'
import { BooksScreen } from '../src/features/bible/screens/BooksScreen'
import { upcomingCommitments } from '../src/features/home/commitments'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { PrayerHomeScreen } from '../src/features/prayer/screens/PrayerHomeScreen'
import { CellHubScreen } from '../src/features/cell/screens/CellHubScreen'
import { sampleCell } from '../src/features/cell/data'
import { DIRECTORY, sampleCourses } from '../src/features/church/data'
import { renderApp } from '../test-utils/render'

const fresh = { onboarded: true, sampleData: false }

describe('conta nova', () => {
  test('Home sem dias, sem plano e sem compromissos', async () => {
    await renderApp(<HomeScreen />, fresh)
    expect(screen.getByRole('button', { name: '0 dias com leitura ou oração' })).toBeTruthy()
    // Meus planos vazio: linha de escolher plano. Momentos de oração aparecem também para conta nova.
    expect(screen.getByRole('button', { name: /^Escolher um plano de leitura/ })).toBeTruthy()
    expect(screen.getByRole('header', { name: 'Momentos de oração' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Criar ou entrar numa célula/ })).toBeTruthy()
  })

  test('Bíblia sem livros lidos', async () => {
    await renderApp(<BooksScreen />, fresh)
    expect(screen.getByLabelText('0 de 66 livros concluídos')).toBeTruthy()
  })

  test('planos: nenhum começado, catálogo e criar', async () => {
    await renderApp(<PlansScreen />, fresh)
    expect(screen.getByText('Você ainda não começou nenhum plano. Escolha um abaixo ou crie o seu.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar meu plano' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Plano Bíblia em 1 ano, 365 dias' })).toBeTruthy()
  })

  test('oração sem pedidos e sem campanha em andamento', async () => {
    await renderApp(<PrayerHomeScreen />, { ...fresh, prayer: { diary: [], requests: [], campaigns: [] } })
    expect(screen.getByRole('button', { name: 'Pedidos, 0 ativos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Campanhas de oração, jejum e propósito' })).toBeTruthy()
  })

  test('célula vazia oferece entrar e criar', async () => {
    await renderApp(<CellHubScreen />, fresh)
    expect(screen.getByRole('button', { name: 'Entrar com convite' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar uma célula' })).toBeTruthy()
  })
})

describe('planos de leitura', () => {
  test('todo plano do catálogo cobre todos os capítulos, sem repetir', () => {
    for (const p of CATALOG) {
      const seen: string[] = []
      for (let d = 1; d <= p.total; d++) for (const r of readingsForDay(p, d)) for (let c = r.from; c <= r.to; c++) seen.push(`${r.book}:${c}`)
      expect(seen.length).toBe(totalChapters(p.books))
      expect(new Set(seen).size).toBe(seen.length)
    }
  })

  test('texto da leitura', () => {
    expect(readingLabel([{ book: 'Romanos', from: 1, to: 4 }])).toBe('Romanos 1 a 4')
    expect(readingLabel([{ book: 'Salmos', from: 150, to: 150 }, { book: 'Provérbios', from: 1, to: 2 }])).toBe('Salmos 150 e Provérbios 1 e 2')
  })

  test('atraso conta os dias desde o início menos os dias lidos', () => {
    const now = new Date(2026, 9, 10)
    const s = planState(CATALOG[0], { startedAt: '2026-10-01', doneDays: [1, 2, 3, 4, 5] }, now)
    expect(s).toMatchObject({ day: 6, done: 5, behind: 4, status: 'behind' })
  })

  test('criar meu plano com os Evangelhos em 20 dias', async () => {
    await renderApp(<CreatePlanScreen />, fresh)
    expect(screen.getByRole('button', { name: 'Criar plano' })).toBeDisabled()
    await fireEvent.press(screen.getByRole('button', { name: 'Evangelhos' }))
    expect(screen.getByText('4 livros, 89 capítulos')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Dias'), '20')
    expect(screen.getByText('20 dias, cerca de 4 capítulos por dia')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Criar plano' }))
    expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/biblia\/plano\/[0-9a-f-]{36}$/))
  })
})

describe('compromissos da Home', () => {
  test('vazios sem célula, igreja, cursos e ministérios', () => {
    expect(upcomingCommitments({ cell: null, church: null, courses: [], ministries: [] })).toEqual([])
  })

  test('vêm da célula, da igreja e dos cursos, em ordem de data', () => {
    const now = new Date(2026, 9, 3, 10)
    const list = upcomingCommitments({ cell: sampleCell('membro', 'Teste'), church: DIRECTORY[0], courses: sampleCourses(now), ministries: [] }, now)
    expect(list.map((c) => c.title)).toEqual(['Culto', 'Reunião da célula', 'Aula do Curso de batismo'])
    expect(list[0].when).toBe('Amanhã, 9h')
    expect(list[1].when).toBe('Quarta, 20h')
  })
})
