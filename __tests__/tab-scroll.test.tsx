import { render } from '@testing-library/react-native'
import { ScrollView } from 'react-native'
import { scrollTabToTop, useTabScrollTop } from '../src/lib/tabScroll'

function Tab({ name }: { name: string }) {
  const ref = useTabScrollTop(name)
  return <ScrollView ref={ref} />
}

test('tocar na aba leva a tela dela para o início', async () => {
  const spy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {})
  await render(<Tab name="celula" />)
  scrollTabToTop('celula')
  expect(spy).toHaveBeenCalledWith({ y: 0, animated: false })
  spy.mockClear()
  // Aba que não registrou rolagem (a Bíblia) não muda nada.
  scrollTabToTop('biblia')
  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})
