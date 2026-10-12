// Paleta da marca acasa (12/10): verde principal #254C3A, verde claro #A9BBA7, off-white #F6F4EE, areia #E8DCC9, carvão #1F1F1F.
// O claro usa os valores da marca. Escuro e alto contraste foram derivados dela.
// Todo texto passa de 4,5 para 1 sobre fundo, cartão e destaque; bordas e ícones que informam, de 3 para 1.
// O verde claro e a areia não carregam texto nem informação sozinhos (contraste baixo sobre o off-white).

export type ThemeMode = 'light' | 'dark' | 'highContrastLight' | 'highContrastDark'

export interface Palette {
  bg: string
  card: string
  text: string
  textSecondary: string
  /** Bordas de cartão e divisórias. Decorativo, não carrega informação. */
  line: string
  /** Ícones de apoio (setas), trilho da chave desligada e bordas que carregam informação. 3 para 1. */
  lineStrong: string
  primary: string
  primaryText: string
  primarySoft: string
  accent: string
  accentText: string
  danger: string
  dangerSoft: string
  dangerText: string
  darkSurface: string
}

export const light: Palette = {
  bg: '#F6F4EE', // off-white
  card: '#E8DCC9', // areia
  text: '#1F1F1F', // carvão
  textSecondary: '#4F534B',
  line: '#D6CBB6',
  lineStrong: '#73786D',
  primary: '#254C3A', // verde principal
  primaryText: '#F6F4EE',
  primarySoft: '#DCE5D8', // verde claro, mais suave, para ter contraste com o texto
  accent: '#7F4512',
  accentText: '#FFFFFF',
  danger: '#A11F1F',
  dangerSoft: '#F6DEDA',
  dangerText: '#FFFFFF',
  darkSurface: '#1F1F1F',
}

export const dark: Palette = {
  bg: '#131915',
  card: '#1D2520',
  text: '#F1EEE6',
  textSecondary: '#B7BFB3',
  line: '#2F3A33',
  lineStrong: '#728077',
  primary: '#A9C4AE',
  primaryText: '#13241B',
  primarySoft: '#22362B',
  accent: '#E8B66B',
  accentText: '#1F1F1F',
  danger: '#FF8A80',
  dangerSoft: '#3A1A18',
  dangerText: '#1F1F1F',
  darkSurface: '#0B0F0C',
}

export const highContrastLight: Palette = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#2B2B2B',
  line: '#4A4A4A',
  lineStrong: '#000000',
  primary: '#173326',
  primaryText: '#FFFFFF',
  primarySoft: '#E3ECE0',
  accent: '#6E3500',
  accentText: '#FFFFFF',
  danger: '#9B0000',
  dangerSoft: '#FFE5E5',
  dangerText: '#FFFFFF',
  darkSurface: '#000000',
}

export const highContrastDark: Palette = {
  bg: '#000000',
  card: '#0A0A0A',
  text: '#FFFFFF',
  textSecondary: '#D0D0D0',
  line: '#8A8A8A',
  lineStrong: '#FFFFFF',
  primary: '#C4DCC8',
  primaryText: '#000000',
  primarySoft: '#102018',
  accent: '#FFC14D',
  accentText: '#000000',
  danger: '#FF9B9B',
  dangerSoft: '#330000',
  dangerText: '#000000',
  darkSurface: '#000000',
}

export const palettes: Record<ThemeMode, Palette> = {
  light,
  dark,
  highContrastLight,
  highContrastDark,
}
