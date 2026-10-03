import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { CellPage } from '../components/CellPage'
import { getPublicCell, leaveContact } from '../lib/api'
import { maskPhone } from '../lib/format'

describe('dados públicos', () => {
  test('não incluem endereço completo, membros nem telefones', async () => {
    const cell = await getPublicCell('abc-123')
    const json = JSON.stringify(cell)
    expect(json).not.toContain('Rua das Flores')
    expect(json).not.toContain('Portão azul')
    expect(json).not.toMatch(/\d{10,11}/)
    expect(cell).not.toHaveProperty('members')
    expect(cell).not.toHaveProperty('_address')
  })

  test('endereço só depois de nome e telefone válidos', async () => {
    await expect(leaveContact('ABC123', 'A', '11999999999')).rejects.toThrow()
    await expect(leaveContact('ABC123', 'Maria', '123')).rejects.toThrow()
    await expect(leaveContact('ABC123', 'Maria', '11987654321')).resolves.toMatchObject({ address: 'Casa da Maria, Rua das Flores, 42' })
  })

  test('célula arquivada não recebe contato', async () => {
    await expect(leaveContact('ARQ001', 'Maria', '11987654321')).rejects.toThrow()
  })

  test('máscara do telefone', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
  })
})

describe('página da célula', () => {
  test('mostra o bairro e esconde o endereço até deixar contato', async () => {
    const user = userEvent.setup()
    render(<CellPage code="ABC123" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Jovens da Central' })).toBeInTheDocument()
    expect(screen.queryByText(/Rua das Flores/)).not.toBeInTheDocument()
    expect(screen.getByText(/Bairro Pinheiros/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enviar e ver o endereço' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite seu nome.')

    await user.type(screen.getByLabelText('Nome'), 'Maria Teste')
    await user.type(screen.getByLabelText(/Telefone com DDD/), '11987654321')
    await user.click(screen.getByRole('button', { name: 'Enviar e ver o endereço' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Marque que aceita')

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Enviar e ver o endereço' }))
    expect(await screen.findByText('Casa da Maria, Rua das Flores, 42')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Quero participar' })).not.toBeInTheDocument()
  })

  test('pedido de oração vai para o líder e mostra confirmação', async () => {
    const user = userEvent.setup()
    render(<CellPage code="ABC123" />)
    const section = (await screen.findByRole('heading', { name: 'Deixar um pedido de oração' })).closest('section')!
    await user.type(within(section).getByLabelText('Seu pedido'), 'Pela minha família')
    await user.click(within(section).getByRole('button', { name: 'Enviar pedido' }))
    expect(await screen.findByRole('heading', { name: 'Pedido enviado' })).toBeInTheDocument()
    expect(screen.queryByText('Pela minha família')).not.toBeInTheDocument()
  })

  test('sem roteiro e sem materiais', async () => {
    render(<CellPage code="NOVA01" />)
    expect(await screen.findByText('O líder ainda não publicou o roteiro desta semana.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum material publicado.')).toBeInTheDocument()
  })

  test('link inválido', async () => {
    render(<CellPage code="ZZZ999" />)
    expect(await screen.findByRole('heading', { name: 'Este convite não vale mais' })).toBeInTheDocument()
  })

  test('célula arquivada', async () => {
    render(<CellPage code="ARQ001" />)
    expect(await screen.findByRole('heading', { name: 'Casais em Missão não está mais se reunindo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Quero participar' })).not.toBeInTheDocument()
  })

  test('todo campo tem rótulo', async () => {
    const { container } = render(<CellPage code="ABC123" />)
    await screen.findByRole('heading', { level: 1 })
    for (const el of container.querySelectorAll('input, textarea')) {
      expect(el.closest('label')).not.toBeNull()
    }
  })
})
