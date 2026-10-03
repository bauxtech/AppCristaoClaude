// Paleta A do protótipo (bauxtech/AppCristao, src/theme.ts), claro e escuro.
// Ajustes aprovados pelo Thiago para passar no contraste mínimo estão marcados com "ajuste".
// O alto contraste não existe no protótipo e foi criado a partir da A.

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
  bg: '#F4F7FD',
  card: '#FFFFFF',
  text: '#0F1E3C',
  textSecondary: '#4B5A7A',
  line: '#D1DCF0',
  lineStrong: '#6B7A99', // ajuste: novo, a cor de linha dava 1,4 para 1
  primary: '#1A56DB',
  primaryText: '#FFFFFF',
  primarySoft: '#DBEAFE',
  accent: '#A14A07', // ajuste: era #B45309, dava 4,1 para 1 sobre o azul claro
  accentText: '#FFFFFF',
  danger: '#B91C1C', // ajuste: era #DC2626, dava 3,9 para 1 sobre o vermelho claro
  dangerSoft: '#FEE2E2',
  dangerText: '#FFFFFF',
  darkSurface: '#0F1E3C',
}

export const dark: Palette = {
  bg: '#0D1117',
  card: '#161B22',
  text: '#E8EFF8',
  textSecondary: '#8DA0BC',
  line: '#2A3650',
  lineStrong: '#66799A', // ajuste: novo
  primary: '#6FA3FF', // ajuste: era #4D8EFF, dava 4,4 para 1 sobre o azul escuro
  primaryText: '#0D1117', // ajuste: era branco, dava 3,2 para 1 no botão
  primarySoft: '#1A2D4A',
  accent: '#F59E0B',
  accentText: '#000000',
  danger: '#FF6B6B',
  dangerSoft: '#3A1515',
  dangerText: '#0D1117', // ajuste: novo, texto branco sobre #FF6B6B não passa
  darkSurface: '#030508',
}

export const highContrastLight: Palette = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#2B2B2B',
  line: '#4A4A4A',
  lineStrong: '#000000',
  primary: '#0B3FB0',
  primaryText: '#FFFFFF',
  primarySoft: '#DBEAFE',
  accent: '#7A3300',
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
  primary: '#9CC3FF',
  primaryText: '#000000',
  primarySoft: '#0B1A33',
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
