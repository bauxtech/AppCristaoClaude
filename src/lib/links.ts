// Conferência de links antes de abrir. Link vindo de outra pessoa ou do servidor pode ter qualquer endereço.

/** Endereço da web com https. Arquivos do próprio aparelho só quando permitido. */
export function isSafeUrl(url: string, allowLocalFile = false) {
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    return allowLocalFile && u.protocol === 'file:'
  } catch {
    return false
  }
}

/** Rota interna do app, como "/celula/pedidos". Nada de esquema, domínio ou "//". */
export function isInternalRoute(href?: string): href is string {
  return !!href && /^\/[a-z0-9\-/[\]?=&]*$/i.test(href) && !href.startsWith('//')
}
