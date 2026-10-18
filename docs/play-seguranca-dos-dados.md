# Play Console: formulário "Segurança dos dados"

Respostas tiradas do código do app em 18/10. Onde fica: Play Console > acasa > Política e programas > Conteúdo do app > Segurança dos dados.

Regra do Google que vale para tudo abaixo: dado enviado a um fornecedor que trabalha em nosso nome (Supabase, Anthropic, OpenAI, Twilio, Expo, RevenueCat) **não conta como compartilhamento**. O que a pessoa mostra para a própria célula também não, porque é ela quem escolhe compartilhar. Por isso, em todos os tipos, "Compartilhado" é **Não**.

## Primeira página: visão geral

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dados do usuário exigidos? | Sim |
| Todos os dados coletados são criptografados em trânsito? | Sim |
| Você oferece uma forma de os usuários solicitarem a exclusão dos dados? | Sim, no app (Configurações > Excluir conta) e no site |
| Link para pedir a exclusão da conta | O endereço da página "Excluir minha conta" do site |

## Tipos de dados

Para cada tipo marcado como coletado, o formulário pergunta: coletado ou compartilhado, se é processado só de forma temporária, se é obrigatório ou opcional e para quê. "Funcionalidade do app" e "Gerenciamento da conta" são as finalidades do Google.

### Informações pessoais

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Nome | Sim | Não | Obrigatório | Funcionalidade do app, Gerenciamento da conta |
| Endereço de e-mail | Sim | Não | Opcional (só no login pelo Google ou pela Apple) | Gerenciamento da conta |
| IDs do usuário | Sim | Não | Obrigatório | Funcionalidade do app, Gerenciamento da conta, Prevenção contra fraudes, segurança e conformidade |
| Endereço | Sim | Não | Opcional (o líder informa o endereço da reunião) | Funcionalidade do app |
| Número de telefone | Sim | Não | Obrigatório (login por SMS e um teste grátis por número) | Funcionalidade do app, Gerenciamento da conta, Prevenção contra fraudes, segurança e conformidade |
| Crenças políticas ou religiosas | Sim | Não | Opcional (tradição, igreja, célula, diário e pedidos de oração) | Funcionalidade do app |
| Outras informações | Sim | Não | Opcional (data de aniversário) | Funcionalidade do app |
| Raça e etnia, orientação sexual | Não | | | |

### Informações financeiras

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Histórico de compras | Sim | Não | Opcional (plano e situação da assinatura) | Funcionalidade do app, Gerenciamento da conta |
| Informações de pagamento do usuário, crédito, outras | Não (o pagamento é feito pelo Google Play) | | | |

### Mensagens

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Outras mensagens no app | Sim | Não | Opcional (perguntas do chat bíblico, mural e pedidos de oração da célula) | Funcionalidade do app |
| E-mails, SMS ou MMS | Não | | | |

### Fotos e vídeos

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Fotos | Sim | Não | Opcional (foto do perfil, capa e logo da célula, foto do cronograma do curso, que é lida e não guardada) | Funcionalidade do app |
| Vídeos | Não (o vídeo do pedido em Libras fica só no celular) | | | |

### Arquivos de áudio

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Gravações de voz ou som | Sim | Não (o áudio fica 30 dias quando a pessoa escolhe guardar; senão, é apagado depois da transcrição) | Opcional | Funcionalidade do app |

### Arquivos e documentos

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Arquivos e documentos | Sim | Não | Opcional (materiais da célula; o PDF do cronograma do curso é lido e não guardado) | Funcionalidade do app |

### Atividade no app

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Outros conteúdos gerados pelo usuário | Sim | Não | Opcional (anotações, grifos, diário, leituras marcadas, presença na célula) | Funcionalidade do app |
| Interações no app, histórico de pesquisa, apps instalados, outras ações | Não (a busca da Bíblia fica no celular) | | | |

### Dispositivo ou outros IDs

| Tipo | Coletado | Temporário | Obrigatório | Finalidade |
|---|---|---|---|---|
| Dispositivo ou outros IDs | Sim | Não | Obrigatório (código do aparelho para os avisos e o IP do registro de acesso que o Marco Civil manda guardar por 6 meses) | Funcionalidade do app, Prevenção contra fraudes, segurança e conformidade |

### Não coletados

Local (aproximado ou exato), Saúde e fitness, Agenda, Contatos, Navegação na Web, Informações e desempenho do app (registros de falhas e diagnósticos). O app não usa ferramentas de medição nem de publicidade.

## Conferir antes de enviar

- O link da página de exclusão de conta precisa abrir sem login.
- Se um dia entrar ferramenta de registro de falhas (como o Sentry) ou de medição, "Informações e desempenho do app" passa a ser Sim.
- Se o vídeo em Libras passar a ir para o servidor, "Vídeos" passa a ser Sim.
