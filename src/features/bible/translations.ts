import { BOOK_DATA as BIBLIA_LIVRE } from './data/biblia-livre'

// Traduções do app. Cada uma registra a origem e a licença do texto, porque o app é comercial.
// Nenhum texto aqui é gerado por IA. Tradução licenciada (ARA, NVI, NAA, NTLH e outras) só entra com contrato,
// como mais uma entrada nesta lista e uma pasta em data/, gerada por scripts/build-bible.mjs.
// As marcações, notas e planos usam a chave livro:capítulo:versículo, que não depende da tradução.

export interface Translation {
  id: string
  name: string
  shortName: string
  language: 'pt-BR'
  /** Identificador da licença. Domínio público só quando for de fato. */
  license: 'cc-by-3.0-br' | 'public-domain' | 'licensed'
  licenseName: string
  licenseUrl: string
  /** Crédito exigido pela licença. Aparece na Bíblia e em Sobre a tradução. */
  attribution: string
  source: string
  /** O que mudamos no texto ao gerar os arquivos do app. A licença pede que isso fique claro. */
  changes: string
  books: Record<string, () => string[][]>
}

export const TRANSLATIONS_DATA: Translation[] = [
  {
    id: 'biblia-livre',
    name: 'Bíblia Livre',
    shortName: 'BLIVRE',
    language: 'pt-BR',
    license: 'cc-by-3.0-br',
    licenseName: 'Creative Commons Atribuição 3.0 Brasil',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/br/',
    attribution: 'Bíblia Livre. Atualização da tradução de João Ferreira de Almeida (1819). Diego Santos, Mario Sérgio e Marco Teles.',
    source: 'Arquivo PorBLivre do repositório scrollmapper/bible_databases (github.com/scrollmapper/bible_databases).',
    changes:
      'Retiramos uma marcação de nota de rodapé em Deuteronômio 32:5, trocamos um acento agudo usado como apóstrofo em Isaías 14:23 e tiramos espaços sobrando. As palavras do texto não foram alteradas.',
    books: BIBLIA_LIVRE,
  },
]

export const DEFAULT_TRANSLATION = 'biblia-livre'

export function getTranslation(id?: string | null): Translation {
  return TRANSLATIONS_DATA.find((t) => t.id === id) ?? TRANSLATIONS_DATA.find((t) => t.id === DEFAULT_TRANSLATION)!
}
