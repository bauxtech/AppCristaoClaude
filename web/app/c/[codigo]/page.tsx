import { CellPage } from '../../../components/CellPage'
import { DEMO_CODES } from '../../../lib/api'

// Na exportação estática, só os códigos de exemplo viram páginas. Com o banco, a página lê o código da URL no navegador.
// "_" é a página usada para qualquer código real: o Netlify entrega /c/_/ para /c/<código>/ (web/public/_redirects).
export function generateStaticParams() {
  return [...DEMO_CODES, 'INVALIDO', '_'].map((codigo) => ({ codigo }))
}

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return <CellPage code={codigo} />
}
