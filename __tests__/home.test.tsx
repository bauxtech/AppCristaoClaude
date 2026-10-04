import { fireEvent, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { HomeScreen } from '../src/features/home/HomeScreen'
import { renderApp } from '../test-utils/render'

function renderHome() {
  return renderApp(<HomeScreen />, { onboarded: true })
}

test('mostra as seções da Home do protótipo', async () => {
  await renderHome()
  for (const t of ['Passagem do dia', 'Reflexão de hoje', 'Momentos de oração', 'Planos de leitura', 'Música do dia']) {
    expect(screen.getByRole('header', { name: t })).toBeTruthy()
  }
})

test('mostra o total de dias, sem sequência', async () => {
  await renderHome()
  expect(screen.getByRole('button', { name: '48 dias com leitura ou oração' })).toBeTruthy()
  expect(screen.queryByText(/seguidos/)).toBeNull()
})

test('Momentos de oração: a primeira é a de hoje e Ver todos abre o painel', async () => {
  const { themeOfDay } = require('../src/features/home/HomeSections')
  await renderHome()
  const today = themeOfDay()
  expect(screen.getByRole('button', { name: new RegExp(`^Momento de oração ${today.label}, oração de hoje`) })).toBeTruthy()
  await fireEvent.press(screen.getAllByRole('button', { name: 'Ver todos' }).find((b) => b.props.accessibilityHint === 'Abre o painel de oração')!)
  expect(router.push).toHaveBeenCalledWith('/oracao')
})

test('Planos de leitura: Meus planos mostra o dia e Em destaque a duração', async () => {
  await renderHome()
  expect(screen.getByRole('button', { name: /^Plano Novo Testamento em 90 dias, dia \d+ de 90$/ })).toBeTruthy()
  await fireEvent.press(screen.getByRole('tab', { name: 'Em destaque' }))
  expect(screen.getByRole('button', { name: 'Plano Bíblia em 1 ano, 365 dias' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Plano Bíblia em 1 ano, 365 dias' }))
  expect(router.push).toHaveBeenCalledWith('/biblia/plano/biblia-1-ano')
})

test('Ler capítulo abre a Bíblia', async () => {
  await renderHome()
  await fireEvent.press(screen.getByRole('button', { name: 'Ler capítulo' }))
  expect(router.push).toHaveBeenCalledWith({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: 'salmos', capitulo: '23', v: '1' } })
})

test('quem ainda não tem célula nem igreja vê os atalhos para começar', async () => {
  await renderHome()
  expect(screen.getByRole('button', { name: /Criar ou entrar numa célula/ })).toBeTruthy()
  expect(screen.queryByRole('header', { name: 'Pedidos da célula' })).toBeNull()
})

test('Música do dia tem Spotify e YouTube', async () => {
  await renderHome()
  expect(screen.getByRole('button', { name: 'Spotify' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'YouTube' })).toBeTruthy()
})

test('escolher um humor marca a opção e mostra o atalho para o chat', async () => {
  await renderHome()
  await fireEvent.press(screen.getByRole('button', { name: 'Ansiedade' }))
  expect(screen.getByRole('button', { name: 'Ansiedade' })).toBeSelected()
  expect(screen.getByRole('button', { name: 'Perguntar sobre ansiedade na Bíblia' })).toBeTruthy()
})

test('não usa emoji em nenhum texto', async () => {
  await renderHome()
  const emoji = /\p{Extended_Pictographic}/u
  const texts = screen.getAllByText(/./).map((n) => [n.props.children].flat().join(''))
  expect(texts.filter((t) => emoji.test(t))).toEqual([])
})
