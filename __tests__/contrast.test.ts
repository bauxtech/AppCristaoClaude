import { palettes, type Palette, type ThemeMode } from '../src/theme/colors'
import { contrastRatio } from '../src/theme/contrast'
import { COVER_TONES } from '../src/components/Cover'

// Regra do projeto: texto 4,5 para 1; bordas e ícones 3 para 1. Vale para todos os modos.

type Pair = [keyof Palette, keyof Palette, number]

const TEXT = 4.5
const NON_TEXT = 3

const pairs: Pair[] = [
  ['text', 'bg', TEXT],
  ['text', 'card', TEXT],
  ['text', 'primarySoft', TEXT],
  ['textSecondary', 'bg', TEXT],
  ['textSecondary', 'card', TEXT],
  ['textSecondary', 'primarySoft', TEXT],
  ['primary', 'bg', TEXT],
  ['primary', 'card', TEXT],
  ['primary', 'primarySoft', TEXT],
  ['primaryText', 'primary', TEXT],
  ['accent', 'card', TEXT],
  ['accent', 'primarySoft', TEXT],
  ['accentText', 'accent', TEXT],
  ['danger', 'card', TEXT],
  ['danger', 'bg', TEXT],
  ['danger', 'dangerSoft', TEXT],
  ['dangerText', 'danger', TEXT],
  ['lineStrong', 'bg', NON_TEXT],
  ['lineStrong', 'card', NON_TEXT],
]

describe.each(Object.keys(palettes) as ThemeMode[])('contraste no modo %s', (mode) => {
  const p = palettes[mode]
  test.each(pairs)('%s sobre %s', (fg, bg, min) => {
    expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(min)
  })

  test.each(COVER_TONES)('texto da capa: fundo %s com texto %s', (bg, fg) => {
    expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(TEXT)
  })

  test('texto branco do aviso sobre a superfície escura', () => {
    expect(contrastRatio('#FFFFFF', p.darkSurface)).toBeGreaterThanOrEqual(TEXT)
  })
})

test('a calculadora de contraste confere com valores conhecidos', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
})
