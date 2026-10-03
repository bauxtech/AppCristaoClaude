// O que a página pública da célula pode mostrar. Regras decididas:
// - Só o bairro. O endereço completo aparece depois de a pessoa deixar nome e telefone.
// - Nada de lista de membros, telefones ou pedidos de oração da célula na página.
// No banco, isto vira uma função pública que devolve só estes campos. O resto fica protegido pelas regras de acesso.

export interface PublicCell {
  code: string
  name: string
  type: string | null
  churchName: string | null
  neighborhood: string
  city: string
  coverUrl: string | null
  leaderFirstName: string
  /** 0 = domingo */
  day: number
  time: string
  status: 'active' | 'archived'
  nextMeeting: { date: string; time: string } | null
  plan: { title: string; ref: string; sections: { title: string; content: string; minutes: number }[] } | null
  materials: { name: string; kind: 'PDF' | 'Imagem'; size: string; url: string }[]
}

/** Só devolvido depois de deixar contato. */
export interface PrivateAddress {
  address: string
  reference: string
}
