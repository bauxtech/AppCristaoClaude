// Fontes e tamanhos. Figtree na interface, Literata no texto bíblico.
// Tamanhos em pontos; o sistema aumenta conforme a fonte escolhida no celular.

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  bible: 'Literata_400Regular',
  bibleItalic: 'Literata_400Regular_Italic',
  bibleMedium: 'Literata_500Medium',
} as const

export const size = {
  /** Etiquetas de seção em caixa alta e rótulos da barra de abas. */
  label: 12,
  /** Texto de apoio: datas, descrições curtas. */
  small: 14,
  /** Corpo do texto. */
  body: 16,
  /** Título de cartão e da barra de topo. */
  title: 17,
  /** Texto bíblico. */
  bible: 19,
  /** Título da tela principal de cada aba. */
  screenTitle: 24,
} as const

/** Limite para o aumento de fonte do sistema não quebrar a tela. */
export const maxFontScale = 2
