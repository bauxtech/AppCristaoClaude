# REGRAS DO PROJETO

## O QUE É
App pessoal para cristãos. É da pessoa, não da igreja. Junta Bíblia, chat bíblico, oração, gravação e transcrição do culto, igreja, cursos, ministérios e célula, com acessibilidade para surdos e cegos. São 15 fluxos, descritos em docs/.

## QUEM TRABALHA AQUI
Quem conduz é o Thiago, diretor de design. Não há desenvolvedor na equipe. O Claude Code escreve e outra sessão do Claude revisa. O Thiago testa no celular e decide.
- Explique cada passo de configuração sem pressupor experiência com desenvolvimento.
- Ao terminar uma tarefa, diga o que mudou, como testar no celular passo a passo e o que ficou pendente.
- Se uma regra não estiver aqui nem em docs/, pergunte. Não invente.

## TECNOLOGIA
- App: React Native com Expo, TypeScript. Build pelo EAS.
- Página web da célula: Next.js, lendo o mesmo banco.
- Banco, login e arquivos: Supabase, região São Paulo.
- Funções do servidor: Edge Functions do Supabase. Transcrição pela API da OpenAI. Resumo do culto e chat pela API do Claude.
- Assinatura: RevenueCat, com a compra nativa da App Store e do Google Play.
- Avisos: serviço de notificação do Expo.
- Nenhuma chave de API no app nem no repositório. Segredos ficam no Supabase e no EAS.

## DESIGN
- A referência visual é o repositório do protótipo. Leia os valores no código, não em imagem.
- Estrutura: 5 abas (Hoje, Bíblia, Célula, Igreja, Eu), botão do chat e oração como painel por cima.
- Fontes: Figtree na interface e Literata no texto bíblico. Texto bíblico em 19.
- Paleta: use a A do protótipo como padrão, no claro e no escuro. O seletor de paletas e o controle Demo eram de teste e não entram no app.
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
- Teste grátis: 7 dias controlados pelo app, sem forma de pagamento.
- Depois do teste: bloqueia tudo para quem não assina. Um plano só, mensal ou anual. A tela de bloqueio mantém Restaurar compra, Baixar meus dados, Sair da conta, Excluir conta e Ajuda.
- Limites do plano: 5 cultos por mês e 20 perguntas por dia no chat.
- Membro que não assinou: fica na lista da célula como inativo e sai da escala.
- Total de dias: não existe sequência. O app mostra o total de dias com leitura ou oração.
- Áudio do culto: o padrão é guardar só o texto. Quando a pessoa escolhe guardar o áudio, ele fica 30 dias.
- Carona: botão que abre o WhatsApp quando o pedido é aceito.
- Exclusão da conta: dados apagados em 30 dias.
- Retirar o consentimento de fé: apaga do servidor o diário, os pedidos de oração e a tradição. No aparelho, eles continuam. Sem consentimento, o banco não aceita gravar esses dados. Dar o consentimento de novo envia o que está no aparelho.
- Denúncia: vai para a equipe do app. O conteúdo some na hora para quem denunciou.
- Conteúdo diário: escrito pela IA. O versículo vem sempre do texto bíblico do app, nunca da IA.
- Chat: só fala de Bíblia e fé cristã, cita só o texto bíblico do app e mostra a fonte. Se a pessoa falar em se machucar, mostra o CVV, telefone 188.

## EM ABERTO, PERGUNTAR ANTES DE CODAR
- Preço do plano. Até lá, R$ 00,00.
- Quem revisa o conteúdo gerado pela IA antes de publicar.
- Quem pode editar horários de culto e acessibilidade da igreja. Nome e endereço vêm dos dados públicos do CNPJ.
- Confirmar se a paleta final é a A.

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
