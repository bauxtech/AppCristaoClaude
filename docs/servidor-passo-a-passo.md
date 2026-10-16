# Servidor: o que criar e onde colar cada chave

Regra que vale para tudo: chave secreta nunca vai para o chat nem para o repositório. Ela fica em um destes lugares:

- **Supabase, Edge Functions > Secrets**: chaves que só o servidor usa.
- **EAS (expo.dev), Environment variables**: o que o app precisa saber (endereço do servidor e chaves públicas).
- **Ambiente desta sessão do Claude**: só o token do Supabase, para eu aplicar o banco e publicar as funções.

O código já está pronto e desligado. Cada passo abaixo liga uma parte.

## 1. Supabase (banco, login e arquivos)

1. Crie a conta em supabase.com.
2. Crie o projeto `app-cristao-dev`, região **South America (São Paulo)**. Guarde a senha do banco com você.
3. Em **Account > Access Tokens**, crie um token.
4. Guarde o token no ambiente desta sessão: menu do ambiente no topo da sessão, **Editar**, variável `SUPABASE_ACCESS_TOKEN`.
5. Me mande pelo chat só o **Reference ID** (Project Settings > General). Ele não é segredo.

Com isso eu aplico as tabelas e as regras de acesso, publico as funções e agendo as rotinas diárias.

Depois, em **Project Settings > API**, copie dois valores para o EAS (passo 7):

