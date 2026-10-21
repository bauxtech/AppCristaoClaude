import { useEffect, useRef } from 'react'
import type { ScrollView } from 'react-native'

// Ao voltar para uma aba pela barra de baixo, ela abre no início (QA de 21/10: a Célula voltava rolada até o fim).
// A Bíblia fica de fora: ao voltar para ela, a pessoa continua no versículo em que estava.

const toTop = new Map<string, () => void>()

/** Na tela inicial de uma aba: liga a rolagem dela ao toque na barra de abas. */
export function useTabScrollTop(tab: string) {
  const ref = useRef<ScrollView>(null)
  useEffect(() => {
    const fn = () => ref.current?.scrollTo({ y: 0, animated: false })
    toTop.set(tab, fn)
    return () => {
      if (toTop.get(tab) === fn) toTop.delete(tab)
    }
  }, [tab])
  return ref
}

/** Chamado ao tocar numa aba da barra de baixo. */
export function scrollTabToTop(tab: string) {
  toTop.get(tab)?.()
}
