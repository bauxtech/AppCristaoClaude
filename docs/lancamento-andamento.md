# Lançamento: onde paramos (29/10)

Meta: enviar para as lojas em 31/10. Lançamento realista em 9/11 (4 ou 5/11 se as lojas forem rápidas).

## Feito
- Google Play: Conteúdo do app (classificação, público 18+, Segurança dos dados pelo CSV docs/google-seguranca-dos-dados.csv, ID de publicidade, finanças, saúde), página da loja (textos em docs/loja/google-play.md, ícone, destaque e 8 telas), contato, marketing e país (Brasil).
- Login com Google: cliente Android "acasa Android Google Play" criado com o SHA-1 da chave do Google Play (99:0A:84:1F:57:4A:D0:94:7A:D2:CC:A3:7E:D2:89:E2:21:6F:07:EF). Tela de consentimento OAuth publicada (Em produção).
- Twilio: conta saiu do teste ($20, recarga automática). Token secundário novo colado no Supabase (bloco Twilio Verify). Test OTPs válidos até 30/06/2027.
- RevenueCat (projeto acasa):
  - App Android (com.bauxtech.acasa) com o JSON da conta de serviço revenuecat@app-cristao-dadfa.iam.gserviceaccount.com.
  - App iOS (com.bauxtech.acasa) com a chave de compra .p8, Key ID CVY9Q8H267, Issuer ID 06b170ab-1aad-4dc8-9dce-8ebd085870e6.
  - 12 produtos (6 iOS acasa_<plano>_<mensal|anual>; 6 Android acasa_<plano>:<mensal|anual>, o Completo anual é acasa_completo:anual-1).
  - Entitlements essencial, completo e lider, cada um com 4 produtos.

## Próximo passo
1. RevenueCat > Product catalog > Offerings: criar a oferta "default" (Planos acasa), marcar como atual e criar 6 pacotes Custom:
   essencial_mensal, essencial_anual, completo_mensal, completo_anual (Android anual-1), lider_mensal, lider_anual, cada um com o produto iOS e o Android.
2. RevenueCat > Apps > acasa Android: "Check credentials" (faltava validar compras; o Google pode levar até 36 h). Depois ligar "Google developer notifications".
3. Webhook do RevenueCat para o Supabase e as chaves (secret key no Supabase, chaves públicas no EAS). Passo a passo em docs/servidor-passo-a-passo.md, seção 6.

## Aguardando
- Twilio: aprovação do perfil da empresa (Primary Customer Profile), pedido em 28/10, cerca de 48 h. Sem ela, nenhum SMS sai. Depois de aprovar: testar o login e fazer "Promote to primary" no token secundário.

## Depois
- Conta do revisor: entrar com (11) 90000-1234 e terminar o cadastro; pedir cortesia Líder.
- Chave de avisos da Apple (APNs). Supabase Pro.
- iPad (tela esticada) e imagens de iPad (Claude).
- Versões finais iOS e Android, teste de compra, vídeo do microfone (tablet) no Google, página da versão na Apple, envio (31/10).
- Conferência final por sessão separada do Claude (31/10).
- Site: texto de "Excluir a conta", preços, lacunas da privacidade, roteiro com IA.
