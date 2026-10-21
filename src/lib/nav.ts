import { router, type Href } from 'expo-router'

// Voltar depois de um salto para dentro de outra aba (QA de 21/10).
// Ex.: do resultado do culto para o roteiro da célula, ou do Hoje para um capítulo da Bíblia.
// Ao entrar numa aba, o app perde a tela de onde a pessoa veio, e o Voltar levava para o Hoje.
// jumpTo guarda a origem; o Voltar da barra de topo e o do Android levam de volta para ela.

let current = '/'
let jump: { origin: string; target: string | null } | null = null

const section = (path: string) => path.split('?')[0].split('/')[1] ?? ''

/** Chamado a cada troca de tela (no layout raiz). */
export function setCurrentRoute(path: string) {
  current = path
  if (!jump) return
  // A primeira tela depois do salto é o destino.
  if (jump.target === null) {
    jump.target = path
    return
  }
  // Saiu da área do destino por outro caminho (outra aba, por exemplo): a origem não vale mais.
  if (section(path) !== section(jump.target)) jump = null
}

/** Vai para uma tela de outra aba lembrando de onde veio. */
export function jumpTo(href: Href) {
  jump = { origin: current, target: null }
  // Com a âncora, o início da aba fica embaixo do destino: ao voltar, a aba não fica presa no destino.
  router.push(href, { withAnchor: true })
}

/** Na tela de destino de um salto, volta para a origem. Devolve false quando não há salto para desfazer. */
export function backFromJump(): boolean {
  if (!jump || jump.target === null || jump.target !== current) return false
  const origin = jump.origin
  jump = null
  router.navigate(origin as Href)
  return true
}
