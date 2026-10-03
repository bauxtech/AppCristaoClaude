-- Testes de permissão (obrigatórios pelo CLAUDE.md).
-- Cada teste entra como uma pessoa e confere o que ela consegue ou não ler e escrever.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(p_name text, p_cond boolean) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'FALHOU: %', p_name; end if;
  raise notice 'passou: %', p_name;
end $$;

create or replace function tests.rows(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end $$;

-- A instrução precisa ser recusada (erro) ou não alterar nenhuma linha.
create or replace function tests.denied(p_sql text) returns boolean language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n = 0;
exception when others then
  return true;
end $$;

create or replace function tests.allowed(p_sql text) returns boolean language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

-- Entra como alguém (ou como visitante sem login).
create or replace function tests.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{}', false);
  execute 'set role anon';
end $$;

-- ─── Dados ───────────────────────────────────────────────────────────────────
-- Célula 1: Ana líder, Beto membro, Caio auxiliar, Dani visitante, Hugo anfitrião, Fabi pendente.
-- Célula 2: Edu líder. Gil não tem célula.

insert into auth.users (id, phone) values
  ('00000000-0000-0000-0000-00000000000a', '5511990000001'),
  ('00000000-0000-0000-0000-00000000000b', '5511990000002'),
  ('00000000-0000-0000-0000-00000000000c', '5511990000003'),
  ('00000000-0000-0000-0000-00000000000d', '5511990000004'),
  ('00000000-0000-0000-0000-00000000000e', '5511990000005'),
  ('00000000-0000-0000-0000-00000000000f', '5511990000006'),
  ('00000000-0000-0000-0000-000000000011', '5511990000007'),
  ('00000000-0000-0000-0000-000000000012', '5511990000008');

update public.profiles set name = 'Ana Lima' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set name = 'Beto Souza', show_photo = false where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set name = 'Caio Reis' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set name = 'Dani Alves' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set name = 'Edu Costa' where id = '00000000-0000-0000-0000-00000000000e';
update public.profiles set name = 'Fabi Nunes' where id = '00000000-0000-0000-0000-00000000000f';
update public.profiles set name = 'Gil Rocha' where id = '00000000-0000-0000-0000-000000000011';
update public.profiles set name = 'Hugo Dias' where id = '00000000-0000-0000-0000-000000000012';

insert into public.cells (id, name, address, neighborhood, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Jovens da Central', 'Rua das Flores, 100, ap 12', 'Pinheiros', 'ABC123', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Casais', 'Av. Paulista, 900', 'Bela Vista', 'XYZ789', '00000000-0000-0000-0000-00000000000e');

insert into public.cell_members (cell_id, user_id, role, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'lider', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'membro', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'auxiliar', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'visitante', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'anfitriao', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'membro', 'pending'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'lider', 'approved');

insert into public.prayer_requests (id, user_id, text, shared_cell_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Saúde da minha mãe', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Pedido só meu', null),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000e', 'Pedido da célula 2', '10000000-0000-0000-0000-000000000002');

insert into public.prayer_diary (user_id, text) values ('00000000-0000-0000-0000-00000000000b', 'Diário do Beto');
insert into public.cell_meetings (id, cell_id, date) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date);
insert into public.cell_meetings (id, cell_id, date) values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', current_date);
insert into public.cell_attendance (meeting_id, user_id, present) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', false),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', true);
insert into public.cell_schedule (id, cell_id, role_name, member_id) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Louvor', '00000000-0000-0000-0000-00000000000b');
insert into public.cell_board (cell_id, author_id, text) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Retiro dia 22');
insert into public.sermons (user_id, title, transcript) values ('00000000-0000-0000-0000-00000000000b', 'Culto', 'texto');
insert into public.chat_conversations (id, user_id, title) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Conversa');
insert into public.cell_rides (id, cell_id, driver_id, origin, seats) values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Pinheiros', 2);
insert into public.ride_requests (ride_id, user_id, status) values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'accepted');
insert into public.ride_requests (ride_id, user_id, status) values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'pending');

