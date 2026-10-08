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
2. Nas duas lojas, crie uma assinatura com dois períodos:
   - mensal, com o identificador `plano_mensal`;
   - anual, com o identificador `plano_anual`.

   O preço ainda está em aberto.
3. Crie a conta no RevenueCat e ligue as duas lojas.
4. Crie o entitlement **`acesso`** e uma offering padrão com os pacotes mensal e anual.
5. Copie as chaves públicas do SDK para o EAS (passo 7):
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`;
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
6. Configure o webhook no RevenueCat:
   - **URL**: `https://<Reference ID>.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization**: `Bearer ` seguido de uma senha longa.
   - No Supabase, guarde a mesma senha (sem o "Bearer ") como `REVENUECAT_WEBHOOK_SECRET`.

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

## O que ainda depende de decisão

- **Texto bíblico completo:** Bíblia Livre (CC BY 3.0 BR), decidida pelo Thiago. O texto está em supabase/seed/bible_biblia-livre.sql. O advogado confere a licença e o crédito antes do lançamento.
- **Preço do plano.**
- **Quem revisa o conteúdo do dia:** por enquanto ele nasce como rascunho. O segredo `DAILY_AUTO_PUBLISH=true` publica direto.
- **Quem edita os horários de culto e a acessibilidade da igreja.**
- **E-mail para o arquivo de Meus dados:** precisa de um serviço de envio de e-mail, que é mais uma conta.
- **Roteiro e materiais na página web pública:** hoje não aparecem.

## Limites que você precisa conhecer

- **Tamanho do áudio:** a transcrição aceita arquivos de até 25 MB. O app grava a 24 kbps (cerca de 11 MB por hora), então cabe um culto de até 2 horas. Áudio importado maior que 25 MB aparece como falha, com o motivo.
- **Tempo das funções:** as funções do Supabase têm limite de tempo. Um culto muito longo pode precisar ser processado em partes.
