// Igreja pelo CNPJ: dados públicos da Receita (BrasilAPI). Nome e endereço vêm de lá e não são editáveis.

/** CNAE de "Atividades de organizações religiosas ou filosóficas". */
export const RELIGIOUS_CNAE = 9491000

export function onlyDigits(s: string) {
  return (s ?? '').replace(/\D/g, '')
}

/** Confere os dois dígitos verificadores do CNPJ. */
export function validCnpj(raw: string) {
  const d = onlyDigits(raw)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = w.reduce((acc, x, i) => acc + x * Number(d[i]), 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export interface CnpjData {
  razao_social?: string
  nome_fantasia?: string
  cnae_fiscal?: number | string
  cnaes_secundarios?: { codigo?: number | string }[]
  descricao_tipo_de_logradouro?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  descricao_situacao_cadastral?: string
}

export function isReligious(c: CnpjData) {
  const codes = [c.cnae_fiscal, ...(c.cnaes_secundarios ?? []).map((x) => x.codigo)].map((x) => Number(x))
  return codes.includes(RELIGIOUS_CNAE)
}

const title = (s?: string) =>
  (s ?? '')
    .toLowerCase()
    .replace(/(^|\s|-|\/)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase())
    .trim()

/** Linha da tabela churches a partir dos dados da Receita. */
export function toChurchRow(cnpj: string, c: CnpjData) {
  const street = [c.descricao_tipo_de_logradouro, c.logradouro].filter(Boolean).join(' ')
  const place = [title(street), c.numero, title(c.complemento)].filter(Boolean).join(', ')
  const city = [title(c.municipio), (c.uf ?? '').toUpperCase()].filter(Boolean).join(', ')
  return {
    cnpj: onlyDigits(cnpj),
    name: title(c.nome_fantasia?.trim() || c.razao_social || '').slice(0, 120) || 'Igreja',
    address: [place, title(c.bairro), city].filter(Boolean).join(', ').slice(0, 200),
    neighborhood: title(c.bairro).slice(0, 80) || null,
    city: city.slice(0, 80) || null,
  }
}