-- ─── Pedido de oração ────────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000e'); -- Edu, líder de outra célula
select tests.ok('outra célula não lê o pedido de oração da célula 1', tests.rows($$select * from public.prayer_requests where shared_cell_id = '10000000-0000-0000-0000-000000000001'$$) = 0);
select tests.ok('outra célula não lê pedido particular', tests.rows($$select * from public.prayer_requests where id = '20000000-0000-0000-0000-000000000002'$$) = 0);
select tests.ok('não consegue compartilhar pedido numa célula da qual não é membro',
  tests.denied($$insert into public.prayer_requests (user_id, text, shared_cell_id) values ('00000000-0000-0000-0000-00000000000e', 'x', '10000000-0000-0000-0000-000000000001')$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000d'); -- Dani, visitante
select tests.ok('visitante não vê os pedidos de oração', tests.rows($$select * from public.prayer_requests$$) = 0);
select tests.ok('visitante vê a célula e o endereço', tests.rows($$select * from public.cells where address is not null$$) = 1);
select tests.ok('visitante vê a reunião', tests.rows($$select * from public.cell_meetings$$) = 1);
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000f'); -- Fabi, pendente
select tests.ok('pedido pendente não vê a célula nem o endereço', tests.rows($$select * from public.cells$$) = 0);
select tests.ok('pedido pendente não vê os pedidos de oração', tests.rows($$select * from public.prayer_requests$$) = 0);
select tests.ok('pendente não se aprova sozinho', tests.denied($$update public.cell_members set status = 'approved' where user_id = '00000000-0000-0000-0000-00000000000f'$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000012'); -- Hugo, anfitrião
select tests.ok('membro vê pedido compartilhado da própria célula', tests.rows($$select * from public.prayer_requests$$) = 1);
select tests.ok('membro não vê pedido particular de outro membro', tests.rows($$select * from public.prayer_requests where id = '20000000-0000-0000-0000-000000000002'$$) = 0);
select tests.ok('membro não edita o pedido de outro', tests.denied($$update public.prayer_requests set text = 'mudado' where id = '20000000-0000-0000-0000-000000000001'$$));
reset role;

-- ─── Diário, culto e chat ────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000a'); -- Ana, líder do Beto
select tests.ok('nem o líder lê o diário de um membro', tests.rows($$select * from public.prayer_diary$$) = 0);
select tests.ok('nem o líder lê os cultos de um membro', tests.rows($$select * from public.sermons$$) = 0);
select tests.ok('nem o líder lê o chat de um membro', tests.rows($$select * from public.chat_conversations$$) = 0);
select tests.ok('ninguém escreve mensagem na conversa de outro',
  tests.denied($$insert into public.chat_messages (conversation_id, user_id, role, text) values ('50000000-0000-0000-0000-000000000001', auth.uid(), 'user', 'x')$$));
select tests.ok('ninguém escreve no diário de outro', tests.denied($$insert into public.prayer_diary (user_id, text) values ('00000000-0000-0000-0000-00000000000b', 'x')$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('o dono lê o próprio diário', tests.rows($$select * from public.prayer_diary$$) = 1);
reset role;

-- ─── Telefone ────────────────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000b'); -- Beto, membro
select tests.ok('membro não lê o perfil (telefone) de outro', tests.rows($$select * from public.profiles where id <> auth.uid()$$) = 0);
select tests.ok('membro não recebe telefone na lista da célula',
  tests.rows($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001') where phone is not null$$) = 0);
select tests.ok('membro não vê quem está pendente', tests.rows($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001') where status = 'pending'$$) = 0);
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000c'); -- Caio, auxiliar
select tests.ok('auxiliar não recebe telefone',
  tests.rows($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001') where phone is not null$$) = 0);
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000a'); -- Ana, líder
select tests.ok('líder recebe o telefone dos membros',
  tests.rows($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001') where phone is not null$$) = 6);
select tests.ok('foto escondida pela pessoa não aparece nem para o líder',
  tests.rows($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001') where name = 'Beto Souza' and photo_path is not null$$) = 0);
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000e'); -- Edu, outra célula
select tests.ok('outra célula não consegue a lista de membros', tests.denied($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001')$$));
select tests.ok('outra célula não vê os membros', tests.rows($$select * from public.cell_members where cell_id = '10000000-0000-0000-0000-000000000001'$$) = 0);
reset role;

-- Carona: o telefone só sai depois de aceito, só para o par motorista e passageiro.
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('passageiro aceito recebe o telefone do motorista para o WhatsApp',
  public.ride_contact('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b') = '5511990000001');
reset role;
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select tests.ok('pedido de carona não aceito não recebe telefone',
  tests.denied($$select public.ride_contact('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$));
select tests.ok('terceiro não pega o telefone de quem foi aceito',
  tests.denied($$select public.ride_contact('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$$));
reset role;

-- ─── Presença ────────────────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000e');
select tests.ok('outra célula não lê a presença da célula 1',
  tests.rows($$select * from public.cell_attendance where meeting_id = '30000000-0000-0000-0000-000000000001'$$) = 0);
select tests.ok('outra célula não marca presença na célula 1',
  tests.denied($$insert into public.cell_attendance (meeting_id, user_id, present) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', true)$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000b'); -- membro
select tests.ok('membro vê só a própria presença', tests.rows($$select * from public.cell_attendance$$) = 1);
select tests.ok('membro não marca presença', tests.denied($$update public.cell_attendance set present = false where user_id = '00000000-0000-0000-0000-00000000000b'$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000012'); -- anfitrião
select tests.ok('anfitrião não marca presença (sem permissão a mais)',
  tests.denied($$update public.cell_attendance set present = true where user_id = '00000000-0000-0000-0000-00000000000d'$$));
select tests.ok('anfitrião não edita a escala', tests.denied($$update public.cell_schedule set role_name = 'X'$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000c'); -- auxiliar
select tests.ok('auxiliar vê a presença de todos da célula', tests.rows($$select * from public.cell_attendance$$) = 2);
select tests.ok('auxiliar marca presença', tests.allowed($$update public.cell_attendance set present = true where user_id = '00000000-0000-0000-0000-00000000000d'$$));
select tests.ok('auxiliar edita a escala', tests.allowed($$update public.cell_schedule set role_name = 'Louvor e oração'$$));
select tests.ok('auxiliar não edita o roteiro nem a reunião', tests.denied($$update public.cell_meetings set script = '[]'$$));
select tests.ok('auxiliar não publica no mural', tests.denied($$insert into public.cell_board (cell_id, author_id, text) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'x')$$));
select tests.ok('auxiliar não aprova entrada', tests.denied($$update public.cell_members set status = 'approved' where user_id = '00000000-0000-0000-0000-00000000000f'$$));
select tests.ok('auxiliar não muda o próprio papel', tests.denied($$update public.cell_members set role = 'lider' where user_id = auth.uid()$$));
select tests.ok('auxiliar não edita os dados da célula', tests.denied($$update public.cells set name = 'X'$$));
reset role;

-- ─── Entrada na célula ───────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-000000000011'); -- Gil, sem célula
select tests.ok('quem entra pelo código fica pendente', (select status from public.request_join('abc-123')) = 'pending');
select tests.ok('pendente ainda não vê a célula', tests.rows($$select * from public.cells$$) = 0);
select tests.ok('ninguém se insere direto como membro',
  tests.denied($$insert into public.cell_members (cell_id, user_id, role, status) values ('10000000-0000-0000-0000-000000000002', auth.uid(), 'lider', 'approved')$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000a'); -- Ana aprova o Gil
select tests.ok('líder aprova a entrada', tests.allowed($$update public.cell_members set status = 'approved', joined_at = now() where user_id = '00000000-0000-0000-0000-000000000011'$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000011');
select tests.ok('aprovado passa a ver a célula', tests.rows($$select * from public.cells$$) = 1);
reset role;

-- ─── Sair da célula ──────────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok('líder não sai sem passar a liderança', tests.denied($$delete from public.cell_members where user_id = auth.uid()$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('membro sai da célula', tests.allowed($$delete from public.cell_members where user_id = auth.uid() and cell_id = '10000000-0000-0000-0000-000000000001'$$));
select tests.ok('os pedidos dele saem do grupo e continuam com ele', tests.rows($$select * from public.prayer_requests where shared_cell_id is null$$) = 2);
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000012');
select tests.ok('a célula deixa de ver o pedido de quem saiu', tests.rows($$select * from public.prayer_requests$$) = 0);
reset role;

-- ─── Bloqueio e denúncia ─────────────────────────────────────────────────────

update public.prayer_requests set shared_cell_id = '10000000-0000-0000-0000-000000000001' where id = '20000000-0000-0000-0000-000000000001';
insert into public.cell_members (cell_id, user_id, role, status) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'membro', 'approved');

select tests.as_user('00000000-0000-0000-0000-000000000012');
select tests.ok('bloquear alguém', tests.allowed($$insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000b')$$));
select tests.ok('o pedido de quem foi bloqueado some para quem bloqueou', tests.rows($$select * from public.prayer_requests$$) = 0);
select tests.ok('denunciar vai para a equipe', tests.allowed($$insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'board', 'x', 'Spam')$$));
select tests.ok('quem denuncia não lê a fila de denúncias', tests.denied($$select * from public.reports$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000c');
select tests.ok('o bloqueio de outra pessoa não afeta quem não bloqueou', tests.rows($$select * from public.prayer_requests$$) = 1);
reset role;

-- ─── Assinatura e limites ────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('conta nova começa no teste grátis', (select status from public.subscriptions) = 'trial');
select tests.ok('ninguém se dá assinatura sozinho', tests.denied($$update public.subscriptions set status = 'active'$$));
select tests.ok('ninguém zera o próprio limite do chat', tests.denied($$insert into public.usage_counters (user_id, kind, period, count) values (auth.uid(), 'chat_day', '2026-10-04', 0)$$));
select tests.ok('ninguém lê a assinatura de outro', tests.rows($$select * from public.subscriptions where user_id <> auth.uid()$$) = 0);
reset role;

-- ─── Página web (sem login) ──────────────────────────────────────────────────

select tests.as_anon();
select tests.ok('sem login não lê nenhuma tabela', tests.denied($$select * from public.cells$$));
select tests.ok('sem login não lê perfis', tests.denied($$select * from public.profiles$$));
select tests.ok('a página mostra o bairro', (select neighborhood from public.public_cell_page('ABC123')) = 'Pinheiros');
select tests.ok('a página não tem coluna de endereço',
  pg_get_function_result('public.public_cell_page(text)'::regprocedure) !~ '(address|reference)');
select tests.ok('sem nome e telefone não recebe o endereço', tests.denied($$select * from public.leave_contact('ABC123', '', '')$$));
select tests.ok('com nome e telefone recebe o endereço completo', (select address from public.leave_contact('ABC123', 'Maria', '(11) 98888-7777')) = 'Rua das Flores, 100, ap 12');
select tests.ok('sem login não roda funções do app', tests.denied($$select * from public.cell_member_cards('10000000-0000-0000-0000-000000000001')$$));
select tests.ok('sem login não roda a limpeza', tests.denied($$select * from public.purge_expired()$$));
reset role;

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('o contato da página não aparece para membro', tests.rows($$select * from public.cell_leads$$) = 0);
reset role;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok('o contato da página chega ao líder', tests.rows($$select * from public.cell_leads$$) = 1);
reset role;

-- ─── Exclusão de conta ───────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok('líder com membros não marca a exclusão', tests.denied($$select public.request_account_deletion()$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select tests.ok('membro marca a exclusão para 30 dias', public.request_account_deletion() > now() + interval '29 days');
reset role;

update public.profiles set deletion_requested_at = now() - interval '31 days' where id = '00000000-0000-0000-0000-00000000000c';
select tests.ok('a limpeza apaga a conta depois de 30 dias', (select accounts from public.purge_expired()) = 1);
select tests.ok('os dados da conta apagada somem junto', not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'));

-- ─── Texto bíblico, acesso e limites ─────────────────────────────────────────

insert into public.bible_verses (book, chapter, verse, text) values
  ('filipenses', 4, 6, 'Não estejais ansiosos por coisa alguma; antes, em tudo fazei conhecidas as vossas necessidades a Deus em oração e súplica, com ação de graças.'),
  ('salmos', 23, 1, 'O Senhor é o meu pastor; nada me faltará.');

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok('busca encontra versículo por palavra parecida (ansiedade)', tests.rows($$select * from public.search_verses('ansiosos')$$) = 1);
select tests.ok('verses_by_keys só devolve chaves que existem', tests.rows($$select * from public.verses_by_keys(array['salmos:23:1', 'salmos:99:99'])$$) = 1);
select tests.ok('pessoa não confere o acesso de outra', tests.denied($$select public.has_access('00000000-0000-0000-0000-00000000000a')$$));
select tests.ok('conta no teste tem acesso', public.my_access());
select tests.ok('pessoa não consome limite pelo servidor', tests.denied($$select public.consume_usage(auth.uid(), 'chat_day', 'x', 20)$$));
reset role;

update public.subscriptions set trial_start = now() - interval '8 days' where user_id = '00000000-0000-0000-0000-00000000000b';
select tests.ok('depois de 7 dias sem assinar, sem acesso', not public.has_access('00000000-0000-0000-0000-00000000000b'));
update public.subscriptions set status = 'active' where user_id = '00000000-0000-0000-0000-00000000000b';
select tests.ok('assinante tem acesso', public.has_access('00000000-0000-0000-0000-00000000000b'));
update public.subscriptions set status = 'payment_failed', grace_until = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-00000000000b';
select tests.ok('pagamento falhou e o prazo venceu: sem acesso', not public.has_access('00000000-0000-0000-0000-00000000000b'));

select tests.ok('limite: a 20ª pergunta ainda passa', (select min(r) from (select public.consume_usage('00000000-0000-0000-0000-00000000000a', 'chat_day', '2026-10-04', 20) r from generate_series(1, 20)) q) = 0);
select tests.ok('limite: a 21ª pergunta é recusada', public.consume_usage('00000000-0000-0000-0000-00000000000a', 'chat_day', '2026-10-04', 20) = -1);
select public.refund_usage('00000000-0000-0000-0000-00000000000a', 'chat_day', '2026-10-04');
select tests.ok('resposta que falha devolve a pergunta', public.consume_usage('00000000-0000-0000-0000-00000000000a', 'chat_day', '2026-10-04', 20) = 0);
