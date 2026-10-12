# REGRAS DO PROJETO

## O QUE É
App pessoal para cristãos, chamado acasa (sempre em minúsculas, inclusive no começo de frase). É da pessoa, não da igreja. Junta Bíblia, chat bíblico, oração, gravação e transcrição do culto, igreja, cursos, ministérios e célula, com acessibilidade para surdos e cegos. São 15 fluxos, descritos em docs/.

## QUEM TRABALHA AQUI
Quem conduz é o Thiago, diretor de design. Não há desenvolvedor na equipe. O Claude Code escreve e outra sessão do Claude revisa. O Thiago testa no celular e decide.
- Explique cada passo de configuração sem pressupor experiência com desenvolvimento.
- Ao terminar uma tarefa, diga o que mudou, como testar no celular passo a passo e o que ficou pendente.
- Se uma regra não estiver aqui nem em docs/, pergunte. Não invente.

## TECNOLOGIA
- App: React Native com Expo, TypeScript. Build pelo EAS.
- Identificador do app: com.bauxtech.acasa e endereço acasa:// (decididos em 12/10). Não mudam depois de publicar na loja.
- Página web da célula: Next.js, lendo o mesmo banco.
- Banco, login e arquivos: Supabase, região São Paulo.
- Funções do servidor: Edge Functions do Supabase. Transcrição pela API da OpenAI. Resumo do culto e chat pela API do Claude.
- Modelos, decididos por custo e qualidade: chat no Claude Haiku 5.5; resumo do culto e conteúdo do dia no Claude Opus 5.5; transcrição no gpt-4o-mini-transcribe. Todo assinante precisa dar lucro mesmo no uso máximo do plano.
- Assinatura: RevenueCat, com a compra nativa da App Store e do Google Play.
- Avisos: serviço de notificação do Expo.
- Nenhuma chave de API no app nem no repositório. Segredos ficam no Supabase e no EAS.

## DESIGN
- A referência visual é o repositório do protótipo. Leia os valores no código, não em imagem.
- Estrutura: 5 abas (Hoje, Bíblia, Célula, Igreja, Eu), botão do chat e oração como painel por cima.
- Fontes: Nunito na interface (geométrica e arredondada) e Literata no texto bíblico. Texto bíblico em 19.
- Paleta da marca acasa (12/10): verde principal #254C3A (ícone, botões principais, destaques), verde claro #A9BBA7 (elementos secundários e progresso), off-white #F6F4EE (fundo), areia #E8DCC9 (cartões e áreas de apoio), carvão #1F1F1F (textos e ícones). Escuro e alto contraste derivados dela, em src/theme/colors.ts. Verde claro e areia não carregam texto nem informação sozinhos. O seletor de paletas e o controle Demo do protótipo não entram no app; o protótipo continua sendo a referência de layout, não de cor.
- Ícone: fundo verde principal com o "a" em off-white. Direção visual: fundos claros, bastante espaço em branco e cartões discretos.
- Componentes primeiro, telas depois.
- Tela que existe no protótipo: siga o protótipo. Tela que não existe: construa a partir de docs/, com os mesmos componentes.
- Ao entregar uma tela, compare com o protótipo e liste as diferenças.
- Ajuste de design pedido pelo Thiago é feito direto no app. O protótipo fica congelado.
- Não use emoji como ícone.

## ACESSIBILIDADE, EM TODA TELA
- Área de toque de no mínimo 44 pt no iPhone e 48 dp no Android.
- Contraste de texto de no mínimo 4,5 para 1. Bordas e ícones, 3 para 1.
- Todo controle com nome e função para leitor de tela. Todo campo com rótulo. Estado selecionado anunciado.
- Corpo do texto em 16. Respeitar o tamanho de fonte do sistema.
- Modo claro, escuro e alto contraste funcionando.
- Nenhuma informação passada só por cor.

## REGRAS DO PRODUTO, JÁ DECIDIDAS
- Entrada na célula: o líder aprova cada pessoa.
- Papéis: o auxiliar marca presença e edita a escala. O anfitrião não tem permissão a mais.
- Líder: a célula pode ter mais de um. Só o único líder de uma célula com outros membros precisa passar a liderança antes de sair ou excluir a conta.
- Telefone dos membros: aparece só para o líder.
- Visitante: vê reunião, endereço e roteiro. Não vê os pedidos de oração.
- Página web da célula: mostra só o bairro. O endereço completo aparece depois de a pessoa deixar nome e telefone.
- Idade: só maiores de 18 no lançamento.
- Bíblia: Bíblia Livre no lançamento (licença Creative Commons Atribuição, uso comercial permitido, crédito obrigatório no app). Não é domínio público. As licenciadas entram depois. Origem e licença registradas em src/features/bible/translations.ts e na tabela bible_translations.
- Planos (decididos em 12/10), cada um mensal ou anual, com os mesmos limites:
  - Essencial (R$ 14,90/mês ou R$ 109,90/ano): Bíblia completa, planos de leitura, oração guiada, diário, pedidos, campanhas, igreja, ministérios, cursos, música, participar de célula, chat com 5 perguntas por dia. Sem culto.
  - Completo (R$ 24,90/mês ou R$ 179,90/ano): tudo do Essencial, chat com 10 perguntas por dia, 4 cultos por período.
  - Líder (R$ 39,90/mês ou R$ 299,90/ano): tudo do Completo, 8 cultos por período, criar e conduzir célula. Até 20 membros da célula entram sem plano, só para as funções da célula (pela ordem de entrada). Do 21º em diante, cada um precisa de plano próprio.
  - Funções e limites ficam na tabela plan_config do banco, editável no painel do Supabase sem versão nova do app.
