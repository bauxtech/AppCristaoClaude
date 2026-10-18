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
    await expect(leaveContact('ABC123', 'Maria', '11987654321')).resolves.toMatchObject({ address: expect.stringContaining('exemplo') })
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

    await user.click(screen.getByRole('checkbox', { name: /Aceito que/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar e ver o endereço' }))
    expect(await screen.findByText(/Endereço de exemplo/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Quero participar' })).not.toBeInTheDocument()
  })

  test('pedido de oração vai para o líder e mostra confirmação', async () => {
    const user = userEvent.setup()
    render(<CellPage code="ABC123" />)
    const section = (await screen.findByRole('heading', { name: 'Deixar um pedido de oração' })).closest('section')!
    await user.type(within(section).getByLabelText('Seu pedido'), 'Pela minha família')
    await user.click(within(section).getByRole('button', { name: 'Enviar pedido' }))
    expect(within(section).getByRole('alert')).toHaveTextContent('Marque que autoriza enviar o pedido para João.')
    await user.click(within(section).getByRole('checkbox'))
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

describe('endereço do convite', () => {
  test('lê o nome de /celulas/<nome>/ e o código dos links antigos /c/<código>/', async () => {
    const { keyFromPath } = await import('../lib/api')
    expect(keyFromPath('/celulas/jovens-da-central/')).toBe('jovens-da-central')
    expect(keyFromPath('/celulas/Jovens-Da-Central')).toBe('jovens-da-central')
    expect(keyFromPath('/celulas/_/')).toBeNull()
    expect(keyFromPath('/c/ABC123/')).toBe('c:ABC123')
    expect(keyFromPath('/c/abc123')).toBe('c:ABC123')
    expect(keyFromPath('/c/_/')).toBeNull()
    expect(keyFromPath('/')).toBeNull()
    expect(keyFromPath('/c/ABC123/outra')).toBeNull()
    expect(keyFromPath('/celulas/viva/outra')).toBeNull()
  })
})

describe('endereço próprio, logo e denúncia', () => {
  test('a página abre pelo nome escolhido pelo líder', async () => {
    render(<CellPage code="jovens-da-central" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Jovens da Central' })).toBeInTheDocument()
  })

  test('nome que não existe mostra que o convite não vale', async () => {
    render(<CellPage code="nao-existe" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este convite não vale mais' })).toBeInTheDocument()
  })

  test('denúncia vai sem login e mostra a confirmação', async () => {
    const user = userEvent.setup()
    render(<CellPage code="jovens-da-central" />)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'Denunciar esta página' }))
    await user.click(screen.getByRole('radio', { name: 'O nome ou o endereço da página é impróprio' }))
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Denúncia enviada para a equipe do acasa')
  })
})

describe('revisão de 18/10', () => {
  test('endereço malformado ou fora do formato não trava nem vira código', async () => {
    const { keyFromPath } = await import('../lib/api')
    expect(keyFromPath('/celulas/%E0%A4%A/')).toBeNull()
    expect(keyFromPath('/celulas/c%3A781B3E')).toBeNull()
    expect(keyFromPath('/celulas/ab')).toBeNull()
    expect(keyFromPath('/c/%E0%A4%A/')).toBeNull()
  })

  test('célula parada não aparece como arquivada', async () => {
    render(<CellPage code="celula-parada" />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Célula Parada está com as reuniões paradas' })).toBeInTheDocument()
    expect(screen.queryByText(/arquivada/)).not.toBeInTheDocument()
  })
})

describe('célula sem bairro', () => {
  test('não mostra "Bairro" vazio nem vírgula solta', async () => {
    const { getPublicCell } = await import('../lib/api')
    const base = await getPublicCell('jovens-da-central')
    const { ActiveCellForTest } = await import('../components/CellPage')
    render(<ActiveCellForTest cell={{ ...base!, neighborhood: '', city: '', churchName: null }} />)
    expect(screen.getByText('O endereço aparece quando você deixa seu nome e telefone.')).toBeInTheDocument()
    expect(screen.queryByText(/^Bairro/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^,/)).not.toBeInTheDocument()
  })
})

