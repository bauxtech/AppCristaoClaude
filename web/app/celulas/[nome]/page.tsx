import { CellPage } from '../../../components/CellPage'
import { DEMO_SLUGS } from '../../../lib/api'

// Endereço próprio da célula: acasa.app.br/celulas/<nome>.
// Na exportação estática, só os exemplos viram páginas. Com o banco, a página lê o nome do endereço no navegador.
// "_" é a página usada para qualquer nome real: o Netlify entrega /celulas/_/ para /celulas/<nome>/ (web/public/_redirects).
export function generateStaticParams() {
  return [...DEMO_SLUGS, 'invalido', '_'].map((nome) => ({ nome }))
}

export default async function Page({ params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params
  return <CellPage code={nome} />
}