- Teste grátis: 7 dias corridos com acesso total, contados do primeiro login, controlados pelo servidor, sem forma de pagamento. Limites do teste: 10 perguntas por dia e 2 cultos. Um teste por número de celular (o hash do número fica guardado mesmo depois de excluir a conta). Quem entra pelo Google confirma o celular para começar o teste. Se a Apple recusar o teste pelo servidor, trocar app_settings.trial_mode para "store" e usar o teste da loja.
- Depois do teste sem plano: grátis para sempre ler a Bíblia, trocar de tradução, ouvir capítulos (voz do celular), buscar, grifar, anotar, favoritar, marcar como lido, passagem do dia na Home e participar da célula de um líder com o plano Líder. O resto fica bloqueado. O que a pessoa criou nunca é apagado: fica só para leitura e ela pode apagar. Mesma regra quando a assinatura vence ou é cancelada.
- Bloqueio na tela: dia 5 e dia 7, aviso no celular. Dia 8, a tela de planos aparece uma vez com o botão para seguir só com a Bíblia. Depois, cada função bloqueada mostra cadeado e "No plano X"; tocar abre a tela de planos. O anual aparece marcado.
- Limites: chat zera à meia-noite (Brasília). Culto zera a cada período da assinatura. O limite é conferido ao começar; nunca corta uma transcrição já iniciada. O aviso mostra a data de renovação. O direito de uso é sempre conferido no servidor.
- Líder sem o plano Líder: se a célula tem outro líder com o plano Líder, nada muda. Se não tem, a célula para na hora e fica só para leitura (sem reunião, escala, presença, avisos ou página web). Nada é apagado. O líder pode passar a liderança para quem tem o plano Líder; se voltar a assinar, tudo volta.
- Contas da equipe: cortesia de plano pelo servidor (subscriptions.courtesy_plan e courtesy_until), sem loja.
- Membro sem plano e sem vaga: fica na lista da célula como inativo e sai da escala.
- Total de dias: não existe sequência. O app mostra o total de dias com leitura ou oração.
- Áudio do culto: o padrão é guardar só o texto. Quando a pessoa escolhe guardar o áudio, ele fica 30 dias.
- Carona: botão que abre o WhatsApp quando o pedido é aceito.
- Exclusão da conta: dados apagados em 30 dias.
- Histórico do chat: guardado no servidor só com o consentimento de fé.
- Retirar o consentimento de fé: apaga do servidor o diário, os pedidos de oração, o histórico do chat, o registro de que a pessoa orou pelos pedidos de outros e a tradição. No aparelho, eles continuam. Sem consentimento, o banco não aceita gravar esses dados. Dar o consentimento de novo envia o que está no aparelho.
- Denúncia: vai para a equipe do app. O conteúdo some na hora para quem denunciou.
- Conteúdo diário: escrito pela IA e publicado direto, sem revisão. O versículo vem sempre do texto bíblico do app, nunca da IA.
- Igreja: busca só pelo CNPJ (Receita) e cadastro à mão. Sem Google Places, por custo. Nome e endereço vêm do CNPJ. Horários de culto e acessibilidade: cada pessoa edita os da própria igreja e só ela vê. Na igreja cadastrada à mão, o que quem cadastrou informa vale para todos até a pessoa guardar os dela.
- Música: só sugestões, sem conexão com Spotify. Só músicas brasileiras. A lista é escolhida pela IA e pode ser trocada pela equipe.
- Culto longo: o servidor divide o áudio em partes de até 10 minutos antes da transcrição.
- Chat: só fala de Bíblia e fé cristã, cita só o texto bíblico do app e mostra a fonte. Se a pessoa falar em se machucar, mostra o CVV, telefone 188.

## EM ABERTO, PERGUNTAR ANTES DE CODAR
- Pagamento por Pix: fora do escopo agora.
- Preços em real: confirmar na tabela de preços da App Store (R$ 14,90, 39,90, 109,90 e 179,90 não foram confirmados). No Google Play qualquer valor vale.

## DADOS E PRIVACIDADE
- Fé e pedido de oração são dado sensível pela LGPD. Consentimento separado no cadastro, exportar e apagar dados.
- As regras de acesso ficam no banco, não só no app. Ninguém lê dado de outra pessoa ou de outra célula sem permissão.

## COMO TRABALHAR
- Um fluxo por vez, cada um em um branch e um pull request.
- Ordem: base e teste de gravação; login e primeiro acesso; Hoje e Bíblia; oração; célula; página web da célula; culto; chat; igreja, ministérios e cursos; música e perfil; notificações, configurações e sair; assinatura; estados gerais.
- Todo fluxo tem testes automáticos.
- Testes de permissão são obrigatórios: um teste tenta ler o pedido de oração de outra célula e precisa falhar. O mesmo para telefone, presença e diário.
- Antes de fechar um pull request, peça revisão a uma sessão separada, com foco em segurança, permissões, dado sensível e acessibilidade.
- Nada vai para a loja com teste quebrado.
- Antes de abrir para o público, uma pessoa de fora revisa as regras de acesso do banco, as chaves e o pagamento. Avise o Thiago quando chegar essa hora.

## DOCUMENTOS
- docs/funcionalidades-v1.md: os 15 fluxos (cópia de https://claude.ai/code/artifact/6464c542-3f43-4e73-b9de-0eb1b8ec43f7).
- docs/o-que-falta-no-prototipo.md: telas que não existem no protótipo e regras decididas (cópia de https://claude.ai/code/artifact/ff2185a2-c305-4a86-b8ce-4642f3c2742b).
- Protótipo: repositório bauxtech/AppCristao. Só leitura.
