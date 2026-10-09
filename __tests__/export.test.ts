import { downloadMyData, exportFileName } from '../src/lib/export'

test('nome do arquivo com a data', () => {
  expect(exportFileName(new Date(2026, 9, 9))).toBe('meus-dados-2026-10-09.json')
})

test('sem login, não pede nada ao servidor', async () => {
  expect(await downloadMyData()).toBe('no_login')
})
