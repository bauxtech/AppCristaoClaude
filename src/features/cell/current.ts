// Célula aberta agora, para quem precisa dela fora da tela da célula (ex.: compartilhar pedido de oração).
let currentId: string | null = null

export function setCurrentCellId(id: string | null) {
  currentId = id
}

/** Id da célula no banco (uuid) ou null. Célula de exemplo não conta. */
export function currentCellId() {
  return currentId
}
