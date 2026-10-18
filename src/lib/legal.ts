import { Linking } from 'react-native'

// Textos completos no site. A Apple e o Google pedem estes links no cadastro e na tela de planos.
export const LEGAL_URLS = {
  terms: 'https://www.acasa.app.br/termos',
  privacy: 'https://www.acasa.app.br/privacidade',
} as const

export function openLegal(kind: keyof typeof LEGAL_URLS) {
  Linking.openURL(LEGAL_URLS[kind]).catch(() => {})
}
