// Dados de exemplo do primeiro acesso. Saem daqui quando o login real (Supabase) entrar.

/** Na prévia, estes códigos simulam as respostas do servidor. */
export const DEMO_CODES = { ok: '123456', expired: '000000', tooMany: '111111' }

/** Número de exemplo que já tem conta: leva para "Bem-vindo de volta". */
export const DEMO_EXISTING_PHONE = { ddd: '11', number: '987654321', name: 'Ana' }

/** Código de convite de exemplo. */
export const DEMO_INVITE_CODE = 'ABC123'

export const demoCell = { name: 'Jovens da Central', leader: 'João Silva', when: 'Quartas, 20h', neighborhood: 'Pinheiros' }

/** Só uma tradução de domínio público no lançamento (regra decidida). As outras aparecem como "Em breve". */
export const TRANSLATIONS = [
  { id: 'almeida', label: 'Almeida', available: true },
  { id: 'nvi', label: 'NVI', available: false },
  { id: 'ara', label: 'ARA', available: false },
  { id: 'acf', label: 'ACF', available: false },
  { id: 'nvt', label: 'NVT', available: false },
  { id: 'ntlh', label: 'NTLH', available: false },
  { id: 'a21', label: 'A21', available: false },
]

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

export const TERMS_TEXT = [
  { title: '1. Aceitação dos Termos', body: 'Ao criar uma conta ou utilizar o aplicativo, você declara ter lido, compreendido e concordado com estes Termos de Uso. Caso não concorde com qualquer parte destes termos, recomendamos que não utilize o serviço. Reservamo-nos o direito de modificar estes termos a qualquer momento, sendo que as alterações entrarão em vigor imediatamente após publicação. O uso continuado do aplicativo após tais alterações constitui aceite dos novos termos.' },
  { title: '2. Uso do Serviço', body: 'O aplicativo é oferecido para uso pessoal, devocional e comunitário. Você se compromete a utilizar o serviço de forma ética, respeitosa e em conformidade com a legislação brasileira aplicável. É vedado utilizar o aplicativo para disseminar conteúdo ofensivo, discriminatório ou contrário às diretrizes da comunidade cristã. Contas suspeitas de uso indevido poderão ser suspensas ou encerradas sem aviso prévio.' },
  { title: '3. Propriedade Intelectual', body: 'Todo o conteúdo disponibilizado no aplicativo, incluindo textos bíblicos, planos de leitura, músicas, ilustrações e outros materiais, é protegido por direitos autorais quando aplicável. O usuário pode compartilhar versículos e reflexões para uso pessoal e evangelístico, desde que mantenha a devida atribuição à fonte.' },
  { title: '4. Limitação de Responsabilidade', body: 'O aplicativo é fornecido como está, sem garantias de disponibilidade contínua. O conteúdo devocional e as reflexões teológicas disponibilizados têm caráter educativo e espiritual, não substituindo o aconselhamento pastoral ou psicológico profissional. Para questões emocionais urgentes, recomendamos sempre buscar apoio humano qualificado.' },
]

export const FAITH_TEXT = [
  { title: '1. Quais dados coletamos', body: 'Ao utilizar o aplicativo, coletamos informações sobre sua prática de fé, incluindo: denominação ou tradição cristã declarada, tradução bíblica preferida, horário habitual de devoção, planos de leitura em andamento, anotações e marcações nos textos, histórico de orações registradas e participação em células ou grupos. Esses dados são fornecidos voluntariamente por você durante o cadastro ou ao longo do uso do app.' },
  { title: '2. Como utilizamos', body: 'Os dados de fé são utilizados exclusivamente para personalizar sua experiência no aplicativo: sugerir planos de leitura adequados ao seu ritmo, enviar lembretes nos horários que você configurou, adaptar o conteúdo devocional à sua tradição e oferecer recursos de célula alinhados ao seu papel (membro ou líder). Não utilizamos esses dados para fins comerciais, publicidade segmentada ou venda a terceiros.' },
  { title: '3. Armazenamento e segurança', body: 'Seus dados são armazenados em servidores localizados no Brasil, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018). Adotamos medidas técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.' },
  { title: '4. Seus direitos', body: 'Em conformidade com a LGPD, você tem o direito de acessar, corrigir, exportar ou excluir seus dados de fé a qualquer momento, por meio das configurações do aplicativo ou por solicitação ao nosso suporte. A exclusão da conta apaga permanentemente todos os dados associados, incluindo anotações, histórico de leitura e registros de oração, em até 30 dias após a solicitação.' },
]
