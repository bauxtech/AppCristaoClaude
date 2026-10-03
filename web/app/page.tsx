import Link from 'next/link'

/** Entrada da prévia: os exemplos de cada estado da página. */
export default function Home() {
  return (
    <main id="conteudo" className="wrap">
      <header className="hero">
        <h1>Página web da célula</h1>
        <p className="sub">Prévia. Quem recebe um convite abre o link da própria célula.</p>
      </header>
      <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
        <li className="card">
          <Link href="/c/ABC123/">Célula com roteiro e materiais</Link>
        </li>
        <li className="card">
          <Link href="/c/NOVA01/">Célula sem roteiro e sem materiais</Link>
        </li>
        <li className="card">
          <Link href="/c/ARQ001/">Célula arquivada</Link>
        </li>
        <li className="card">
          <Link href="/c/INVALIDO/">Link inválido</Link>
        </li>
      </ul>
    </main>
  )
}
