// O que a página pública da célula mostra (decisão de 19/10: um cartão de visita).
// Só nome, tipo, o texto do líder, bairro, logo, capa e, se o líder quiser, dia e horário.
// Nada interno: sem endereço, roteiro, materiais, pedidos de oração, membros, telefones ou nome do líder.
// Quem quer participar deixa nome e telefone e recebe o código para entrar pelo app, onde vê o resto depois da aprovação.

export interface PublicCell {
  /** Como a página acha a célula: o endereço (/celulas/<nome>) ou 'c:<código>' nos links pelo código. */
  code: string
  /** Endereço próprio, quando o líder escolheu. */
  slug: string | null
  /** Logo da célula, quando o líder enviou e a equipe não tirou do ar. */
  logoUrl: string | null
  coverUrl: string | null
  name: string
  type: string | null
  /** Texto "Sobre a célula", escrito pelo líder. */
  bio: string | null
  neighborhood: string
  city: string
  /** Dia (0 = domingo) e horário. null quando o líder escolheu não mostrar. */
  schedule: { day: number; time: string } | null
  /** paused: o líder está sem o plano Líder; a célula volta quando ele assinar de novo. */
  status: 'active' | 'archived' | 'paused'
}

/** Devolvido depois de deixar nome e telefone: o código para entrar na célula pelo app. */
export interface JoinCode {
  inviteCode: string
}
