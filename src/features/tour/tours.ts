// Passo a passo de cada aba (pedido do Thiago, 22/10): aparece na primeira vez que a pessoa abre a aba,
// com 2 ou 3 passos curtos e o botão Pular. Os textos descrevem só o que o app já faz.

export type TabName = 'index' | 'biblia' | 'celula' | 'igreja' | 'eu'

export interface TourStep {
  title: string
  text: string
}

export const TAB_LABEL: Record<TabName, string> = { index: 'Hoje', biblia: 'Bíblia', celula: 'Célula', igreja: 'Igreja', eu: 'Eu' }

export const TOURS: Record<TabName, TourStep[]> = {
  index: [
    { title: 'Seu dia começa aqui', text: 'A passagem e a reflexão do dia, as orações guiadas e os seus planos de leitura ficam nesta tela.' },
    { title: 'Chat bíblico', text: 'O botão verde redondo, no canto de baixo, abre o chat. Pergunte sobre a Bíblia e a fé cristã: as respostas mostram os versículos.' },
    { title: 'Ficou com dúvida?', text: 'Toque na interrogação, no alto da tela, para ver o que é cada parte do Hoje.' },
  ],
  biblia: [
    { title: 'Leia a Bíblia', text: 'Escolha Antigo ou Novo Testamento e toque no livro. Continuar abre o capítulo onde você parou.' },
    { title: 'Toque num versículo', text: 'Dá para grifar, anotar, favoritar, compartilhar ou perguntar sobre ele no chat. Ouvir, no alto do capítulo, lê em voz alta.' },
    { title: 'Planos e busca', text: 'Em Planos de leitura, escolha um plano pronto ou crie o seu. A lupa procura palavras em toda a Bíblia.' },
  ],
  celula: [
    { title: 'O que é a célula', text: 'Um grupo pequeno que se reúne para ler a Bíblia e orar. Aqui ficam a próxima reunião, o roteiro e os pedidos de oração do grupo.' },
    { title: 'Como entrar', text: 'Peça ao líder o código ou o link de convite e toque em Entrar com convite. O líder aprova cada pessoa.' },
    { title: 'Para quem lidera', text: 'No plano Líder, você cria a célula, monta o roteiro, marca presença e organiza a escala.' },
  ],
  igreja: [
    { title: 'Sua igreja', text: 'Busque pelo nome e pela cidade. Se não achar, cadastre à mão. Depois aparecem os cultos, a acessibilidade e os eventos.' },
    { title: 'Gravar culto', text: 'Grave a pregação e receba o texto, um resumo e os versículos citados. Cada culto tem até 90 minutos.' },
    { title: 'Cursos e ministérios', text: 'Cadastre os cursos que você faz e os ministérios em que serve, para acompanhar aulas, presença e materiais.' },
  ],
  eu: [
    { title: 'Seu espaço', text: 'Seu progresso na Bíblia, favoritos e grifos, cultos gravados, pedidos respondidos e a retrospectiva do ano.' },
    { title: 'Ajustes e plano', text: 'Em Ajustes ficam avisos, acessibilidade, privacidade e a voz para ouvir a Bíblia. Em Meu plano você vê a sua assinatura.' },
  ],
}

/** Aba aberta na tela inicial dela; telas internas não mostram o passo a passo. */
export function tabFromPath(path: string): TabName | null {
  if (path === '/') return 'index'
  const m = path.match(/^\/(biblia|celula|igreja|eu)\/?$/)
  return m ? (m[1] as TabName) : null
}
