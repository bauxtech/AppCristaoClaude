-- Planos, teste grátis e bloqueio por função. Roda depois de 10_permissions.sql (usa as ajudas tests.*).
-- Pessoas novas: Ivo (teste), Jô (entra pelo Google, sem celular), Kátia (mesmo celular do Ivo),
-- Lia (Essencial), Mauro (Completo), Nina (Líder), Otto e Pia (sem plano, na célula da Nina).

insert into auth.users (id, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-000000000021', '5511980000001', now()),
  ('00000000-0000-0000-0000-000000000022', null, null),
  ('00000000-0000-0000-0000-000000000024', '5511980000004', now()),
  ('00000000-0000-0000-0000-000000000025', '5511980000005', now()),
  ('00000000-0000-0000-0000-000000000026', '5511980000006', now()),
  ('00000000-0000-0000-0000-000000000027', '5511980000007', now()),
  ('00000000-0000-0000-0000-000000000028', '5511980000008', now());
update public.profiles set faith_consent = true, faith_consent_at = now() where id::text like '00000000-0000-0000-0000-00000000002%';

-- ─── Teste grátis ────────────────────────────────────────────────────────────

select tests.ok('conta nova com celular começa o teste', public.plan_of('00000000-0000-0000-0000-000000000021') = 'trial');
select tests.ok('o teste termina à meia-noite depois do 7º dia, no horário de Brasília',
  (select (public.trial_end(trial_start) at time zone 'America/Sao_Paulo')::time = '00:00'
     and (public.trial_end(trial_start) at time zone 'America/Sao_Paulo')::date = (trial_start at time zone 'America/Sao_Paulo')::date + 7
   from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000021'));
select tests.ok('conta pelo Google sem celular não começa o teste', public.plan_of('00000000-0000-0000-0000-000000000022') = 'free');
select tests.as_user('00000000-0000-0000-0000-000000000022');
select tests.ok('sem celular confirmado, pedir o teste não adianta', not public.start_my_trial());
reset role;
update auth.users set phone = '5511980000002', phone_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000022';
select tests.as_user('00000000-0000-0000-0000-000000000022');
select tests.ok('depois de confirmar o celular, o teste começa (sozinho, pelo servidor)', public.start_my_trial());
select tests.ok('a pessoa vê o próprio plano', (public.my_access() ->> 'plan') = 'trial');
reset role;

-- Pedir o código não gasta o teste: só confirmar.
insert into auth.users (id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000029', '5511980000009', null);
select tests.ok('pedir o código SMS sem confirmar não começa o teste nem gasta o número', public.plan_of('00000000-0000-0000-0000-000000000029') = 'free'
  and not exists (select 1 from public.trial_claims where phone_hash = public.phone_hash('5511980000009')));
update auth.users set phone_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000029';
select tests.ok('ao digitar o código, o teste começa', public.plan_of('00000000-0000-0000-0000-000000000029') = 'trial');
-- Teste da loja: o servidor não dá teste.
update public.app_settings set value = '"store"' where key = 'trial_mode';
insert into auth.users (id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-00000000002a', '5511980000010', now());
select tests.ok('com o teste da loja ligado, o servidor não dá teste', public.plan_of('00000000-0000-0000-0000-00000000002a') = 'free');
update public.app_settings set value = '"server"' where key = 'trial_mode';
select tests.ok('o número fica guardado em código com segredo, não em texto', not exists (select 1 from public.trial_claims where phone_hash like '%5511%'));

-- Outra conta com o mesmo número do Ivo.
insert into auth.users (id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000023', '+55 (11) 98000-0001', now());
select tests.ok('um teste por número: outra conta com o mesmo celular não ganha teste', public.plan_of('00000000-0000-0000-0000-000000000023') = 'free');
delete from auth.users where id = '00000000-0000-0000-0000-000000000023';
insert into auth.users (id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000023', '5511980000001', now());
select tests.ok('excluir a conta e criar de novo com o mesmo número não dá outro teste', public.plan_of('00000000-0000-0000-0000-000000000023') = 'free');

select tests.as_user('00000000-0000-0000-0000-000000000021');
select tests.ok('ninguém lê a lista de números que já usaram o teste', tests.denied($$select * from public.trial_claims$$));
select tests.ok('ninguém muda os limites dos planos pelo app', tests.denied($$update public.plan_config set chat_per_day = 999$$));
select tests.ok('ninguém consulta o plano de outra pessoa', tests.denied($$select public.plan_of('00000000-0000-0000-0000-000000000024')$$) and tests.denied($$select public.can('00000000-0000-0000-0000-000000000024', 'prayer')$$));
select tests.ok('ninguém calcula o código de um número pelo app', tests.denied($$select public.phone_hash('5511999999999')$$));
select tests.ok('ninguém muda a configuração do teste pelo app', tests.denied($$update public.app_settings set value = '30' where key = 'trial_days'$$));
select tests.ok('no teste, tudo liberado', tests.allowed($$insert into public.prayer_diary (user_id, text) values (auth.uid(), 'Diário do teste')$$));
select public.mark_paywall_seen();
select tests.ok('a tela de planos do dia 8 fica marcada como vista', (public.my_access() ->> 'paywall_seen')::boolean);
reset role;

-- ─── Depois do teste, sem plano ──────────────────────────────────────────────

update public.subscriptions set trial_start = now() - interval '8 days' where user_id = '00000000-0000-0000-0000-000000000021';
select tests.as_user('00000000-0000-0000-0000-000000000021');
select tests.ok('teste vencido: plano grátis', (public.my_access() ->> 'plan') = 'free');
select tests.ok('Bíblia continua grátis: anotar versículo', tests.allowed($$insert into public.bible_notes (user_id, verse_key, text) values (auth.uid(), 'joao:3:16', 'nota')$$));
select tests.ok('Bíblia continua grátis: marcar capítulo como lido', tests.allowed($$insert into public.bible_reads (user_id, book, chapter) values (auth.uid(), 'joao', 3)$$));
select tests.ok('diário criado no teste continua visível', tests.rows($$select * from public.prayer_diary where user_id = auth.uid()$$) = 1);
select tests.ok('sem plano, não escreve diário novo', tests.denied($$insert into public.prayer_diary (user_id, text) values (auth.uid(), 'novo')$$));
select tests.ok('sem plano, não edita o diário antigo (só leitura)', tests.denied($$update public.prayer_diary set text = 'mudou' where user_id = auth.uid()$$));
select tests.ok('sem plano, não cria pedido de oração, plano de leitura, igreja, música nem conversa',
  tests.denied($$insert into public.prayer_requests (user_id, text) values (auth.uid(), 'x')$$)
  and tests.denied($$insert into public.reading_plans (user_id, name, books, days) values (auth.uid(), 'Plano', '{joao}', 21)$$)
  and tests.denied($$insert into public.ministries (user_id, data) values (auth.uid(), '{}')$$)
  and tests.denied($$insert into public.favorite_songs (user_id, title, artist) values (auth.uid(), 'Lugar Secreto', 'Gabriela Rocha')$$)
  and tests.denied($$insert into public.chat_conversations (user_id, title) values (auth.uid(), 'x')$$));
select tests.ok('sem plano, não grava culto', tests.denied($$insert into public.sermons (user_id, title) values (auth.uid(), 'x')$$));
select tests.ok('sem plano, não cria célula', tests.denied($$select public.create_cell('Nova', null, 1, '20:00', null, null, 'Centro')$$));
select tests.ok('apagar o que é seu continua permitido', tests.allowed($$delete from public.prayer_diary where user_id = auth.uid()$$));
reset role;

-- ─── Essencial, Completo e Líder ─────────────────────────────────────────────

update public.subscriptions set status = 'active', plan = 'essencial', period_start = now() - interval '3 days', renews_at = now() + interval '27 days' where user_id = '00000000-0000-0000-0000-000000000024';
update public.subscriptions set status = 'active', plan = 'completo', period_start = now() - interval '3 days', renews_at = now() + interval '27 days' where user_id = '00000000-0000-0000-0000-000000000025';
update public.subscriptions set status = 'active', plan = 'lider', period_start = now() - interval '3 days', renews_at = now() + interval '27 days' where user_id = '00000000-0000-0000-0000-000000000026';
update public.subscriptions set trial_start = now() - interval '20 days' where user_id in ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000028');

select tests.ok('Essencial: chat com 5 perguntas por dia',
  (select count(*) from generate_series(1, 5) g where (public.use_limit('00000000-0000-0000-0000-000000000024', 'chat') ->> 'ok')::boolean) = 5
  and (public.use_limit('00000000-0000-0000-0000-000000000024', 'chat') ->> 'reason') = 'limit');
select tests.ok('o aviso de limite traz quando o chat zera (meia-noite em Brasília)',
  ((public.use_limit('00000000-0000-0000-0000-000000000024', 'chat') ->> 'resets_at')::timestamptz at time zone 'America/Sao_Paulo')::time = '00:00');
select tests.ok('Essencial: sem gravação de culto', (public.use_limit('00000000-0000-0000-0000-000000000024', 'sermon') ->> 'reason') = 'no_access');
select tests.ok('Completo: 10 perguntas por dia',
  (select count(*) from generate_series(1, 11) g where (public.use_limit('00000000-0000-0000-0000-000000000025', 'chat') ->> 'ok')::boolean) = 10);
select tests.ok('Completo: 4 cultos no mês, e o aviso traz quando renova (um mês depois da compra)',
  (select count(*) from generate_series(1, 5) g where (public.use_limit('00000000-0000-0000-0000-000000000025', 'sermon') ->> 'ok')::boolean) = 4
  and (public.use_limit('00000000-0000-0000-0000-000000000025', 'sermon') ->> 'resets_at')::timestamptz = (select period_start + interval '1 month' from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000025'));
update public.subscriptions set period_start = now(), renews_at = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000025';
select tests.ok('novo período da assinatura: o contador de cultos zera', (public.use_limit('00000000-0000-0000-0000-000000000025', 'sermon') ->> 'ok')::boolean);
-- Anual: comprado há 40 dias, o contador está no segundo mês (4 por mês, não 4 por ano).
update public.subscriptions set billing = 'annual', period_start = now() - interval '40 days', renews_at = now() + interval '325 days' where user_id = '00000000-0000-0000-0000-000000000025';
select tests.ok('anual: os cultos contam por mês, a partir do dia da compra',
  (select period from public.limit_info('00000000-0000-0000-0000-000000000025', 'sermon')) = (select 'p' || to_char((period_start + interval '1 month') at time zone 'UTC', 'YYYYMMDDHH24MISS') from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000025')
  and (select resets_at from public.limit_info('00000000-0000-0000-0000-000000000025', 'sermon')) = (select period_start + interval '2 months' from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000025'));
select tests.ok('Líder: 8 cultos no período',
  (select count(*) from generate_series(1, 9) g where (public.use_limit('00000000-0000-0000-0000-000000000026', 'sermon') ->> 'ok')::boolean) = 8);
select tests.ok('teste: 10 perguntas e 2 cultos',
  (select count(*) from generate_series(1, 11) g where (public.use_limit('00000000-0000-0000-0000-000000000022', 'chat') ->> 'ok')::boolean) = 10
  and (select count(*) from generate_series(1, 3) g where (public.use_limit('00000000-0000-0000-0000-000000000022', 'sermon') ->> 'ok')::boolean) = 2);
update public.plan_config set chat_per_day = 6 where plan = 'essencial';
select tests.ok('limite mudado no painel vale na hora, sem versão nova do app', (select lim from public.limit_info('00000000-0000-0000-0000-000000000024', 'chat')) = 6);
update public.plan_config set chat_per_day = 5 where plan = 'essencial';
select tests.as_user('00000000-0000-0000-0000-000000000024');
select tests.ok('pessoa não conta limite sozinha', tests.denied($$select public.use_limit(auth.uid(), 'chat')$$));
select tests.ok('o cadeado sabe em que plano está cada função',
  (public.my_access() -> 'min_plan' ->> 'sermon') = 'completo' and (public.my_access() -> 'min_plan' ->> 'cell_lead') = 'lider' and (public.my_access() -> 'min_plan' ->> 'prayer') = 'essencial');
select tests.ok('Essencial: escreve diário', tests.allowed($$insert into public.prayer_diary (user_id, text) values (auth.uid(), 'ok')$$));
select tests.ok('Essencial: não cria célula', tests.denied($$select public.create_cell('Nova', null, 1, '20:00', null, null, 'Centro')$$));
reset role;

-- ─── Célula do plano Líder ───────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-000000000026');
select public.create_cell('Célula da Nina', null, 3, '20:00', 'Rua A, 1', null, 'Moema', '10000000-0000-0000-0000-000000000009');
reset role;
update public.cells set invite_code = 'NINA01' where id = '10000000-0000-0000-0000-000000000009';
select tests.as_user('00000000-0000-0000-0000-000000000027');
select tests.ok('sem plano, entra pelo convite na célula de quem tem o Líder', tests.runs($$select * from public.request_join('NINA01')$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000028');
select public.request_join('NINA01');
reset role;
select set_config('request.jwt.claims', '{}', false);
update public.cell_members set status = 'approved', joined_at = now() - interval '2 days' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000027';
update public.cell_members set status = 'approved', joined_at = now() - interval '1 day' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';

select tests.as_user('00000000-0000-0000-0000-000000000026');
select tests.ok('líder com o plano Líder escreve aviso no mural', tests.allowed($$insert into public.cell_board (cell_id, author_id, text) values ('10000000-0000-0000-0000-000000000009', auth.uid(), 'Bem-vindos')$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000027');
select tests.ok('membro sem plano usa as funções da célula do Líder (confirma presença)', tests.allowed($$insert into public.cell_rsvps (cell_id, meeting_date, user_id, going) values ('10000000-0000-0000-0000-000000000009', current_date + 1, auth.uid(), true)$$));
select tests.ok('membro sem plano compartilha pedido com a célula', tests.allowed($$insert into public.prayer_requests (user_id, text, shared_cell_id) values (auth.uid(), 'Pela família', '10000000-0000-0000-0000-000000000009')$$));
select tests.ok('mas não ganha as funções pessoais (diário)', tests.denied($$insert into public.prayer_diary (user_id, text) values (auth.uid(), 'x')$$));
select tests.ok('a célula aparece como funcionando para ele', (public.my_access() -> 'cells' -> '10000000-0000-0000-0000-000000000009' ->> 'can_use')::boolean);
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000028');
select tests.ok('membro não muda a própria data de entrada para furar a fila das vagas',
  tests.denied($$update public.cell_members set joined_at = '2000-01-01' where user_id = auth.uid()$$)
  and tests.denied($$update public.cell_members set requested_at = '2000-01-01' where user_id = auth.uid()$$));
reset role;

-- Vagas (14/10): quem o líder aprova como membro pega a vaga livre na hora. Com o limite em 1, o segundo fica sem vaga.
update public.plan_config set cell_free_members = 1 where plan in ('lider', 'trial');
insert into public.cell_playlist (cell_id, title) values ('10000000-0000-0000-0000-000000000009', 'Hino');
-- O segundo é aprovado de novo com o limite já em 1: não há vaga livre para ele.
select set_config('request.jwt.claims', '{}', false);
update public.cell_members set status = 'pending' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
update public.cell_members set status = 'approved' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
select tests.ok('as vagas são de quem foi aprovado primeiro',
  public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000027') = 'seat'
  and public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028') = 'none');
select tests.as_user('00000000-0000-0000-0000-000000000028');
select tests.ok('sem vaga: ainda confirma presença', tests.allowed($$insert into public.cell_rsvps (cell_id, meeting_date, user_id, going) values ('10000000-0000-0000-0000-000000000009', current_date + 1, auth.uid(), true)$$));
select tests.ok('sem vaga: vê a reunião', tests.runs($$select * from public.cell_meetings where cell_id = '10000000-0000-0000-0000-000000000009'$$));
select tests.ok('sem vaga: não vê os avisos do mural', tests.rows($$select * from public.cell_board where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0);
select tests.ok('sem vaga: não vê os pedidos de oração da célula', tests.rows($$select * from public.prayer_requests where shared_cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0);
select tests.ok('sem vaga: não vê a escala', tests.rows($$select * from public.cell_schedule where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0);
select tests.ok('sem vaga: não compartilha pedido com a célula', tests.denied($$insert into public.prayer_requests (user_id, text, shared_cell_id) values (auth.uid(), 'x', '10000000-0000-0000-0000-000000000009')$$));
select tests.ok('o app sabe que ele está sem vaga', (public.my_access() -> 'cells' -> '10000000-0000-0000-0000-000000000009' ->> 'seat') = 'none'
  and not (public.my_access() -> 'cells' -> '10000000-0000-0000-0000-000000000009' ->> 'can_use')::boolean);
select tests.ok('sem vaga: não vê carona, materiais, playlist nem enquetes',
  tests.rows($$select * from public.cell_rides where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0
  and tests.rows($$select * from public.cell_materials where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0
  and tests.rows($$select * from public.cell_playlist where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0
  and tests.rows($$select * from public.cell_polls where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0);
select tests.ok('membro comum não vê quem está inativo (quem não paga)',
  (select active from public.cell_member_cards('10000000-0000-0000-0000-000000000009') where user_id = '00000000-0000-0000-0000-000000000027') is null);
select tests.ok('membro não vê a vaga dos outros', (select seat from public.cell_member_cards('10000000-0000-0000-0000-000000000009') where user_id = '00000000-0000-0000-0000-000000000027') is null);
select tests.ok('membro não se dá uma vaga', tests.denied($$select public.set_member_seat('10000000-0000-0000-0000-000000000009', auth.uid(), true)$$));
select tests.ok('membro não grava vaga direto na tabela', tests.denied($$insert into public.cell_seats (cell_id, user_id) values ('10000000-0000-0000-0000-000000000009', auth.uid())$$));
select tests.ok('membro não lê a vaga dos outros na tabela', tests.rows($$select * from public.cell_seats where cell_id = '10000000-0000-0000-0000-000000000009' and user_id <> auth.uid()$$) = 0);
reset role;
select tests.ok('na lista, quem está sem vaga aparece como inativo',
  not (select active from public.cell_member_cards('10000000-0000-0000-0000-000000000009') where user_id = '00000000-0000-0000-0000-000000000028' limit 1) is not false);

-- O líder troca quem usa a vaga.
select tests.as_user('00000000-0000-0000-0000-000000000026');
select tests.ok('líder vê quem está sem vaga', (select seat from public.cell_member_cards('10000000-0000-0000-0000-000000000009') where user_id = '00000000-0000-0000-0000-000000000028') = 'none');
select tests.ok('líder vê quantas vagas sobram', (public.cell_seat_summary('10000000-0000-0000-0000-000000000009') ->> 'left')::int = 0);
select tests.ok('sem vaga livre, não dá vaga', tests.denied($$select public.set_member_seat('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028', true)$$));
select tests.ok('líder tira a vaga de um', tests.runs($$select public.set_member_seat('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000027', false)$$));
select tests.ok('a vaga que abriu fica livre até o líder escolher', (public.cell_seat_summary('10000000-0000-0000-0000-000000000009') ->> 'left')::int = 1);
select tests.ok('e dá para outro', tests.runs($$select public.set_member_seat('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028', true)$$));
reset role;
select tests.ok('a troca vale na hora',
  public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028') = 'seat'
  and public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000027') = 'none');
select tests.as_user('00000000-0000-0000-0000-000000000028');
select tests.ok('com a vaga, passa a ver o mural', tests.rows($$select * from public.cell_board where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 1);
reset role;
select set_config('request.jwt.claims', '{}', false);
-- Devolve a vaga ao primeiro, como estava, para os testes seguintes.
delete from public.cell_seats where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
insert into public.cell_seats (cell_id, user_id) values ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000027');
update public.plan_config set cell_free_members = 20 where plan in ('lider', 'trial');
select tests.ok('vaga livre não vai sozinha para quem estava sem vaga', public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028') = 'none');
insert into public.cell_seats (cell_id, user_id) values ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028');

-- Visitante: não ocupa vaga e vira membro depois de 3 reuniões ou 30 dias.
update public.cell_members set role = 'visitante' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
select tests.ok('visitante não ocupa vaga', public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028') = 'visitor'
  and not exists (select 1 from public.cell_seats where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028'));
select tests.as_user('00000000-0000-0000-0000-000000000028');
select tests.ok('visitante confirma presença', tests.allowed($$insert into public.cell_rsvps (cell_id, meeting_date, user_id, going) values ('10000000-0000-0000-0000-000000000009', current_date + 3, auth.uid(), true)$$));
select tests.ok('visitante não vê os pedidos da célula', tests.rows($$select * from public.prayer_requests where shared_cell_id = '10000000-0000-0000-0000-000000000009'$$) = 0);
select tests.ok('visitante não muda a data de quando virou visitante',
  tests.runs($$update public.cell_members set visitor_since = '2000-01-01' where user_id = auth.uid() and cell_id = '10000000-0000-0000-0000-000000000009'$$)
  and (select visitor_since > now() - interval '1 hour' from public.cell_members where user_id = auth.uid() and cell_id = '10000000-0000-0000-0000-000000000009'));
reset role;
select set_config('request.jwt.claims', '{}', false);
-- Visitante há 5 dias (a data é mudada aqui sem o gatilho, só para o teste).
alter table public.cell_members disable trigger track_visitor;
update public.cell_members set visitor_since = now() - interval '5 days' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
alter table public.cell_members enable trigger track_visitor;
insert into public.cell_meetings (cell_id, date) values ('10000000-0000-0000-0000-000000000009', current_date - 10);
insert into public.cell_meetings (cell_id, date) values ('10000000-0000-0000-0000-000000000009', current_date - 3), ('10000000-0000-0000-0000-000000000009', current_date - 2);
select public.promote_visitors();
select tests.ok('com 2 reuniões desde a entrada (a de antes não conta), continua visitante', (select role from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028') = 'visitante');
insert into public.cell_meetings (cell_id, date) values ('10000000-0000-0000-0000-000000000009', current_date + 10);
select public.promote_visitors();
select tests.ok('reunião marcada para depois não conta', (select role from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028') = 'visitante');
insert into public.cell_meetings (cell_id, date, cancelled) values ('10000000-0000-0000-0000-000000000009', current_date - 4, true);
select public.promote_visitors();
select tests.ok('reunião cancelada não conta', (select role from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028') = 'visitante');
insert into public.cell_meetings (cell_id, date) values ('10000000-0000-0000-0000-000000000009', current_date - 1);
select public.promote_visitors();
select tests.ok('na 3ª reunião, vira membro, mesmo tendo faltado', (select role from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028') = 'membro');
select tests.ok('ao virar membro, pega a vaga livre', public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000028') = 'seat');
update public.cell_members set role = 'visitante' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
delete from public.cell_meetings where cell_id = '10000000-0000-0000-0000-000000000009';
alter table public.cell_members disable trigger track_visitor;
update public.cell_members set visitor_since = now() - interval '31 days' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028';
alter table public.cell_members enable trigger track_visitor;
select public.promote_visitors();
select tests.ok('com 30 dias, vira membro mesmo sem reuniões', (select role from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000028') = 'membro');
update public.app_settings set value = '5' where key = 'visitor_meetings';
select tests.ok('regras do visitante vêm da configuração', public.setting_int('visitor_meetings', 3) = 5);
update public.app_settings set value = '3' where key = 'visitor_meetings';

-- Quem tem plano próprio não ocupa vaga.
select tests.ok('quem tem plano próprio não ocupa vaga', public.seat_state('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000026') = 'plan');

-- Curso pela foto: Completo e Líder. No Essencial, não.
select tests.ok('curso pela foto: 5 leituras por dia no Completo',
  (select count(*) from generate_series(1, 6) g where (public.use_limit('00000000-0000-0000-0000-000000000025', 'course_photo') ->> 'ok')::boolean) = 5);
select tests.ok('curso pela foto: Essencial não lê foto', (public.use_limit('00000000-0000-0000-0000-000000000024', 'course_photo') ->> 'reason') = 'no_access');
select tests.ok('curso pela foto: no Completo, não no Essencial',
  public.can('00000000-0000-0000-0000-000000000025', 'course_photo') and not public.can('00000000-0000-0000-0000-000000000024', 'course_photo'));

select set_config('request.jwt.claims', '{}', false);
insert into public.cell_members (cell_id, user_id, role, status) values ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000024', 'membro', 'pending');
-- O líder cancela o plano Líder e não há outro líder com o plano: a célula para na hora, nada é apagado.
update public.subscriptions set status = 'expired' where user_id = '00000000-0000-0000-0000-000000000026';
select tests.ok('sem o plano Líder, a célula para de funcionar', not public.cell_active('10000000-0000-0000-0000-000000000009'));
select tests.as_user('00000000-0000-0000-0000-000000000027');
select tests.ok('célula parada: membro não confirma presença', tests.denied($$insert into public.cell_rsvps (cell_id, meeting_date, user_id, going) values ('10000000-0000-0000-0000-000000000009', current_date + 2, auth.uid(), true)$$));
select tests.ok('célula parada: o que já existia continua visível', tests.rows($$select * from public.cell_board where cell_id = '10000000-0000-0000-0000-000000000009'$$) = 1);
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000026');
select tests.ok('célula parada: líder não marca presença', tests.denied($$select public.mark_attendance('10000000-0000-0000-0000-000000000009', current_date, '{}'::jsonb)$$));
select tests.ok('célula parada: líder não edita a célula', tests.denied($$update public.cells set name = 'Outro' where id = '10000000-0000-0000-0000-000000000009'$$));
select tests.ok('célula parada: líder não aprova pedido pendente', tests.denied($$update public.cell_members set status = 'approved' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000024'$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000021');
select tests.ok('célula parada: ninguém entra pelo convite', tests.denied($$select * from public.request_join('NINA01')$$));
reset role;
select tests.as_anon();
select tests.ok('célula parada: a página web mostra que não está se reunindo', (select archived from public.public_cell_page('NINA01')));
select tests.ok('célula parada: a página web não recebe contato', tests.denied($$select * from public.leave_contact('NINA01', 'Maria', '11987654321')$$));
reset role;

-- Outro líder com o plano Líder mantém a célula funcionando.
select set_config('request.jwt.claims', '{}', false);
update public.cell_members set role = 'lider' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000027';
update public.subscriptions set status = 'active', plan = 'lider', renews_at = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000027';
select tests.ok('com outro líder no plano Líder, a célula continua', public.cell_active('10000000-0000-0000-0000-000000000009'));
update public.subscriptions set status = 'expired' where user_id = '00000000-0000-0000-0000-000000000027';
update public.cell_members set role = 'membro' where cell_id = '10000000-0000-0000-0000-000000000009' and user_id = '00000000-0000-0000-0000-000000000027';
-- Célula parada não aprova pedido pendente.
-- (testado com a célula parada mais abaixo)
-- O líder volta a assinar: tudo volta.
update public.subscriptions set status = 'active' where user_id = '00000000-0000-0000-0000-000000000026';
select tests.ok('o líder volta a assinar e a célula volta a funcionar', public.cell_active('10000000-0000-0000-0000-000000000009'));

-- ─── Avisos do teste ─────────────────────────────────────────────────────────

update public.subscriptions set trial_start = now() - interval '4 days', trial_reminded = 0 where user_id = '00000000-0000-0000-0000-000000000022';
select public.trial_reminders();
select tests.ok('dia 5: aviso de que faltam 2 dias, com o que a pessoa usou (sem falar de orações)',
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000022' and title = 'Faltam 2 dias do seu teste' and body like 'Até agora:%'));
select tests.ok('o aviso do dia 5 não se repete', public.trial_reminders() = 0);
update public.subscriptions set trial_start = now() - interval '6 days' where user_id = '00000000-0000-0000-0000-000000000022';
select public.trial_reminders();
select tests.ok('dia 7: aviso de que o teste termina hoje à meia-noite', exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000022' and title = 'Seu teste termina hoje à meia-noite'));
select tests.ok('quem assina não recebe aviso do teste', not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000024' and title like '%teste%'));

-- Cortesia para a equipe: plano liberado sem loja, até a data.
update public.subscriptions set courtesy_plan = 'lider', courtesy_until = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000021';
select tests.ok('conta da equipe com cortesia usa o plano liberado', public.plan_of('00000000-0000-0000-0000-000000000021') = 'lider');
update public.subscriptions set courtesy_until = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-000000000021';
select tests.ok('cortesia vencida volta ao grátis', public.plan_of('00000000-0000-0000-0000-000000000021') = 'free');
select tests.as_user('00000000-0000-0000-0000-000000000021');
select tests.ok('ninguém se dá cortesia pelo app', tests.denied($$update public.subscriptions set courtesy_plan = 'lider', courtesy_until = null$$));
reset role;

-- Assinatura sem aviso de fim: vence sozinha depois da data.
update public.subscriptions set status = 'active', plan = 'lider', renews_at = now() - interval '3 days', courtesy_plan = null where user_id = '00000000-0000-0000-0000-000000000021';
select tests.ok('assinatura vencida sem o aviso da loja não libera mais', public.plan_of('00000000-0000-0000-0000-000000000021') = 'free');
update public.subscriptions set status = 'canceled_active', renews_at = null where user_id = '00000000-0000-0000-0000-000000000021';
select tests.ok('cancelada sem data de fim não libera', public.plan_of('00000000-0000-0000-0000-000000000021') = 'free');
-- Cortesia Líder e assinatura Essencial: vale o maior.
update public.subscriptions set status = 'active', plan = 'essencial', renews_at = now() + interval '20 days', courtesy_plan = 'lider', courtesy_until = null where user_id = '00000000-0000-0000-0000-000000000021';
select tests.ok('cortesia Líder com assinatura Essencial continua Líder', public.plan_of('00000000-0000-0000-0000-000000000021') = 'lider');
