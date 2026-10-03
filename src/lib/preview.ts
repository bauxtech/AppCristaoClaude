/**
 * Ligado só na prévia web (EXPO_PUBLIC_PREVIEW=1 no build da prévia).
 * Mostra atalhos de teste, como simular a aprovação do líder. Não aparece no app das lojas.
 */
export const IS_PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1'
