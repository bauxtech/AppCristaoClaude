// Dados de exemplo do primeiro acesso. Saem daqui quando o login real (Supabase) entrar.

/** Telas que contam na barra de progresso, na ordem. */
/** A tela de acesso (Criar conta ou Entrar) vem da apresentação e não conta na barra. */
export const PROGRESS_STEPS = ['celular', 'codigo', 'termos', 'nome', 'tradicao', 'objetivo', 'horario', 'igreja', 'celula'] as const
export type ProgressStep = (typeof PROGRESS_STEPS)[number]

/** Na prévia, estes códigos simulam as respostas do servidor. */
export const DEMO_CODES = { ok: '123456', expired: '000000', tooMany: '111111' }

/** Número de exemplo que já tem conta: leva para "Bem-vindo de volta". */
export const DEMO_EXISTING_PHONE = { ddd: '11', number: '987654321', name: 'Ana' }

/** Código de convite de exemplo. */
export const DEMO_INVITE_CODE = 'ABC123'

export const demoCell = { name: 'Jovens da Central', leader: 'João Silva', when: 'Quartas, 20h', neighborhood: 'Pinheiros' }

/**
 * Traduções que a pessoa pode escolher. No lançamento, só a Bíblia Livre (regra decidida).
 * As licenciadas (NVI, ARA, ACF, NVT, NTLH, A21) estão no backlog e não aparecem no app até existirem (QA de 20/10).
 */
export const TRANSLATIONS = [{ id: 'biblia-livre', label: 'Bíblia Livre', available: true }]

export const TRADITIONS = ['Batista', 'Pentecostal', 'Presbiteriana', 'Católica', 'Outra', 'Prefiro não dizer']

export const GOALS = [
  { id: 'read', label: 'Ler a Bíblia inteira', desc: 'Seguir um plano de leitura e concluir os 66 livros.' },
  { id: 'pray', label: 'Orar mais', desc: 'Criar um hábito diário de oração com guias e diário.' },
  { id: 'understand', label: 'Entender melhor a Bíblia', desc: 'Usar o chat e as anotações para aprofundar o estudo.' },
  { id: 'lead', label: 'Liderar uma célula', desc: 'Criar e conduzir meu próprio grupo com ferramentas do app.' },
]

export const TIMES = [
  { id: 'manha', label: 'Manhã', desc: 'Entre 6h e 9h' },
  { id: 'meio', label: 'Meio-dia', desc: 'Entre 11h e 13h' },
  { id: 'tarde', label: 'Tarde', desc: 'Entre 15h e 18h' },
  { id: 'noite', label: 'Noite', desc: 'Entre 19h e 22h' },
  { id: 'variado', label: 'Varia conforme o dia', desc: 'Sem horário fixo' },
]

export const CHURCHES = [
  { id: '1', name: 'Igreja Batista Central de São Paulo', city: 'São Paulo, SP', cnpj: '12.345.678/0001-99' },
  { id: '2', name: 'Comunidade Evangélica Rhema', city: 'São Paulo, SP', cnpj: '98.765.432/0001-11' },
  { id: '3', name: 'Igreja Presbiteriana do Brasil', city: 'Campinas, SP', cnpj: '11.222.333/0001-44' },
]

export function searchChurches(query: string) {
  const text = query.trim().toLowerCase()
  if (!text) return []
  const digits = text.replace(/\D/g, '')
  return CHURCHES.filter(
    (c) =>
      c.name.toLowerCase().includes(text) ||
      c.city.toLowerCase().includes(text) ||
      (digits.length >= 3 && c.cnpj.replace(/\D/g, '').includes(digits)),
  )
}

// Termos e privacidade completos ficam no site (LEGAL_URLS). No app, só o resumo e o texto do consentimento de fé.
export const TERMS_TEXT = [
  { title: 'Quem oferece', body: 'O acasa é oferecido pela Baux Estúdio Ltda. (bauxtech), CNPJ 55.813.412/0001-32, em Salvador, BA. É um app pessoal, para maiores de 18 anos, e não fala em nome de nenhuma igreja.' },
  { title: 'Planos e teste grátis', body: 'O teste grátis dura 7 dias, sem cartão, um por número de celular, com até 10 perguntas por dia no chat e 2 cultos. A assinatura é cobrada pelo Google Play ou pela App Store e renova sozinha até você cancelar na loja. Depois do teste, ler e ouvir a Bíblia, buscar, grifar, anotar, a passagem e a reflexão do dia continuam grátis.' },
  { title: 'Inteligência artificial', body: 'O chat bíblico, o resumo do culto e a leitura do cronograma do curso usam o Claude, da Anthropic. A transcrição do áudio do culto usa um modelo da OpenAI. As respostas podem conter erros e não substituem o seu pastor nem orientação médica, jurídica ou psicológica. Em crise, ligue para o CVV, no 188.' },
  { title: 'Gravação do culto', body: 'Grave apenas com permissão e para o seu estudo pessoal. Não publique a gravação, a transcrição ou o resumo sem autorização de quem tem os direitos sobre a pregação.' },
  { title: 'Célula e conteúdo', body: 'O líder responde pela célula, pela página na internet, pelo endereço e pelo logo que publica. Não é permitido publicar conteúdo ilegal, de ódio, assédio ou discriminação. Você pode denunciar, e a equipe pode remover conteúdo e suspender contas.' },
  { title: 'Sua conta', body: 'Você pode baixar os seus dados e excluir a conta em Configurações. A exclusão apaga os seus dados em até 30 dias.' },
]

export const FAITH_TEXT = [
  { title: '1. O que este consentimento cobre', body: 'Pela LGPD, informações que revelam a sua fé são dados sensíveis. Com o seu consentimento, o acasa guarda no servidor o seu diário de oração, os seus pedidos de oração, o histórico do chat bíblico, o registro de que você orou pelos pedidos de outras pessoas e a sua tradição cristã. Sem o consentimento, o servidor não aceita gravar esses dados, e eles ficam só no seu celular.' },
  { title: '2. Para que usamos', body: 'Só para o app funcionar para você: guardar e mostrar esses dados, sincronizar entre os seus aparelhos e compartilhar com a sua célula apenas o que você escolher. Não usamos para publicidade e não vendemos os seus dados.' },
  { title: '3. Onde os dados ficam', body: 'O banco de dados fica em São Paulo. As perguntas do chat são processadas pelo Claude, da Anthropic, nos Estados Unidos, que não usa esses dados para treinar os modelos. A lista completa de fornecedores está na Política de privacidade, no site acasa.app.br/privacidade.' },
  { title: '4. Como retirar', body: 'Você pode retirar o consentimento quando quiser, em Configurações. Ao retirar, apagamos do servidor o diário, os pedidos de oração, o histórico do chat, o registro de oração e a tradição. No seu celular, eles continuam. Se der o consentimento de novo, o que está no celular volta a ser enviado.' },
]
