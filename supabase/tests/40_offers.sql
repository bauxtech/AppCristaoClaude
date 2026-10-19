-- Régua de assinatura (19/10). Roda depois de 30_web_address.sql.
-- Pessoas: Lia (ofertas no celular e por e-mail), Gil (só no celular, gravou culto), Noé (sem autorização),
-- Bia (assinante), Edu (já assinou e cancelou).

insert into auth.users (id, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-000000000041', '5511980000041', now()),
  ('00000000-0000-0000-0000-000000000042', '5511980000042', now()),
  ('00000000-0000-0000-0000-000000000043', '5511980000043', now()),
  ('00000000-0000-0000-0000-000000000044', '5511980000044', now()),
  ('00000000-0000-0000-0000-000000000045', '5511980000045', now());

-- Sábado, 17/10/2026, 10h em São Paulo, no passado: o teste de todos (começou 9 dias antes) já acabou.
\set sab '''2026-10-17 13:00:00+00'''
update public.subscriptions set trial_start = :sab::timestamptz - interval '9 days'
  where user_id in ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000043',
                    '00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000045');
update public.subscriptions set status = 'active', plan = 'completo', renews_at = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000044';
update public.subscriptions set status = 'expired', plan = 'essencial', renews_at = now() - interval '10 days' where user_id = '00000000-0000-0000-0000-000000000045';
insert into public.sermons (user_id, title, status) values ('00000000-0000-0000-0000-000000000042', 'Culto', 'ready');

-- Autorizações, pelo app (a própria pessoa).
select tests.as_user('00000000-0000-0000-0000-000000000041');
update public.profiles set email = 'lia@exemplo.com', offers_push = true, offers_email = true where id = auth.uid();
select tests.ok('quem autoriza ofertas fica com a data do aceite do servidor',
  (select offers_push_at is not null and offers_email_at is not null from public.profiles where id = auth.uid()));
update public.profiles set offers_token = gen_random_uuid() where id = auth.uid();
reset role;
select tests.ok('o código do descadastro não muda pelo app',
  (select offers_token from public.profiles where id = '00000000-0000-0000-0000-000000000041') is not null);
select tests.as_user('00000000-0000-0000-0000-000000000042');
update public.profiles set offers_push = true, offers_email = true where id = auth.uid();
select tests.ok('sem e-mail, não há oferta por e-mail', (select not offers_email and offers_email_at is null from public.profiles where id = auth.uid()));
select tests.ok('ninguém lê o que a régua enviou nem a fila de e-mails',
  tests.denied($$select * from public.offer_sends$$) and tests.denied($$select * from public.email_outbox$$) and tests.denied($$select * from public.paywall_events$$));
select tests.ok('o app não roda a régua', tests.denied($$select public.offer_cadence()$$));
select tests.ok('o app não usa o descadastro de outra pessoa', tests.denied($$select public.unsubscribe_offers(gen_random_uuid())$$));
reset role;
update public.profiles set offers_push = true where id in ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000045');

-- Dia 10.
select public.offer_cadence(:sab::timestamptz);
select tests.ok('dia 10: aviso no celular para quem autorizou',
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000041' and title = 'A Bíblia continua grátis no acasa' and href = '/assinatura?origem=regua-10'));
select tests.ok('sem autorização, nada é enviado', not exists (select 1 from public.offer_sends where user_id = '00000000-0000-0000-0000-000000000043'));
select tests.ok('assinante não recebe a régua', not exists (select 1 from public.offer_sends where user_id = '00000000-0000-0000-0000-000000000044'));
select tests.ok('quem já assinou e cancelou não entra nesta régua', not exists (select 1 from public.offer_sends where user_id = '00000000-0000-0000-0000-000000000045'));
select tests.ok('o mesmo passo não se repete', public.offer_cadence(:sab::timestamptz) = 0);
select tests.ok('no máximo um contato por semana', public.offer_cadence(:sab::timestamptz + interval '3 days') = 0);

-- Dia 17: e-mail com o resumo do teste. Gil não tem e-mail: o passo é pulado para ele.
select public.offer_cadence(:sab::timestamptz + interval '7 days');
select tests.ok('dia 17: e-mail com o que a pessoa fez no teste e os planos, sem preço',
  exists (select 1 from public.email_outbox where user_id = '00000000-0000-0000-0000-000000000041' and step = 17 and body like 'Durante o teste, você leu 0 capítulos%' and body like '%Completo:%' and body not like '%R$%'));
select tests.ok('sem e-mail, o passo do e-mail é pulado', exists (select 1 from public.offer_sends where user_id = '00000000-0000-0000-0000-000000000042' and step = 17 and channel = 'none'));

-- Dia 24 (sábado 31/10): só quem gravou culto.
select public.offer_cadence(:sab::timestamptz + interval '14 days');
select tests.ok('dia 24, sábado: quem gravou culto recebe o aviso do culto',
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000042' and title = 'Amanhã tem culto?'));
select tests.ok('quem não gravou culto não recebe o aviso do culto',
  not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000041' and title = 'Amanhã tem culto?'));

-- Dia 31: plano anual, no celular e por e-mail.
select public.offer_cadence(:sab::timestamptz + interval '21 days');
select tests.ok('dia 31: oferta do anual no celular e por e-mail',
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000041' and title = 'Plano anual do acasa')
  and exists (select 1 from public.email_outbox where user_id = '00000000-0000-0000-0000-000000000041' and step = 31));

-- Descadastro pelo link do e-mail.
select tests.ok('o link do e-mail acha a pessoa', public.unsubscribe_offers((select offers_token from public.profiles where id = '00000000-0000-0000-0000-000000000041')));
select tests.ok('o link do e-mail desliga só as ofertas por e-mail',
  (select not offers_email and offers_push from public.profiles where id = '00000000-0000-0000-0000-000000000041'));

-- Dia 60: lembra o que a pessoa usou.
select public.offer_cadence(:sab::timestamptz + interval '50 days');
select tests.ok('dia 60: quem gravou culto recebe o lembrete do culto',
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000042' and title = 'Grave o culto com o acasa'));
select tests.ok('dia 60: quem saiu do e-mail não recebe e-mail', not exists (select 1 from public.email_outbox where user_id = '00000000-0000-0000-0000-000000000041' and step = 60));

-- Depois do dia 97, a régua para.
select tests.ok('depois do dia 97, a régua para', public.offer_cadence(:sab::timestamptz + interval '100 days') = 0);

-- Retirar a autorização para tudo na hora.
update public.profiles set offers_push = false where id = '00000000-0000-0000-0000-000000000042';
select public.offer_cadence(:sab::timestamptz + interval '80 days');
select tests.ok('quem desliga as ofertas não recebe mais nada', not exists (select 1 from public.offer_sends where user_id = '00000000-0000-0000-0000-000000000042' and step = 90));

-- Origem da tela de planos.
select tests.as_user('00000000-0000-0000-0000-000000000043');
select public.log_paywall('view', 'cadeado', 'sermon');
select public.log_paywall('purchase', 'cadeado', 'sermon');
reset role;
select tests.ok('o app registra de onde a pessoa chegou à tela de planos e a compra',
  (select count(*) from public.paywall_events where user_id = '00000000-0000-0000-0000-000000000043') = 2);
select tests.as_anon();
select tests.ok('sem login, nada é registrado', tests.denied($$select public.log_paywall('view', 'x')$$));
reset role;
