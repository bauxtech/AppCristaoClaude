# O que falta no protótipo: lista e pedidos para o Make

Oct 2, 2026 · @Thiago Oliveira

## Resumo

Para o protótipo ficar completo faltam 141 telas ou partes de tela, 84 cliques para ligar e 52 estados, mais 6 estados que valem para o app inteiro. A conta foi feita no ZIP novo, contra os 15 fluxos do [documento de funcionalidades](https://claude.ai/code/artifact/6464c542-3f43-4e73-b9de-0eb1b8ec43f7).

Do ZIP anterior para este, 4 problemas foram resolvidos: o modo escuro existe, a aba guarda onde a pessoa estava, o controle Demo saiu de cima da tela e o chat parou de recusar perguntas sobre a Bíblia.

| Área | Telas e partes | Cliques | Estados |
| --- | --- | --- | --- |
| Primeiro acesso e login | 7 | 7 | 5 |
| Hoje | 7 | 7 | 4 |
| Bíblia | 11 | 11 | 5 |
| Chat bíblico | 8 | 3 | 3 |
| Oração | 10 | 6 | 4 |
| Culto | 13 | 5 | 4 |
| Igreja, ministérios e cursos | 14 | 8 | 4 |
| Célula | 21 | 14 | 7 |
| Página web da célula | 6 | 0 | 2 |
| Música e perfil | 12 | 6 | 3 |
| Notificações, configurações e sair | 17 | 17 | 3 |
| Assinatura e teste grátis | 9 | 0 | 6 |
| Ajustes das regras decididas | 6 | 0 | 2 |
| Total | 141 | 84 | 52 |

Como usar:

1. Cole o Pedido base no Make.
2. Cole um pedido por vez, na ordem deste doc, e confira o resultado antes de mandar o próximo. Se o Make não der conta de um pedido inteiro, mande primeiro TELAS NOVAS e depois CLIQUES e ESTADOS.
3. Cole por último o pedido de ajustes das regras. Ele corrige pontos dos pedidos anteriores.
4. No fim, mande o ZIP novo e eu confiro tudo de novo.

## Pedido base

Cole este texto no Make antes de qualquer outro pedido. Ele vale para todos os que vêm depois.

```
Este protótipo é o App Cristão. Vou pedir as partes que faltam, um fluxo por vez. Regras para todos os pedidos:

1. Não mude o visual do que já existe. Use as mesmas cores, fontes, cartões e botões.
2. Não apague nem renomeie telas. Só acrescente telas e ligue cliques.
3. Todo botão, link ou linha tocável precisa fazer alguma coisa: abrir uma tela, abrir um painel, mudar de estado ou mostrar uma confirmação. Quando o destino fica fora do app (Spotify, YouTube, WhatsApp, mapa), mostre uma confirmação curta, do tipo "Abrindo o Spotify".
4. Toda tela nova tem botão de voltar e devolve a pessoa para onde ela estava.
5. Toda lista tem três versões: com itens, vazia e carregando. Toda ação que salva mostra uma confirmação curta.
6. Use dados de exemplo iguais em todas as telas: mesmos nomes, mesmas datas, mesmos números.
7. As telas novas funcionam no modo claro e no escuro.
8. Para os estados que não aparecem sozinhos (sem internet, erro, carregando, limite atingido), acrescente opções no controle Demo, abaixo do aparelho.
9. No fim de cada pedido, liste as telas que você criou e os cliques que ligou.
```

## Primeiro acesso e login

As 10 telas do cadastro existem, mas o caminho tem buracos: não há onde digitar o celular, o Google e a Apple caem na tela de código por SMS e a escolha de célula no fim é ignorada.

**Telas e partes que faltam (7):** digitar o celular; Termos de Uso completos; Dados de fé completos; escolher foto; convite recebido; bem-vindo de volta; recuperar conta.

**Cliques sem destino ou com destino errado (7):** Reenviar código; Ler completo; Adicionar foto; Entrar com Google e com Apple caem na tela de código por SMS; Começar ignora a escolha de célula; as opções de acessibilidade da primeira tela não mudam nada; os Termos citados no rodapé de Entrar não abrem.

**Estados que faltam (5):** número inválido; código errado; código expirado; sem internet; busca de igreja sem resultado.

Pedido para o Make:

```
Fluxo: primeiro acesso e login. Arquivo: Onboarding.

TELAS NOVAS
1. Digitar o celular. Abre ao tocar em "Número de celular". Campo com DDD e número, escolha entre SMS e WhatsApp e botão Enviar código. Hoje o número já aparece pronto na tela seguinte.
2. Termos de Uso completos. Abre pelo "Ler completo" do cartão e pelo nome no rodapé da tela Entrar. Texto com rolagem e Voltar. Abrir o texto não marca o aceite.
3. Dados de fé completos. Mesma coisa, para o segundo cartão.
4. Escolher foto. Painel que sobe ao tocar em "Adicionar foto": Tirar foto, Escolher da galeria, Remover.
5. Convite recebido. Para quem abre o app por um link de convite: mostra nome da célula, líder, dia e horário, com "Entrar na célula". Depois de entrar com o celular e aceitar os termos, a pessoa pula nome, tradição, objetivo, horário e igreja e cai na aba Célula como membro.
6. Bem-vindo de volta. Quem já tem conta entra e vai direto para o Hoje, sem refazer o cadastro.
7. Recuperar conta. Link "Perdi acesso ao meu número" na tela Entrar: recuperar por e-mail ou pela conta Google ou Apple vinculada.

CLIQUES
- "Entrar com Google" e "Entrar com Apple" pulam a tela de código e vão para Termos.
- "Reenviar código" mostra "Código reenviado" e uma contagem de 30 segundos.
- Na última tela, "Começar" respeita a escolha: "Entrar por convite" leva para a célula como membro, "Criar uma célula" abre Criar célula e "Fazer isso depois" vai para o Hoje.
- As opções de acessibilidade da primeira tela passam a valer na hora. Fonte grande e Alto contraste ligam as mesmas chaves da tela Aparência.

ESTADOS
- Número inválido.
- Código errado, código expirado e muitas tentativas.
- Sem internet ao entrar.
- Busca de igreja sem resultado, com atalho para Cadastrar à mão.
```

## Hoje

A tela existe inteira, mas quase todo botão leva para a aba e não para o item. O novo usuário não tem como abrir a oração.

**Telas e partes que faltam (7):** player de áudio; reflexão do dia; resposta da "Palavra para agora"; detalhe da sequência de dias; widget do versículo; escala do ministério nos compromissos; atalho para os avisos.

**Cliques sem destino ou com destino errado (7):** Ouvir; Ler capítulo abre a lista de livros; Continuar abre a lista de livros; os compromissos abrem a aba e não o item; Ver pedidos abre a aba Célula e não os pedidos; Abrir no Spotify e Abrir no YouTube; o novo usuário não tem como abrir a oração.

**Estados que faltam (4):** sem plano de leitura; sem compromissos; sem pedidos novos; dia perdido na sequência.

Pedido para o Make:

```
Fluxo: aba Hoje. Arquivo: HomeTab.

TELAS NOVAS
1. Player de áudio. Abre no "Ouvir" da passagem do dia: barra fixa no rodapé com tocar e pausar, velocidade e fechar. O mesmo player vai servir à Bíblia.
2. Reflexão do dia. Cartão novo logo abaixo da passagem, com título e "1 min de leitura". Abre uma tela de texto curto.
3. Palavra para agora. Ao escolher um humor, o cartão mostra um versículo e uma frase curta. O link para o chat continua abaixo.
4. Sequência de dias. Tocar em "12 dias" abre um painel com a semana e o que conta como dia.
5. Widget do versículo do dia para a tela inicial do celular, em dois tamanhos. Pode ser uma tela de demonstração.

CLIQUES
- "Ler capítulo" abre Salmos 23 na Bíblia, não a lista de livros.
- "Continuar" abre a leitura de hoje do plano.
- "Reunião da célula" abre a próxima reunião na aba Célula. "Culto" abre a igreja. "Aula" abre o Curso de batismo.
- "Ver pedidos" abre os pedidos da célula.
- "Abrir no Spotify" e "Abrir no YouTube" mostram a confirmação de saída.
- Acrescente a escala do ministério na lista de compromissos (Louvor, domingo 9h), abrindo Ministérios.
- Acrescente um ícone de avisos no topo, com marca de não lido, abrindo a central de avisos.
- No Hoje do novo usuário, acrescente o cartão "Oração do dia". Hoje ele não tem como abrir a oração.

ESTADOS
- Sem plano de leitura: cartão "Escolher um plano".
- Sem compromissos e sem pedidos novos.
- Dia perdido na sequência.
```

## Bíblia

Hoje todo livro, todo plano e todo resultado de busca abre o mesmo Salmos 23. Falta escolher capítulo, e 8 botões não fazem nada.

**Telas e partes que faltam (11):** capítulos do livro; trocar tradução; player de áudio; mais opções do capítulo; grifar; anotar; compartilhar como imagem; referências cruzadas; contexto do livro; detalhe do plano; Bíblia em Libras.

**Cliques sem destino ou com destino errado (11):** Ouvir; Mais opções; NVI; Grifar; Anotar; Favoritar; Marcar como lido; Adicionar outra tradução; todo livro abre Salmos 23; todo plano abre Salmos 23; as abas de Antigo e Novo Testamento e o campo Buscar livro não filtram.

**Estados que faltam (5):** busca sem resultado; capítulo já lido; tradução não baixada; plano concluído; plano atrasado.

Pedido para o Make:

```
Fluxo: Bíblia. Arquivo: BibleTab.

TELAS NOVAS
1. Capítulos do livro. Tocar num livro abre a grade de capítulos, com os lidos marcados. Hoje todo livro abre Salmos 23.
2. Trocar tradução. Painel no botão "NVI": traduções baixadas e para baixar, com a atual marcada. O mesmo painel serve ao "Adicionar outra tradução" da tela Comparar.
3. Player de áudio do capítulo, no ícone de som do topo: tocar e pausar, velocidade e voz.
4. Mais opções do capítulo, no ícone de três pontos: Contexto do livro, Compartilhar, Bíblia em Libras, Tamanho da letra.
5. Grifar. Escolha entre 4 cores. O versículo fica pintado no texto e pode ser desmarcado.
6. Anotar. Editor de nota presa ao versículo, com Salvar. O versículo ganha uma marca de nota, e tocar nela abre a nota.
7. Compartilhar como imagem. Versículo sobre um fundo, com 3 opções de fundo e Compartilhar. Entra nas ações do versículo.
8. Referências cruzadas. Lista de versículos ligados ao versículo tocado. Entra nas ações do versículo.
9. Contexto do livro: autor, época e tema.
10. Detalhe do plano: dias, leitura de hoje, Começar, escolha entre sozinho e com a célula, e "Retomar de onde parei" quando está atrasado. Hoje todo plano abre Salmos 23.
11. Bíblia em Libras. Vídeo do capítulo com intérprete, com aviso de que por enquanto só há o Novo Testamento.

CLIQUES
- "Favoritar" marca e desmarca o versículo.
- "Marcar como lido e ir para Salmos 24" marca o capítulo e abre o seguinte. Acrescente capítulo anterior e próximo.
- As abas Antigo Testamento e Novo Testamento e o campo "Buscar livro" filtram a lista. Mostre os 66 livros.
- O resultado da busca abre o capítulo certo, com o versículo destacado.
- Versículo citado em nota de culto ou de curso mostra uma marca que abre essa nota.

ESTADOS
- Busca sem resultado.
- Capítulo já lido.
- Tradução ainda não baixada e sem internet.
- Plano concluído e plano atrasado.
```

## Chat bíblico

A conversa funciona em texto. Faltam a voz, o histórico de verdade e a ligação dos versículos com a Bíblia.

**Telas e partes que faltam (8):** pergunta por voz; ouvir a resposta; conversa do histórico aberta; confirmação antes de apagar; pergunta sobre um culto gravado; limite de perguntas; aviso de que igrejas pensam diferente; botão de nova conversa.

**Cliques sem destino ou com destino errado (3):** os versículos citados não abrem a Bíblia; a conversa do histórico só volta ao chat; Apagar histórico.

**Estados que faltam (3):** sem internet; resposta falhou; histórico vazio.

Pedido para o Make:

```
Fluxo: chat bíblico. Arquivo: ChatOverlay.

TELAS NOVAS
1. Pergunta por voz. Botão de microfone ao lado do campo. Estado "ouvindo", com o texto aparecendo, e depois envia.
2. Ouvir a resposta. Botão de som em cada resposta do chat.
3. Conversa do histórico. Tocar numa conversa abre aquela conversa. Hoje só volta ao chat.
4. Apagar histórico. Confirmação antes de apagar e opção de apagar uma conversa só.
5. Pergunta sobre um culto. Quando o chat é aberto a partir de um culto gravado, o topo mostra "Sobre o culto de 3 de outubro" e a resposta cita trechos da pregação.
6. Limite de perguntas. Aviso de quantas restam hoje e tela de limite atingido.

CLIQUES
- Cada versículo citado na resposta abre a Bíblia naquele versículo.
- Acrescente "Nova conversa" no topo.
- Quando o tema divide as igrejas, a resposta termina com a linha "Igrejas pensam diferente sobre isso", que abre uma explicação curta.

ESTADOS
- Sem internet.
- Resposta falhou, com "Tentar de novo".
- Histórico vazio.
```

## Oração

As 7 telas existem, mas nada é salvo e todo tema abre o mesmo momento. A oração só abre por um cartão do Hoje.

**Telas e partes que faltam (10):** escolha de duração e formato; fim do momento; entrada do diário aberta; desbloqueio por biometria; detalhe do pedido; lista de campanhas e nova campanha; oração do dia da campanha; linha do tempo dos respondidos; pedido em vídeo em Libras; entrada fixa para a oração.

**Cliques sem destino ou com destino errado (6):** Salvar do diário; Salvar pedido; Orar o dia 7; todo tema abre "Gratidão, 5 min"; Respondido abre sempre "Saúde da minha mãe"; as entradas do diário e os pedidos não abrem.

**Estados que faltam (4):** diário vazio; sem pedidos; campanha concluída; sem célula para compartilhar.

Pedido para o Make:

```
Fluxo: oração. Arquivo: PrayerModal.

TELAS NOVAS
1. Antes do momento guiado. Ao tocar num tema, a pessoa escolhe a duração (3, 5 ou 10 minutos) e o formato (texto ou áudio). Hoje todo tema abre "Gratidão, 5 min".
2. Fim do momento. Tela de conclusão com "Escrever no diário" e "Fechar".
3. Entrada do diário aberta, com Editar e Apagar.
4. Desbloqueio do diário por biometria, com opção de usar o código do celular.
5. Detalhe do pedido: texto, data, Editar, Apagar, compartilhar ou parar de compartilhar com a célula e quem avisou que orou.
6. Campanhas: lista das campanhas e "Nova campanha", com nome, começo, fim e tipo (oração, jejum ou propósito).
7. Oração do dia da campanha, aberta pelo "Orar o dia 7". Ao concluir, o dia fica marcado.
8. Linha do tempo dos pedidos respondidos, com data e testemunho.
9. Pedido em vídeo em Libras: opção de gravar o pedido em vídeo em vez de escrever.

CLIQUES
- "Salvar" do diário guarda a entrada no topo da lista.
- "Salvar pedido" guarda e volta para a lista.
- "Respondido" abre a tela com o nome do pedido tocado e um campo de data.
- As entradas do diário e os pedidos passam a abrir ao toque.
- Acrescente uma entrada fixa para a oração no Hoje, que vale também para o novo usuário.

ESTADOS
- Diário vazio e lista de pedidos vazia.
- Campanha concluída.
- Pessoa sem célula: a chave "Compartilhar com a célula" aparece desligada, com explicação.
```

## Culto: gravar e transcrever

O caminho feliz existe do aviso ao resumo. Falta tudo em volta: permissão do microfone, ajuste de início e fim, o que fazer com o resultado e o que acontece quando dá errado.

**Telas e partes que faltam (13):** permissão do microfone; confirmação de descarte; ajustar início e fim; dados do culto; ouvir de novo com os momentos; notas e momentos no resultado; mais opções do culto; importar áudio; busca nos cultos; minutos do plano; resumo em áudio; pausar e retomar; perguntar sobre o culto.

**Cliques sem destino ou com destino errado (5):** Transformar em roteiro de célula; Enviar resumo para a célula; os versículos citados não abrem a Bíblia; voltar durante a gravação descarta sem perguntar; quem não tem igreja cadastrada não tem botão de gravar.

**Estados que faltam (4):** transcrição falhou; sem internet; processamento demorado; lista de cultos vazia.

Pedido para o Make:

```
Fluxo: gravar culto. Arquivo: ChurchTab, telas de gravação.

TELAS NOVAS
1. Permissão do microfone. Explicação antes do aviso do sistema e tela para quando a pessoa nega, com atalho para os ajustes.
2. Descartar gravação. Confirmação ao tocar na seta de voltar durante a gravação. Hoje ela sai sem perguntar.
3. Ajustar início e fim. Depois de "Encerrar", a pessoa marca onde a pregação começa e termina e toca em Transcrever.
4. Dados do culto: igreja, pregador, data e tema, já preenchidos e editáveis.
5. Ouvir de novo. Player no resultado, com a lista de momentos marcados. Tocar num momento pula para ele.
6. Notas e momentos. Terceira aba no resultado, com o que a pessoa anotou e marcou.
7. Mais opções do culto: Editar dados, Apagar o áudio e ficar só com o texto, Compartilhar resumo, Excluir.
8. Importar áudio. Botão em "Cultos gravados" para escolher um arquivo e transcrever.
9. Busca nos cultos gravados, por palavra, mostrando o trecho encontrado.
10. Minutos do plano. Quanto resta no mês, na tela antes de gravar, e tela de limite atingido.
11. Resumo em áudio. Botão de ouvir o resumo.

CLIQUES
- "Transformar em roteiro de célula" abre o roteiro da célula já preenchido com o tema e as perguntas.
- "Enviar resumo para a célula" mostra uma prévia e confirma o envio.
- Os versículos citados, ao vivo e no resultado, abrem a Bíblia.
- Acrescente "Perguntar sobre este culto", que abre o chat com o culto no topo.
- Acrescente Pausar e Retomar durante a gravação.
- Quem não tem igreja cadastrada também precisa do botão "Gravar culto". Hoje a tela vazia da aba Igreja não tem.

ESTADOS
- Transcrição falhou, com "Tentar de novo".
- Sem internet: o áudio fica guardado e é enviado depois.
- Processamento demorado: "Pode sair, avisamos quando ficar pronto".
- Lista de cultos vazia.
```

## Igreja, ministérios e cursos

A busca de igreja não mostra resultado, os eventos não existem e o curso só tem a lista de aulas e uma revisão que não responde ao toque.

**Telas e partes que faltam (14):** resultados da busca e confirmação; cadastrar à mão; editar horários e endereço; informar acessibilidade; minhas igrejas; eventos; adicionar ministério; curso por foto; adicionar curso à mão; aula; cartões de revisão; resultado da revisão; prova ou entrega; conclusão do curso.

**Cliques sem destino ou com destino errado (8):** a busca não mostra resultados; Cadastrar à mão; Ver no mapa; Confirmar presença; Pedir troca; Adicionar curso por foto; as opções da revisão não marcam nem corrigem; toda aula abre a mesma revisão.

**Estados que faltam (4):** busca sem resultado; sem ministérios; sem cursos; curso concluído.

Pedido para o Make:

```
Fluxo: igreja, ministérios e cursos. Arquivo: ChurchTab.

TELAS NOVAS
1. Resultados da busca de igreja, com nome, cidade e CNPJ, e tela de confirmação antes de vincular. Filtro "Tem intérprete de Libras".
2. Cadastrar à mão, na aba Igreja: nome, cidade, denominação e endereço.
3. Editar igreja: horários de culto e endereço.
4. Informar acessibilidade: intérprete de Libras e em quais cultos, rampa e lugar reservado.
5. Minhas igrejas: a que frequento e as que visito, com trocar e adicionar.
6. Eventos da igreja: lista, detalhe e "Salvar na minha agenda".
7. Adicionar ministério: onde sirvo, função e próxima escala.
8. Curso por foto: tirar foto do cronograma, conferir as aulas e datas lidas e salvar.
9. Adicionar curso à mão: nome, tipo (batismo, escola de líderes, teologia, encontro), aulas e datas.
10. Aula: presença, material (foto, PDF, áudio), notas e "Gravar aula" com transcrição. Hoje toda aula abre a revisão.
11. Cartões de revisão, com frente e verso, gerados a partir das aulas.
12. Resultado da revisão: acertos e o que rever.
13. Prova ou entrega: data e lembrete.
14. Conclusão do curso: guardar o certificado e registrar o marco no perfil.

CLIQUES
- A busca mostra resultados ao digitar.
- "Cadastrar à mão" abre o formulário, tanto na busca quanto na tela vazia.
- "Ver no mapa" mostra a confirmação de saída.
- "Confirmar presença" muda para "Presença confirmada". "Pedir troca" abre a escolha de com quem trocar.
- Na revisão, tocar numa opção marca, mostra certo ou errado e avança.

ESTADOS
- Busca sem resultado.
- Sem ministérios e sem cursos.
- Curso concluído.
```

## Célula: liderar e participar

É a área com mais coisa faltando, e é a que diferencia o app. O líder vê a semana, mas não consegue editar nada: escala, roteiro, membros e dados da célula são só leitura. No modo "Usuário ativo" a aba ainda abre em "Você ainda não tem uma célula".

**Telas e partes que faltam (21):** editar célula; agenda; editar escala; pedidos de troca; editar roteiro; escolher culto gravado; visitante; membro; mural e enquete; materiais; playlist da semana; aniversários; multiplicação; minhas células; confirmar célula e ler QR code; roteiro completo; escala da semana; novo pedido para a célula; plano de leitura em grupo; silenciar e sair; membros, mural, materiais e playlist para o membro.

**Cliques sem destino ou com destino errado (14):** o usuário ativo cai na tela vazia; Criar célula sem nome ou dia não avisa; Copiar; Enviar link pelo WhatsApp; Editar escala; Montar a partir do culto gravado; Adicionar visitante; os pedidos da visão do líder não abrem; os membros não abrem; a presença não tem salvar; Ver roteiro completo; Pedir, na carona; Confirmar pedido e Anunciar carona; Pedir troca.

**Estados que faltam (7):** célula recém-criada; sem roteiro e sem escala; membro que faltou duas semanas; célula arquivada; código inválido; sem carona; sem pedidos.

São dois pedidos. Primeiro o do líder:

```
Fluxo: célula, criar e liderar. Arquivo: CellTab.

TELAS NOVAS
1. Editar célula: nome, tipo, dia, horário, endereço com ponto de referência e foto de capa. Mudar local ou horário pede confirmação e avisa todos.
2. Agenda: próximas reuniões, cancelar uma reunião e marcar um encontro extra.
3. Editar escala: escolher a pessoa de cada função e acrescentar função.
4. Pedidos de troca de escala, para o líder aprovar.
5. Editar roteiro: cada seção editável, com acrescentar e reordenar. Três formas de começar: do culto gravado, de um tema ou de um plano de leitura.
6. Escolher culto gravado, aberta pelo "Montar a partir do culto gravado", e depois o roteiro gerado para revisar.
7. Visitante: nome e telefone, com lembrete de dar retorno.
8. Membro: papel (líder, auxiliar, anfitrião, membro, visitante), presença, contato e "Remover da célula".
9. Mural: avisos do líder e enquete (criar, votar, ver resultado).
10. Materiais: PDF e imagens para baixar.
11. Playlist da semana: o líder cola os links.
12. Aniversários do mês.
13. Multiplicação: definir o tamanho máximo, sugerir quem lidera a nova célula e dividir os membros.
14. Minhas células: trocar de célula, para quem lidera ou participa de mais de uma.

CLIQUES
- No modo "Usuário ativo", a aba Célula abre na visão do líder. Hoje abre "Você ainda não tem uma célula".
- "Criar célula" sem nome ou sem dia mostra o que falta. Hoje não acontece nada.
- "Copiar" mostra "Código copiado". "Enviar link pelo WhatsApp" mostra a confirmação de saída.
- Os pedidos de oração da visão do líder abrem a lista de pedidos, e voltar retorna para a visão do líder.
- Cada membro da lista abre a tela Membro.
- A tela Presença ganha "Salvar presença".
- A visão do líder ganha atalhos para Mural, Materiais, Playlist, Agenda e Histórico.
- O Histórico ganha os números: reuniões, presença média, visitantes e pedidos respondidos.

ESTADOS
- Célula recém-criada, só com o líder.
- Sem roteiro e sem escala para a semana.
- Membro que faltou duas semanas seguidas.
- Célula arquivada.
```

Depois o de quem participa:

```
Fluxo: célula, participar. Arquivo: CellTab.

TELAS NOVAS
1. Confirmar célula. Depois do código, mostra nome, líder, dia e horário, com "Entrar". Acrescente "Ler QR code" na tela de entrada.
2. Roteiro completo, aberto pelo "Ver roteiro completo".
3. Escala da semana inteira. "Pedir troca" abre a escolha de com quem trocar.
4. Novo pedido para a célula, na tela de pedidos.
5. Plano de leitura em grupo: o plano da célula e o progresso de quem aceitou mostrar.
6. Mais opções da célula: "Silenciar avisos" e "Sair da célula".
7. Membros, Mural, Materiais e Playlist, na versão só de leitura.

CLIQUES
- Na carona, "Pedir" e "Confirmar pedido" mostram "Pedido enviado ao João". "Anunciar carona" mostra a carona anunciada.
- "Vou" e "Não vou" mostram quantos já confirmaram.
- Corrija a data da carona: 7 de outubro é quarta, não quinta.

ESTADOS
- Código inválido ou vencido.
- Sem carona oferecida.
- Sem pedidos na célula.
```

## Página web da célula

Não existe nada dela no protótipo. É a entrada de quem recebe o convite e ainda não tem o app.

**Telas e partes que faltam (6):** página da célula; deixar contato; deixar pedido de oração; confirmação de envio; convite para baixar o app; link inválido ou célula arquivada.

**Estados que faltam (2):** sem roteiro publicado; sem materiais.

Pedido para o Make:

```
Parte nova: página web da célula. É um site, separado do app, para quem recebe o convite e não tem o app. Crie como uma segunda visão do protótipo, em largura de celular e de computador, com as mesmas cores e fontes. Acrescente no controle Demo um botão para alternar entre o app e a página web.

TELAS NOVAS
1. Página da célula: nome, foto de capa, próxima reunião, endereço com ponto de referência, roteiro da semana e materiais.
2. Deixar contato: nome e telefone para o líder, opcional.
3. Deixar um pedido de oração.
4. Confirmação de envio.
5. Convite para baixar o app, com os botões da App Store e do Google Play.
6. Link inválido ou célula arquivada.

ESTADOS
- Sem roteiro publicado.
- Sem materiais.

A página segue as mesmas regras do app: contraste, botões de 44 px e nomes para leitor de tela.
```

## Música e perfil

As telas existem, mas nada abre, nada é editado e todo momento de música leva à mesma playlist.

**Telas e partes que faltam (12):** playlist de cada momento; editar perfil; adicionar marco; nota aberta e nova nota; favoritos e grifos; exportar notas em PDF; tempo de leitura e oração por semana; o que a célula vê de mim; favoritar música; Deezer e marca de vídeo com legenda; música sugerida depois do capítulo e do culto; atalhos para cultos gravados e pedidos respondidos.

**Cliques sem destino ou com destino errado (6):** Spotify e YouTube; todo momento abre "Playlist de oração"; Adicionar marco; os livros do mapa não abrem; as notas não abrem; a busca das anotações não filtra.

**Estados que faltam (3):** perfil de novo usuário; sem anotações; sem marcos.

Pedido para o Make:

```
Fluxo: música e perfil. Arquivo: ProfileTab.

TELAS NOVAS
1. Uma playlist para cada momento (oração, manhã, célula, culto, família). Hoje todos abrem "Playlist de oração".
2. Editar perfil: nome, foto e aniversário.
3. Adicionar marco: tipo, data e descrição. Um marco existente abre para editar ou apagar.
4. Nota aberta: texto completo, origem (Bíblia, culto, curso ou célula), Editar e Apagar. Acrescente "Nova nota".
5. Favoritos e grifos: versículos favoritados e grifados, cada um abrindo a Bíblia.
6. Exportar notas em PDF: escolher o que entra e confirmar.
7. Tempo de leitura e oração por semana.
8. O que a célula vê de mim: prévia com nome, foto e aniversário.

CLIQUES
- "Spotify" e "YouTube" mostram a confirmação de saída. Acrescente Deezer.
- Cada música ganha um botão de favoritar. As favoritas abrem os mesmos links.
- Marque com "Tem legenda" os vídeos que têm legenda.
- Os livros do mapa abrem os capítulos do livro na Bíblia.
- A busca das anotações filtra a lista.
- O perfil ganha atalhos para Cultos gravados e Pedidos respondidos.
- No fim de um capítulo da Bíblia e no resultado de um culto, mostre uma música sugerida.

ESTADOS
- Perfil de novo usuário, com tudo zerado.
- Sem anotações e sem marcos.
```

## Notificações, configurações e sair

É a área com mais cliques sem destino: 17. Sair da conta, excluir conta, passar liderança, baixar dados e bloquear não fazem nada. O modo escuro agora funciona, mas o alto contraste não muda nada e a fonte grande aumenta só parte do texto.

**Telas e partes que faltam (17):** escolher horário; conta e trocar número; gravações; tradição do chat; biometria; ver o que está guardado; baixar meus dados; retirar consentimento; denunciar e lista de bloqueados; ajuda, termos e suporte; sair da célula como membro; escolher novo líder; arquivar célula; conta marcada para exclusão; 6 tipos de aviso; vibração e aviso visual por tipo; tipo de letra e voz do áudio.

**Cliques sem destino ou com destino errado (17):** os avisos da central não abrem; Alterar; Gravações abre Meus dados; as traduções não selecionam; A- e A+; as opções de privacidade; Baixar todos os meus dados; Ver o que está guardado; Retirar consentimento; Bloquear; Alto contraste não muda nada; Fonte grande aumenta só parte do texto; Sair da conta; Passar liderança; Arquivar a célula; Baixar meus dados, na exclusão; Excluir conta permanentemente.

**Estados que faltam (3):** central de avisos vazia; avisos desligados no sistema; líder tentando excluir a conta.

Pedido para o Make:

```
Fluxo: notificações, configurações e sair. Arquivo: ProfileTab.

TELAS NOVAS
1. Escolher horário: para a leitura do dia, o momento de oração e o silêncio (aberta pelo "Alterar").
2. Conta: nome, foto, telefone, e-mail e "Trocar número" (novo número, código, confirmação).
3. Gravações: guardar o áudio ou só o texto, com "só o texto" marcado. Hoje esse item abre Meus dados.
4. Tradição usada pelo chat.
5. Biometria para o diário e as notas.
6. Ver o que está guardado: resumo dos dados por tipo.
7. Baixar meus dados: confirmação de que o arquivo chega por e-mail.
8. Retirar consentimento: o que deixa de funcionar e confirmação.
9. Denunciar: motivo, texto opcional e confirmação. Lista de pessoas bloqueadas, com Desbloquear.
10. Ajuda, termos e contato com o suporte.
11. Sair da célula como membro: o que sai do grupo, o que fica com a pessoa e confirmação.
12. Escolher novo líder, aberta pelo "Passar liderança".
13. Arquivar célula: confirmação.
14. Conta marcada para exclusão: prazo de 30 dias e "Cancelar exclusão".

CLIQUES
- Cada aviso da central abre o item dele. Acrescente marca de não lido.
- Acrescente os avisos que faltam, cada um com sua chave: mudança na célula, pedido novo na célula, aniversário de membro, aula ou prova do curso, escala no ministério e resumo da semana. Para cada tipo, escolha de vibração e aviso visual na tela.
- Em Bíblia e leitura, tocar numa tradução seleciona, e "A-" e "A+" mudam o tamanho. Acrescente tipo de letra e voz do áudio.
- Em Privacidade, tocar numa opção seleciona e atualiza a frase de efeito.
- "Alto contraste" precisa mudar as cores. Hoje a chave liga e nada muda.
- "Fonte grande" precisa aumentar todo o texto. Hoje aumenta só uma parte.
- "Bloquear" pede confirmação e move a pessoa para a lista de bloqueados.
- "Sair da conta" volta para a tela Entrar.
- "Baixar meus dados", na tela de excluir, abre a tela 7.
- "Excluir conta permanentemente" só funciona depois de digitar a frase e leva à tela 14.

ESTADOS
- Central de avisos vazia.
- Avisos desligados no sistema, com atalho para os ajustes.
- Quem lidera célula e tenta excluir a conta: passar a liderança antes.
```

## Assinatura e teste grátis

Não existe nenhuma tela de assinatura no protótipo. O modelo que você definiu: 7 dias grátis depois do login, bloqueio para quem não assina, um plano só (mensal ou anual) e cobrança pela compra nativa da App Store e do Google Play. Assumi que o teste não pede forma de pagamento, porque você descreveu o teste começando logo depois do login.

Com a compra nativa, o Pix só existe no Android. O [Google Play aceita Pix](https://support.google.com/googleplay/answer/2651410?hl=pt-BR&co=GENIE.CountryCode%3DBR), inclusive para renovar assinatura, e ele aparece sozinho na folha de pagamento da loja. A [App Store não aceita Pix](https://support.apple.com/pt-br/111741). No Brasil ela aceita cartão de crédito, Apple Pay e saldo da Conta Apple, que é carregado com cartão-presente.

Na compra nativa, a [Apple cobra](https://developer.apple.com/support/app-distribution-in-brazil/) 10% de comissão mais 5% de processamento de quem está no programa de pequenas empresas, e 21% mais 5% de quem não está.

**Telas e partes que faltam (9):** início do teste; contador do teste; aviso de fim do teste; tela de planos; folha de compra da loja; assinatura confirmada; tela de bloqueio; meu plano; aviso de preço no convite.

**Estados que faltam (6):** teste no último dia; assinatura ativa; compra cancelada na loja; pagamento falhou na renovação; cancelada e ainda ativa; compra restaurada.

Pedido para o Make:

```
Parte nova: assinatura e teste grátis. Regra do produto: 7 dias grátis a partir do primeiro login, sem pedir forma de pagamento. Depois disso, quem não assina fica bloqueado. Existe um plano só, mensal ou anual. A cobrança é sempre pela compra nativa da loja: App Store no iPhone e Google Play no Android. Use R$ 00,00 como valor de exemplo.

TELAS NOVAS
1. Início do teste. Aparece uma vez, no fim do primeiro acesso: "Você tem 7 dias grátis", o que está incluído e a data em que o teste termina.
2. Contador do teste. Linha discreta no topo do Hoje e na aba Eu: "Faltam 5 dias do seu teste". Tocar abre a tela de planos.
3. Aviso de fim do teste. No último dia, cartão no Hoje: "Seu teste termina amanhã", com "Ver plano".
4. Tela de planos. O que o plano inclui, a escolha entre mensal e anual e um botão só, "Assinar". Abaixo do botão: "Restaurar compra", Termos de Uso e Política de Privacidade. Não desenhe formulário de cartão nem tela de Pix. O pagamento acontece na folha de compra da própria loja.
5. Folha de compra da loja. Painel simples de exemplo, "Confirmar assinatura", que sobe ao tocar em "Assinar". Serve só para o fluxo ficar completo no protótipo.
6. Assinatura confirmada. Plano, valor e data da próxima cobrança, com "Continuar".
7. Bloqueio. Tela única para quem terminou o teste sem assinar ou está com a assinatura vencida. Mostra o plano e o botão "Assinar". Mantém acessíveis: Restaurar compra, Baixar meus dados, Sair da conta, Excluir conta e Ajuda. Nenhuma aba abre enquanto a pessoa está bloqueada.
8. Meu plano, em Configurações. Plano atual, próxima cobrança, trocar entre mensal e anual e "Gerenciar assinatura", que leva para a tela de assinaturas da loja. É lá que a pessoa cancela e troca a forma de pagamento.
9. Na tela "Convite recebido" do primeiro acesso, uma linha avisando: "7 dias grátis. Depois, R$ 00,00 por mês".

ESTADOS
- Teste no último dia.
- Assinatura ativa.
- Compra cancelada na folha da loja: volta para a tela de planos, sem mensagem de erro.
- Pagamento falhou na renovação: aviso com prazo para regularizar na loja antes do bloqueio.
- Assinatura cancelada e ainda ativa até o fim do período.
- Compra restaurada em outro aparelho.

No controle Demo, abaixo do aparelho, acrescente: Teste no dia 2, Teste no último dia, Bloqueado e Assinante.
```

## Estados que valem para o app inteiro

O protótipo só mostra o caminho em que tudo dá certo. Faltam 6 coisas que aparecem em qualquer tela e que o Claude Code vai precisar ver desenhadas uma vez.

**O que falta (6):** sem internet; erro; carregando; confirmações; permissões; modo simplificado.

Pedido para o Make:

```
Estados que valem para o app inteiro.

1. Sem internet: faixa no topo com "Sem internet. Bíblia, notas e plano de leitura continuam funcionando". Quando a internet volta, "Sincronizando".
2. Erro: mensagem curta e "Tentar de novo".
3. Carregando: esqueleto nas listas e nos cartões.
4. Confirmação curta no rodapé para salvar, copiar e enviar. Confirmação em painel antes de apagar qualquer coisa.
5. Permissões de microfone, avisos, câmera e fotos. Para cada uma, uma explicação antes do aviso do sistema e uma tela para quando foi negada.
6. Modo simplificado: chave em Aparência que mostra menos elementos por tela.

No controle Demo, abaixo do aparelho, acrescente: Sem internet, Erro, Carregando e Limite atingido.
```

## Ajustes das regras decididas

Este pedido leva para o protótipo as regras que você decidiu. Ele vai por último, porque corrige pontos dos pedidos anteriores.

**Telas e partes que faltam (6):** pedidos de entrada; aguardando aprovação; confirmação de 18 anos; marca de membro inativo; botão do WhatsApp na carona; total de dias.

**Estados que faltam (2):** pedido de entrada recusado; menor de 18.

Pedido para o Make:

```
Ajustes de regras. Este pedido vem depois de todos os outros e corrige pontos deles.

CÉLULA
1. Entrar na célula passa a depender do líder. Depois do código, a pessoa toca em "Pedir para entrar" e vê a tela "Aguardando aprovação do líder". O líder ganha a tela "Pedidos de entrada", com Aprovar e Recusar, e um aviso na visão do líder quando há pedido novo. Se o líder recusa, a pessoa vê "Pedido recusado". Vale também para quem chega por link de convite no primeiro acesso.
2. O auxiliar só marca presença e edita a escala. Roteiro, avisos, membros e dados da célula são só do líder. O anfitrião não tem permissão a mais.
3. O telefone dos membros aparece só para o líder. Os outros veem nome e foto.
4. O visitante vê a reunião, o endereço e o roteiro. Não vê os pedidos de oração.
5. Membro que terminou o teste sem assinar aparece na lista com a marca "Inativo" e sai da escala.
6. Na carona, quando o pedido é aceito, aparece o botão "Falar no WhatsApp". O telefone não é mostrado para a célula.

PÁGINA WEB DA CÉLULA
7. A página mostra só o bairro. O endereço completo aparece depois que a pessoa deixa nome e telefone.

CADASTRO
8. Na tela de Termos, acrescente a caixa "Tenho 18 anos ou mais", obrigatória. Quem não marca vê o aviso de que o app é só para maiores de 18.
9. Na escolha de tradução, deixe disponível só uma tradução de domínio público, com o nome de exemplo "Almeida". NVI, ARA, ACF, NVT, NTLH e A21 aparecem como "Em breve". Faça o mesmo no seletor da Bíblia e em Configurações.

HOJE E PERFIL
10. Não existe sequência de dias. No lugar de "12 dias" e de "dias seguidos", mostre o total de dias em que a pessoa leu ou orou. Tocar abre o mês com esses dias marcados. Remova o estado de dia perdido.

LIMITES
11. Culto: o plano inclui 5 cultos por mês. Antes de gravar, mostre "2 de 5 cultos usados neste mês", no lugar dos minutos.
12. Chat: 20 perguntas por dia. Mostre quantas restam.
13. Áudio do culto: quando a pessoa escolhe guardar, ele fica 30 dias. Mostre a data em que será apagado. O texto fica para sempre.

DENÚNCIA
14. Depois de denunciar, o conteúdo some na hora para quem denunciou, com a mensagem "Recebemos sua denúncia".
```

## Regras decididas e em aberto

Esta parte não vai para o Make. São as regras que nenhuma tela mostra e que o Claude Code precisa saber para codar. 17 pontos estão decididos e 3 continuam em aberto: preço, revisão do conteúdo da IA e dados da igreja.

| Regra | Decisão |
| --- | --- |
| Entrada na célula | O líder aprova cada pessoa. |
| Papéis | O auxiliar marca presença e edita a escala. O anfitrião não tem permissão a mais. |
| Telefone dos membros | Aparece só para o líder. |
| Visitante | Vê reunião, endereço e roteiro. Não vê os pedidos de oração. |
| Endereço na página web | Só o bairro. O endereço completo aparece depois de deixar nome e telefone. |
| Menores de idade | Só maiores de 18 no lançamento. |
| Tradução da Bíblia | Tradução de domínio público no lançamento. As licenciadas entram depois. |
| Teste grátis | 7 dias controlados pelo app, sem forma de pagamento. |
| Depois do teste | Bloqueia tudo para quem não assina. Um plano só, pela compra nativa da loja. |
| Limites do plano | 5 cultos por mês e 20 perguntas por dia no chat. |
| Membro bloqueado | Fica na lista como inativo e sai da escala. |
| Total de dias | Não existe sequência. O app mostra o total de dias com leitura ou oração. |
| Áudio do culto | Fica 30 dias quando a pessoa escolhe guardar. O texto fica para sempre. |
| Carona | Botão que abre o WhatsApp quando o pedido é aceito. |
| Exclusão da conta | Dados apagados em 30 dias. |
| Denúncia | Vai para a equipe do app. O conteúdo some na hora para quem denunciou. |
| Conteúdo diário | Escrito pela IA. |

Em aberto:

1. **Preço do plano.** As telas ficam com R$ 00,00 até você definir.
2. **Revisão do conteúdo da IA.** Só a reflexão do dia é texto novo todo dia. Momentos de oração, planos e playlists são escritos uma vez. Proposta: a IA gera 90 dias de reflexão de uma vez, o versículo vem sempre do texto do app e cada reflexão tem um botão "Avisar erro". Falta definir quem lê cada lote.
3. **Horários e acessibilidade da igreja.** Nome e endereço vêm dos dados públicos do CNPJ. Horário de culto e acessibilidade não existem em base pública, então alguém precisa preencher. Falta definir quem.
