import { fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { Button, Chip, IconButton, ListRow, Switch, Tag, TopBar } from '../src/components'
import { ThemeProvider } from '../src/theme/ThemeProvider'

function renderThemed(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

function minSize(el: { props: { style?: unknown } }) {
  const style = el.props.style
  const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style as Record<string, number>)
  return flat as Record<string, number>
}

test('botão tem nome, função e área de toque de 48', async () => {
  const onPress = jest.fn()
  await renderThemed(<Button label="Ler capítulo" onPress={onPress} />)
  const btn = screen.getByRole('button', { name: 'Ler capítulo' })
  await fireEvent.press(btn)
  expect(onPress).toHaveBeenCalled()
  expect(minSize(btn).minHeight).toBeGreaterThanOrEqual(48)
})

test('botão desativado anuncia o estado e não responde', async () => {
  const onPress = jest.fn()
  await renderThemed(<Button label="Salvar" onPress={onPress} disabled />)
  const btn = screen.getByRole('button', { name: 'Salvar' })
  expect(btn).toBeDisabled()
  await fireEvent.press(btn)
  expect(onPress).not.toHaveBeenCalled()
})

test('chave anuncia ligada e desligada', async () => {
  const onChange = jest.fn()
  const { rerender } = await renderThemed(<Switch label="Compartilhar com a célula" value={false} onChange={onChange} />)
  const sw = screen.getByRole('switch', { name: 'Compartilhar com a célula' })
  expect(sw).not.toBeChecked()
  await fireEvent.press(sw)
  expect(onChange).toHaveBeenCalledWith(true)
  await rerender(
    <ThemeProvider>
      <Switch label="Compartilhar com a célula" value onChange={onChange} />
    </ThemeProvider>,
  )
  expect(screen.getByRole('switch', { name: 'Compartilhar com a célula' })).toBeChecked()
})

test('opção selecionada anuncia o estado', async () => {
  await renderThemed(<Chip label="Gratidão" selected onPress={() => {}} />)
  expect(screen.getByRole('button', { name: 'Gratidão' })).toBeSelected()
})

test('botão só com ícone tem nome falado, incluindo o número do selo', async () => {
  await renderThemed(<IconButton icon="bell" label="Avisos" badge={3} onPress={() => {}} />)
  expect(screen.getByRole('button', { name: 'Avisos, 3 novas' })).toBeTruthy()
})

test('linha de lista junta rótulo e descrição no nome falado', async () => {
  const onPress = jest.fn()
  await renderThemed(<ListRow label="Reunião da célula" sub="Quarta, 20h" onPress={onPress} />)
  await fireEvent.press(screen.getByRole('button', { name: 'Reunião da célula, Quarta, 20h' }))
  expect(onPress).toHaveBeenCalled()
})

test('barra de topo tem título como cabeçalho e botão voltar', async () => {
  const onBack = jest.fn()
  await renderThemed(<TopBar title="Configurações" onBack={onBack} />)
  expect(screen.getByRole('header', { name: 'Configurações' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }))
  expect(onBack).toHaveBeenCalled()
})

test('etiqueta mostra o texto', async () => {
  await renderThemed(<Tag label="Inativo" tone="neutral" />)
  expect(screen.getByText('Inativo')).toBeTruthy()
})