- Project URL, como `EXPO_PUBLIC_SUPABASE_URL`.
- Chave `anon` (public), como `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

A chave `service_role` **não** vai para lugar nenhum além do próprio Supabase.

## 2. SMS e WhatsApp do login (Twilio)

O login é por código no celular. O Supabase envia o código por um serviço de SMS.

1. Crie a conta em twilio.com.
2. No Supabase, vá em **Authentication > Sign In / Providers > Phone**, escolha Twilio e cole as credenciais.
3. Cada SMS tem custo.
4. Para mandar o código pelo WhatsApp, a conta do Twilio precisa de um remetente de WhatsApp aprovado.

## 3. OpenAI (transcrição do culto)

1. Crie a chave em platform.openai.com.
2. No Supabase, em **Edge Functions > Secrets**, crie `OPENAI_API_KEY`.

## 4. Anthropic (resumo do culto, chat e conteúdo do dia)

1. Crie a chave em console.anthropic.com.
2. No Supabase, em **Edge Functions > Secrets**, crie `ANTHROPIC_API_KEY`.

Modelos decididos em 8/10, depois da comparação de custo e qualidade: o chat usa o Claude Haiku 5.5, e o resumo do culto e o conteúdo do dia usam o Claude Opus 5.5. A transcrição usa o gpt-4o-mini-transcribe da OpenAI. Para trocar sem publicar de novo, crie os segredos `CHAT_MODEL`, `SUMMARY_MODEL`, `CLAUDE_MODEL` ou `OPENAI_TRANSCRIBE_MODEL`. Trocar de modelo muda custo e qualidade, e é uma decisão sua.

## 5. Segredo das rotinas

As funções purge, daily-content, push e revenuecat-webhook são publicadas sem conferir login (verify_jwt = false, em supabase/config.toml), porque quem chama é a rotina ou o RevenueCat. Elas conferem a própria senha no código. Depois de publicar, teste com `select public.call_routine('purge')` e confira a resposta em `net._http_response`.

No Supabase, em **Edge Functions > Secrets**, crie `CRON_SECRET` com uma senha longa qualquer. Ele protege as rotinas diárias: conteúdo do dia, exclusão de contas e limpeza de áudio.

## 6. Lojas e assinatura (Apple, Google e RevenueCat)

1. **Apple Developer** (US$ 99 por ano) e **Google Play Console** (US$ 25, uma vez).
2. Crie os 6 produtos de assinatura. O nome do produto precisa ter o plano e o período, porque o app e o servidor leem o plano pelo nome:

   | Plano | Mensal | Anual |
   | --- | --- | --- |
   | Essencial | `acasa_essencial_mensal` (R$ 14,90) | `acasa_essencial_anual` (R$ 109,90) |
   | Completo | `acasa_completo_mensal` (R$ 24,90) | `acasa_completo_anual` (R$ 179,90) |
   | Líder | `acasa_lider_mensal` (R$ 39,90) | `acasa_lider_anual` (R$ 299,90) |

   - **App Store Connect**: um único grupo de assinaturas com os 6 produtos, nesta ordem de nível: Líder no topo, depois Completo, depois Essencial. Assim a Apple cuida da troca de plano (subir vale na hora, descer vale na renovação). Ao escolher o preço, confira se o valor em real existe na tabela da Apple. Se não existir, me avise o valor mais próximo.
   - **Google Play Console**: 3 assinaturas com os IDs `acasa_essencial`, `acasa_completo` e `acasa_lider`. Cada uma com dois planos-base, de IDs `mensal` e `anual` (o Google não aceita sublinhado no ID do plano-base). O RevenueCat junta os dois, por exemplo `acasa_essencial:anual`, e o servidor lê o plano e o período desse nome.
   - Não crie teste grátis na loja por enquanto: o teste é do nosso servidor. Se a Apple recusar, criamos a oferta de teste nos produtos e trocamos `trial_mode` para `store` (tabela `app_settings`).
3. Crie a conta no RevenueCat e ligue as duas lojas.
4. No RevenueCat:
   - crie 3 entitlements com estes nomes exatos: **`essencial`**, **`completo`** e **`lider`**;
   - ligue cada produto ao entitlement do plano dele (os dois períodos do mesmo plano vão no mesmo entitlement);
   - crie uma offering padrão (current) com os 6 produtos como pacotes.
5. Copie as chaves públicas do SDK para o EAS (passo 7):
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`;
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
6. Configure o webhook no RevenueCat:
   - **URL**: `https://<Reference ID>.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization**: `Bearer ` seguido de uma senha longa.
   - No Supabase, guarde a mesma senha (sem o "Bearer ") como `REVENUECAT_WEBHOOK_SECRET`.
7. Copie a chave secreta da API do RevenueCat (Project settings > API keys > Secret API key, começa com `sk_`) e guarde no Supabase como `REVENUECAT_SECRET_KEY`. É ela que deixa o servidor conferir a compra logo depois que a pessoa paga. Nunca coloque essa chave no app. Com ela, o servidor também confere cada aviso do RevenueCat direto na loja (cobre aviso fora de ordem, troca de plano agendada e "Restaurar compra" em outra conta).
8. Enquanto os testes forem com compra de teste (TestFlight e testadores do Google), guarde no Supabase `REVENUECAT_ALLOW_SANDBOX` com o valor `true`. **Apague esse segredo antes do lançamento**: sem ele, compra de teste não libera plano.

### Limites e funções de cada plano

Ficam na tabela `plan_config` (Supabase > Table Editor). Mudar um número vale na hora, sem versão nova do app:

- `chat_per_day`: perguntas por dia no chat;
- `sermons_per_period`: cultos por mês (no anual, também por mês, a partir do dia da compra);
- `cell_free_members`: membros da célula que entram sem plano (plano Líder);
- `features`: funções liberadas (reading_plans, prayer, church, music, cell, chat, sermon, cell_lead).

A linha `trial` vale para os 7 dias de teste. A tabela `app_settings` guarda `trial_days` e `trial_mode`.

### Teste grátis: um por número

O banco guarda o número de quem já usou o teste em código embaralhado com um segredo. O segredo fica no Vault do Supabase com o nome `trial_pepper` (uma senha longa e aleatória, criada uma vez, antes da migração dos planos). Nunca troque esse segredo depois: os números já guardados deixariam de ser reconhecidos.

### Contas da equipe

Para liberar um plano para alguém da equipe, sem loja: na tabela `subscriptions`, preencha `courtesy_plan` (essencial, completo ou lider) e `courtesy_until` (data final, ou vazio para sem prazo).

## 7. EAS (expo.dev)

Em **Projects > app-cristao > Environment variables**, crie as variáveis abaixo para os ambientes preview e production:

| Variável | De onde vem |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase, Project Settings > API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase, chave anon |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat |

Depois disso, o próximo APK já entra com login por SMS e chat de verdade.

## 8. Avisos no celular

- **Android**: precisa de um projeto no Firebase para os avisos enviados pelo servidor. O EAS pede o arquivo na hora de configurar.
- **iPhone**: o EAS cria a chave de avisos da Apple com a conta de desenvolvedor.
- Os lembretes de leitura e oração já funcionam sem isso, porque são agendados no próprio celular.

## 9. Página web da célula

Se ela for publicada em algum serviço (por exemplo Netlify ou Vercel), coloque estas variáveis no serviço:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Os valores são os mesmos do passo 1.

O endereço público é `acasa.app.br/celulas/<nome>`. O arquivo `web/public/_redirects` já faz o Netlify entregar a página certa para qualquer nome. Na Vercel, isso precisa de uma regra parecida.

A rotina `liberar-enderecos` (em `supabase/setup/rotinas.sql`) libera, todo dia, o endereço de célula parada há 90 dias e apaga os endereços antigos com mais de 30 dias. Rode o arquivo de novo no SQL Editor depois de aplicar a migração `20261016002600_cell_web_address.sql`.

Denúncias feitas pela página ficam na tabela `web_reports`. Para tirar um logo do ar, marque `logo_hidden` na célula, em Table Editor > cells.

## 10. Login com Apple e com Google no iPhone

O código já está no app. Para funcionar, faltam estes passos, todos depois de ter a conta Apple Developer.

**Entrar com Apple**
1. No developer.apple.com, em Certificates, Identifiers & Profiles > Identifiers, abra com.bauxtech.acasa e marque Sign In with Apple. O EAS também faz isso sozinho no primeiro build do iPhone.
2. No Supabase, vá em Authentication > Sign In / Providers > Apple e ligue.
3. Em Client IDs, coloque `com.bauxtech.acasa`. A chave secreta não é necessária, porque o login é feito pelo próprio iPhone.

**Entrar com Google no iPhone**
1. No Google Cloud, no mesmo projeto do cliente Web e do "acasa Android", vá em APIs e serviços > Credenciais > Criar credenciais > ID do cliente OAuth.
2. Tipo: iOS. Nome: acasa iOS. ID do pacote: `com.bauxtech.acasa`.
3. Copie o ID do cliente, que termina em `.apps.googleusercontent.com`.
4. No expo.dev, em Environment variables, crie `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` com esse valor, nos ambientes preview e production. Ele não é segredo.
5. No Supabase, em Authentication > Sign In / Providers > Google, acrescente esse ID no campo Client IDs, separado do ID Web por vírgula.
6. No mesmo lugar, ligue "Skip nonce checks". O Google no iPhone manda um número de uso único que o app não consegue repassar ao Supabase. Sem essa opção, o login com Google no iPhone falha.

Sem o passo 4, o botão do Google não aparece no iPhone e o build não quebra.

## O que ainda depende de decisão

- **Texto bíblico completo:** Bíblia Livre (CC BY 3.0 BR), decidida pelo Thiago. O texto está em supabase/seed/bible_biblia-livre.sql. O advogado confere a licença e o crédito antes do lançamento.
- **Preço do plano.**
- **E-mail para o arquivo de Meus dados:** por enquanto o app baixa o arquivo na hora (função export-data) e a pessoa escolhe onde salvar ou para quem enviar. Mandar por e-mail precisa de um serviço de envio de e-mail, que é mais uma conta.
- **Roteiro e materiais na página web pública:** hoje não aparecem.

## Limites que você precisa conhecer

- **Tamanho e duração do áudio:** a transcrição recusa áudio com mais de uns 23 minutos ou 25 MB. O servidor divide o áudio em partes iguais de até 10 minutos (m4a, mp3 e wav) e junta o texto. O app envia até 50 MB: a gravação do app (24 kbps, cerca de 11 MB por hora) cabe até umas 4 horas. Outros formatos importados (ogg, webm, flac) vão inteiros e só funcionam se forem curtos.
- **Tempo das funções:** as partes são transcritas 4 de cada vez. Um culto de 2 horas vira 12 partes.

## Troca do identificador para com.bauxtech.acasa (12/10)

O app passou a se chamar acasa, com o identificador `com.bauxtech.acasa` e o endereço `acasa://`. Para o Android, isso é um app novo: precisa refazer o que estava ligado ao identificador antigo.

