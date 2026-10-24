// Passo a passo de cada aba (pedido do Thiago, 22/10): aparece na primeira vez que a pessoa abre a aba,
// com 2 ou 3 passos curtos e o botão Pular. Os textos descrevem só o que o app já faz.

export type TabName = 'index' | 'biblia' | 'celula' | 'igreja' | 'eu'

export interface TourStep {
  title: string
  text: string
}

export const TAB_LABEL: Record<TabName, string> = { index: 'Hoje', biblia: 'Bíblia', celula: 'Célula', igreja: 'Igreja', eu: 'Eu' }

/** Situação na célula: cada uma tem o seu passo a passo (pedido do Thiago, 22/10). */
export type CellVariant = 'sem' | 'semLider' | 'membro' | 'lider' | 'liderParada'

export const CELL_TOURS: Record<CellVariant, TourStep[]> = {
  // Sem célula e sem o plano Líder.
  sem: [
    { title: 'O que é a célula', text: 'Um grupo pequeno que se reúne para ler a Bíblia e orar. Aqui ficam a próxima reunião, o roteiro e os pedidos de oração do grupo.' },
    { title: 'Como entrar', text: 'Peça ao líder o código ou o link de convite e toque em Entrar com convite. O líder aprova cada pessoa.' },
    { title: 'Quer liderar uma célula?', text: 'No plano Líder você cria a sua célula, com um site próprio para convidar pessoas, roteiro, presença e escala.' },
  ],
  // Sem célula, com o plano Líder.
  semLider: [
    { title: 'Crie a sua célula', text: 'Toque em Criar uma célula e informe o nome, os dias, o horário e o endereço. A célula ganha um código de convite.' },
    { title: 'Convide pessoas', text: 'Compartilhe o código ou o link. Cada pedido chega para você aprovar, como membro ou como visitante.' },
    { title: 'Site da célula', text: 'A célula ganha um site com nome, um texto sobre o grupo, logo e capa. Quem ainda não conhece vê o site e pede para participar.' },
  ],
  membro: [
    { title: 'Próxima reunião', text: 'Dia, horário e endereço da próxima reunião. Confirme se vai, para o líder se organizar.' },
    { title: 'Roteiro e pedidos', text: 'O roteiro da semana fica aqui. Os membros também veem e fazem pedidos de oração do grupo.' },
    { title: 'Escala, carona e mural', text: 'Veja quando é a sua vez na escala e peça troca se precisar. Peça carona ou dê carona a quem pediu, e acompanhe o mural da célula.' },
  ],
  lider: [
    { title: 'Site da célula', text: 'Compartilhe o link no WhatsApp e nas redes. Em Editar site, mude o texto sobre a célula, o logo, a capa e o endereço do site.' },
    { title: 'Quem entra', text: 'Os pedidos de entrada aparecem aqui. Você aprova como membro ou visitante. Até 20 membros sem plano usam a célula pela sua assinatura.' },
    { title: 'A reunião', text: 'Monte o roteiro (à mão, com IA ou pelo PDF da igreja), marque a presença e organize a escala. O auxiliar pode marcar presença e editar a escala com você.' },
    { title: 'Opções da célula', text: 'Edite os dados da célula, convide pessoas, veja o histórico e, quando o grupo crescer, a sugestão de multiplicação.' },
  ],
  // Líder sem o plano Líder e sem outro líder com o plano: a célula para e fica só para leitura.
  liderParada: [
    { title: 'Sua célula está parada', text: 'Sem o plano Líder, a célula fica só para leitura: sem reunião, escala, presença, avisos e site. Nada é apagado.' },
    { title: 'Como voltar', text: 'Assine o plano Líder e tudo volta como estava. Ou passe a liderança para alguém da célula que tenha o plano Líder.' },
  ],
}

export const TOURS: Record<Exclude<TabName, 'celula'>, TourStep[]> = {
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

/** Qual passo a passo da Célula vale para a pessoa agora. Pedido em análise não tem passo a passo. */
export function cellVariant(o: { hasCell: boolean; pending: boolean; isLeader: boolean; leadPlan: boolean; cellActive: boolean }): CellVariant | null {
  if (o.pending && !o.hasCell) return null
  if (!o.hasCell) return o.leadPlan ? 'semLider' : 'sem'
  if (!o.isLeader) return 'membro'
  return o.cellActive ? 'lider' : 'liderParada'
}

/** Conta nova: terminou o cadastro neste aparelho depois que o passo a passo entrou e está na primeira semana. */
export function isNewAccount(trialStart: string | null, now = new Date()) {
  if (!trialStart) return true
  return now.getTime() - new Date(trialStart).getTime() < 7 * 86400_000
}

/** Aba aberta na tela inicial dela; telas internas não mostram o passo a passo. */
export function tabFromPath(path: string): TabName | null {
  if (path === '/') return 'index'
  const m = path.match(/^\/(biblia|celula|igreja|eu)\/?$/)
  return m ? (m[1] as TabName) : null
}
