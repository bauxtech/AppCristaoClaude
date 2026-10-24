import { fireEvent, screen } from '@testing-library/react-native'
import { sampleCell } from '../src/features/cell/data'
import { mergeDraft, refLabel, SAMPLE_DRAFT } from '../src/features/cell/planAi'
import { EditPlanScreen } from '../src/features/cell/screens/PlanScreens'
import { renderApp } from '../test-utils/render'

const Sub = require('../src/features/subscription/SubscriptionContext')
const real = Sub.useSubscription
afterEach(() => jest.restoreAllMocks())

let n = 0
const id = () => `t${n++}`

function leaderWith(plan: ReturnType<typeof sampleCell>['plan'], over: Partial<ReturnType<typeof sampleCell>> = {}) {
  const c = { ...sampleCell('lider', 'Teste'), plan, planTitle: '', planRef: '', ...over }
  return { onboarded: true, cellStatus: 'leader' as const, cells: { cells: [c], currentId: c.id } }
}

describe('roteiro com IA: juntar o rascunho', () => {
  test('referência por extenso, com os versículos seguidos juntos', () => {
    expect(refLabel(['joao:15:1', 'joao:15:2', 'joao:15:3', 'joao:15:5'])).toBe('João 15:1-3, 5')
    expect(refLabel(['salmos:23:1', 'joao:15:5'])).toBe('Salmos 23:1; João 15:5')
    expect(refLabel(['livro-que-nao-existe:1:1'])).toBe('')
  })

  test('sem seções, monta a reunião inteira', () => {
    const m = mergeDraft([], SAMPLE_DRAFT, 'João 15:4-5', id)
    expect(m.sections.map((s) => s.title)).toEqual(['Quebra-gelo', 'Louvor', 'Palavra', 'Perguntas para reflexão', 'Oração', 'Avisos'])
    expect(m.sections[2].content.startsWith('Leitura: João 15:4-5')).toBe(true)
    expect(m.sections[3].content).toContain('1. ')
    expect(m.sections[4].content).toContain('Pedidos do grupo.')
  })

  test('não troca o que o líder escreveu: só preenche as seções vazias', () => {
    const sections = [
      { id: 'a', title: 'Quebra-gelo', content: 'Meu quebra-gelo', minutes: 10 },
      { id: 'b', title: 'Palavra', content: 'Tema: Permanecer', minutes: 20 },
      { id: 'c', title: 'Perguntas para reflexão', content: '', minutes: 10 },
      { id: 'd', title: 'Louvor', content: '', minutes: 15 },
    ]
    const m = mergeDraft(sections, SAMPLE_DRAFT, '', id)
    expect(m.sections[0].content).toBe('Meu quebra-gelo')
    expect(m.sections[1].content.startsWith('Tema: Permanecer\n\n')).toBe(true)
    expect(m.sections[2].content).toContain(SAMPLE_DRAFT.questions[0])
    expect(m.sections[3].content).toBe('')
    expect(m.filled).toBe(2)
  })
})

describe('roteiro com IA: tela', () => {
  test('líder com o plano monta o roteiro pelo tema', async () => {
    await renderApp(<EditPlanScreen />, leaderWith([]))
    await fireEvent.press(screen.getByRole('button', { name: 'Um tema' }))
    await fireEvent.changeText(screen.getByLabelText('Tema da reunião'), 'Permanecer')
    await fireEvent.press(screen.getByRole('button', { name: 'Montar com IA' }))
    expect(await screen.findByDisplayValue(SAMPLE_DRAFT.icebreaker)).toBeTruthy()
    expect(screen.getByDisplayValue('João 15:4-5')).toBeTruthy()
    expect(screen.getByText('Rascunho pronto. Leia, ajuste o que quiser e toque em Salvar roteiro.')).toBeTruthy()
  })

  test('sem o plano Líder, o botão mostra o cadeado e a estrutura sem IA continua', async () => {
    jest.spyOn(Sub, 'useSubscription').mockImplementation(() => ({ ...real(), can: (f: string) => f !== 'cell_lead' }))
    await renderApp(<EditPlanScreen />, leaderWith([]))
    await fireEvent.press(screen.getByRole('button', { name: 'Um tema' }))
    expect(screen.queryByRole('button', { name: 'Montar com IA' })).toBeNull()
    expect(screen.getByText('Montar com IA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Montar roteiro' })).toBeTruthy()
  })

  test('roteiro começado: completar com IA preenche só o que falta', async () => {
    const plan = [
      { id: 'a', title: 'Quebra-gelo', content: 'Meu quebra-gelo', minutes: 10 },
      { id: 'b', title: 'Perguntas para reflexão', content: '', minutes: 10 },
    ]
    await renderApp(<EditPlanScreen />, leaderWith(plan, { planTitle: 'Permanecer' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Completar com IA' }))
    expect(await screen.findByDisplayValue(new RegExp(SAMPLE_DRAFT.questions[0].replace(/\?/g, '\\?')))).toBeTruthy()
    expect(screen.getByDisplayValue('Meu quebra-gelo')).toBeTruthy()
  })
})