1. **APK novo.** Gere um build novo (eu disparo). O celular instala como outro app; apague o antigo e entre de novo na conta.
2. **Chave de assinatura do Android.** No primeiro build, o EAS pergunta se pode criar uma chave nova para `com.bauxtech.acasa`: responda sim. Depois, em expo.dev > Projects > app-cristao > Credentials > Android > com.bauxtech.acasa, copie a **SHA-1** dessa chave.
3. **Firebase (avisos no celular).**
   - No projeto do Firebase, em Configurações do projeto > Seus apps, clique em **Adicionar app > Android**.
   - Nome do pacote: `com.bauxtech.acasa`. Cole a SHA-1 do passo 2.
   - Baixe o `google-services.json` novo.
   - No EAS, em Environment variables, troque o arquivo da variável `GOOGLE_SERVICES_JSON` pelo novo.
   - Em Credentials > Android > com.bauxtech.acasa, envie de novo a chave da conta de serviço do Firebase em **FCM V1** (a mesma de antes serve).
4. **Login com Google.** No Google Cloud Console (mesmo projeto do Firebase), em APIs e serviços > Credenciais:
   - crie uma credencial **ID do cliente OAuth** do tipo **Android**, com o pacote `com.bauxtech.acasa` e a SHA-1 do passo 2;
   - o ID de cliente **Web** não muda: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e o provedor Google no Supabase continuam iguais.
5. **Lojas e RevenueCat.** Crie os apps nas lojas já com `com.bauxtech.acasa`, e os produtos com os nomes `acasa_<plano>_<mensal|anual>` da tabela da seção 6.

O slug do projeto no EAS continua `app-cristao`: ele não aparece para ninguém e trocar quebraria a ligação com o projeto.
