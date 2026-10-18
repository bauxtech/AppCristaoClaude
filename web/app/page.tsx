import Link from 'next/link'
import { REMOTE } from '../lib/api'

/**
 * Entrada do projeto da página da célula.
 * Com o banco ligado, não há exemplos: as células de exemplo só existem na prévia sem banco,
 * e os links delas mostrariam "Este convite não vale mais".
 */
export default function Home() {
  if (REMOTE) {
    return (
      <main id="conteudo" className="wrap">
        <header className="hero">
          <h1>Página da célula</h1>
          <p className="sub">Abra o link que você recebeu de quem te convidou. Ele termina com o nome da célula ou com o código do convite.</p>
        </header>
        <p>
          <a href="https://www.acasa.app.br">Conheça o acasa</a>
        </p>
      </main>
    )
  }
  return (
    <main id="conteudo" className="wrap">
      <header className="hero">
        <h1>Página web da célula</h1>
        <p className="sub">Prévia sem banco. Quem recebe um convite abre o link da própria célula.</p>
      </header>
      <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
        <li className="card">
          <Link href="/celulas/jovens-da-central/">Célula com roteiro e materiais</Link>
        </li>
        <li className="card">
          <Link href="/celulas/celula-do-bairro/">Célula sem roteiro e sem materiais</Link>
        </li>
        <li className="card">
          <Link href="/celulas/celula-parada/">Célula parada</Link>
        </li>
        <li className="card">
          <Link href="/c/ARQ001/">Célula arquivada (link antigo, pelo código)</Link>
        </li>
        <li className="card">
          <Link href="/celulas/invalido/">Link inválido</Link>
        </li>
      </ul>
    </main>
  )
}
