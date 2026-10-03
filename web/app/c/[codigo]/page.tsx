import { CellPage } from '../../../components/CellPage'
import { DEMO_CODES } from '../../../lib/api'

// Na exportação estática, só os códigos de exemplo viram páginas. Com o banco, a página lê o código da URL no navegador.
export function generateStaticParams() {
  return [...DEMO_CODES, 'INVALIDO'].map((codigo) => ({ codigo }))
}

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return <CellPage code={codigo} />
}
