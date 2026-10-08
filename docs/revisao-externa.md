# Para os revisores de fora

O app guarda dado de fé e pedido de oração, que são dados sensíveis pela LGPD (art. 5º, II, e art. 11). Antes de abrir ao público, duas pessoas de fora precisam revisar o projeto.

## Advogado (LGPD e lojas)

**Textos que precisam ser escritos ou revisados**
- Termos de Uso.
- Política de Privacidade.
- Texto do consentimento de dados de fé. Hoje ele está na tela de Termos do cadastro e em "Ler sobre os dados de fé".

**Pontos que precisam de parecer**
1. **Consentimento de fé obrigatório:** hoje o cadastro não continua sem ele. Pela LGPD, o consentimento precisa ser livre. Pode ser obrigatório? O que o app deve deixar de fazer quando a pessoa retira?
2. **Retirada do consentimento:** hoje é possível retirar em Configurações > Meus dados. O servidor apaga o diário, os pedidos de oração e a tradição da pessoa e passa a recusar esses dados. No aparelho, eles continuam. Confirmar se isso basta e se leituras da Bíblia, campanhas de oração e participação na célula também contam como dado de fé.
3. **Idade:** só maiores de 18. A pessoa confirma com uma caixa no cadastro e, se informar o aniversário, o app confere a idade. Isso basta?
4. **Exclusão:** a conta fica marcada e é apagada em 30 dias, com opção de cancelar. Os arquivos (áudio, vídeo e foto) são apagados junto.
5. **Exportação:** o arquivo vai para o e-mail da pessoa. O e-mail precisa ser verificado antes?
6. **Página web da célula:**
   - Visitante sem conta deixa nome e telefone para ver o endereço, com caixa de aceite.
   - Também pode deixar um pedido de oração, com caixa de autorização.
   - Os textos e o prazo de guarda desses dados precisam de definição.
7. **Áudio do culto:** a pessoa grava a pregação para uso pessoal. Cabe aviso sobre direito de imagem e voz do pregador?
8. **Denúncias:** quem da equipe lê e em quanto tempo responde.
9. **Fornecedores que recebem dados:**
   - Supabase: banco em São Paulo.
   - OpenAI: áudio do culto, para transcrição.
   - Anthropic: texto do culto e perguntas do chat.
   - Twilio: telefone, para o código de login.
   - RevenueCat, Apple e Google: assinatura.
   - Expo: avisos.

   É preciso citá-los na política e verificar a transferência internacional (art. 33).

## Revisão de segurança (alguém de fora com experiência em Supabase)

**O que revisar**
- `supabase/migrations/`: tabelas, regras de acesso (RLS) e funções.
- `supabase/setup/rotinas.sql`: rotinas diárias com pg_cron e pg_net, senha lida do Vault. Conferir que anon e authenticated têm uso do schema net e execução de net.http_post (padrão do pg_net no Supabase) e se convém revogar.
- `supabase/functions/`: funções do servidor.
- `src/lib/supabase.ts` e `src/lib/store.ts`: como o app fala com o servidor e com a loja.
- `src/lib/sync.ts`: fila que guarda as mudanças no aparelho e envia ao banco.
- Pendente antes da loja: a fila e o estado do app (diário, pedidos de oração, notas) ficam no aparelho em texto aberto, num arquivo da pasta do app. Precisam ser criptografados com chave no armazenamento seguro do celular (expo-secure-store). Na versão web, ficam no localStorage do navegador.

**Testes de permissão**
- Rodam num Postgres local com `npm run test:db`. Hoje são 107 testes.
- A lista completa fica em `supabase/tests/10_permissions.sql`.
- Exemplos:
  - outra célula tenta ler pedido, telefone, presença e diário, e falha;
  - visitante não vê pedidos;
  - auxiliar só marca presença e edita a escala;
  - ninguém se dá assinatura.

**Pontos para conferir com atenção**
1. Toda tabela tem RLS ligada e forçada. Nenhuma tabela pode ser lida sem login.
2. **Funções com `security definer`:** cada uma confere a permissão antes de agir. Atenção especial a:
   - `cell_member_cards` (telefone só para o líder);
   - `ride_contact`;
   - `leave_contact`;
   - `request_join`.
3. **Página pública:**
   - `public_cell_page` não devolve endereço.
   - `leave_contact` tem só um limite simples (5 por telefone por dia). Falta limite por IP e captcha contra robôs.
   - O código da célula tem 6 caracteres. Falta limite de tentativas.
4. **Assinatura:**
   - Só o servidor escreve em `subscriptions` e `usage_counters`.
   - O webhook do RevenueCat confere o segredo.
   - O chat e o culto conferem a assinatura e os limites no servidor.
5. **Chaves:** nenhuma chave secreta no app nem no repositório. No app só ficam a chave anon do Supabase e as chaves públicas do RevenueCat, que são públicas por desenho.
6. **Dado no aparelho:** enquanto o servidor não está ligado, o app guarda os dados num arquivo da pasta do app, sem criptografia. O backup do Android está desligado. Quando o banco entrar, os dados de outras pessoas deixam de ser gravados no aparelho.
7. **Avisos:** o texto de pedido de oração e de diário não vai no corpo do aviso, que aparece na tela bloqueada.

**Revisão interna já feita:** uma sessão separada do Claude revisou o app. Os pontos de prioridade alta e média já foram corrigidos (commit "Correções da revisão de segurança").
