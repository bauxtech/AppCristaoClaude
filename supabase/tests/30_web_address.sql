-- Endereço próprio da página da célula, logo e denúncia pela página. Roda depois de 20_plans.sql.
-- Pessoas novas: Rui e Sara (plano Líder, cada um com a sua célula), Téo (membro da célula do Rui).

insert into auth.users (id, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-000000000031', '5511980000031', now()),
  ('00000000-0000-0000-0000-000000000032', '5511980000032', now()),
  ('00000000-0000-0000-0000-000000000033', '5511980000033', now());
update public.subscriptions set status = 'active', plan = 'lider', period_start = now(), renews_at = now() + interval '30 days'
  where user_id in ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000032');

select tests.as_user('00000000-0000-0000-0000-000000000031');
select public.create_cell('Célula Viva', null, 3, '20:00', 'Rua Secreta, 10', null, 'Moema', '10000000-0000-0000-0000-000000000031', 'celula-viva');
select tests.ok('ao criar a célula, o líder escolhe o endereço', (select web_slug from public.cells where id = '10000000-0000-0000-0000-000000000031') = 'celula-viva');
reset role;

select tests.as_user('00000000-0000-0000-0000-000000000032');
select tests.ok('outra célula pode ter o mesmo nome, mas não o mesmo endereço', public.check_cell_web_slug('celula-viva') = 'taken');
select public.create_cell('Célula Viva', null, 4, '20:00', 'Rua B, 2', null, 'Centro', '10000000-0000-0000-0000-000000000032', 'celula-viva');
select tests.ok('criada com endereço tomado, a célula nasce sem endereço e o líder escolhe depois',
  (select web_slug from public.cells where id = '10000000-0000-0000-0000-000000000032') is null);
select tests.ok('endereço com maiúscula, acento ou espaço não vale', public.check_cell_web_slug('Célula Viva') = 'invalid');
select tests.ok('endereço com menos de 3 letras não vale', public.check_cell_web_slug('ab') = 'invalid');
select tests.ok('endereço com mais de 30 letras não vale', public.check_cell_web_slug(repeat('a', 31)) = 'invalid');
select tests.ok('endereço começando ou terminando com hífen não vale', public.check_cell_web_slug('-viva') = 'invalid' and public.check_cell_web_slug('viva-') = 'invalid');
select tests.ok('palavra reservada não vale', public.check_cell_web_slug('acasa') = 'reserved' and public.check_cell_web_slug('admin') = 'reserved');
select tests.ok('palavrão não vale, nem no meio do endereço', public.check_cell_web_slug('celula-porra') = 'blocked' and public.check_cell_web_slug('caralhocelula') = 'blocked');
select tests.ok('palavra curta proibida só conta inteira (cultura passa)', public.check_cell_web_slug('celula-cultura') = 'ok');
select tests.ok('endereço livre e válido passa', public.check_cell_web_slug('viva-centro') = 'ok');
select tests.ok('só o líder da célula grava o endereço dela', public.set_cell_web_slug('10000000-0000-0000-0000-000000000031', 'roubado') = 'no_access');
select tests.ok('o líder grava o endereço da própria célula', public.set_cell_web_slug('10000000-0000-0000-0000-000000000032', 'viva-centro') = 'ok');
select tests.ok('o líder não muda o endereço direto na tabela, sem as regras',
  tests.denied($$update public.cells set web_slug = 'acasa' where id = '10000000-0000-0000-0000-000000000032'$$));
select tests.ok('ninguém lê a lista de endereços antigos nem as denúncias',
  tests.denied($$select * from public.cell_slug_history$$) and tests.denied($$select * from public.web_reports$$));
reset role;

-- Trocar de endereço: o antigo leva para o novo por 30 dias e ninguém pega.
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder troca o endereço', public.set_cell_web_slug('10000000-0000-0000-0000-000000000031', 'viva-moema') = 'ok');
reset role;
select tests.as_anon();
select tests.ok('o endereço antigo ainda abre a página e mostra o novo, para a página levar até ele',
  (select slug from public.public_cell_page('celula-viva')) = 'viva-moema');
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000032');
select tests.ok('nos 30 dias, outra célula não pega o endereço antigo', public.check_cell_web_slug('celula-viva') = 'taken');
reset role;
update public.cell_slug_history set until = now() - interval '1 minute' where slug = 'celula-viva';
select tests.as_anon();
select tests.ok('depois dos 30 dias, o endereço antigo não abre mais', not exists (select 1 from public.public_cell_page('celula-viva')));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder pode voltar para um endereço que já foi dele', public.set_cell_web_slug('10000000-0000-0000-0000-000000000031', 'celula-viva') = 'ok');
reset role;

-- Página pública: mostra só o bairro, por endereço novo; o link antigo pelo código continua.
select (select invite_code from public.cells where id = '10000000-0000-0000-0000-000000000031') as rui_code,
  (select invite_code from public.cells where id = '10000000-0000-0000-0000-000000000032') as sara_code \gset
select tests.as_anon();
select tests.ok('a página abre pelo endereço novo e mostra só o bairro',
  (select neighborhood from public.public_cell_page('celula-viva')) = 'Moema'
  and not exists (select 1 from public.public_cell_page('celula-viva') p where p::text like '%Rua Secreta%'));
select tests.ok('o link antigo /c/<código> continua abrindo a página',
  (select name from public.public_cell_page('c:' || :'rui_code')) = 'Célula Viva');
select tests.ok('um endereço com cara de código não abre a célula de outro código',
  not exists (select 1 from public.public_cell_page(lower(:'sara_code'))));
select tests.ok('pelo endereço novo, deixar nome e telefone devolve só o código de convite',
  (select invite_code from public.leave_contact('celula-viva', 'Visitante', '11987654321')) = :'rui_code');
select tests.ok('a página não recebe mais pedido de oração', tests.denied($$select public.leave_web_prayer('celula-viva', null, 'Pedido')$$));
reset role;
insert into public.cell_web_prayers (cell_id, text) values ('10000000-0000-0000-0000-000000000031', 'Pedido pela página');
select tests.as_anon();
select public.report_cell_page('celula-viva', 'logo', 'Imagem imprópria');
reset role;
select tests.ok('quem abre a página denuncia sem login', (select count(*) from public.web_reports where cell_id = '10000000-0000-0000-0000-000000000031') = 1);
select tests.as_anon();
select tests.ok('denúncia com motivo fora da lista não entra', tests.denied($$select public.report_cell_page('celula-viva', 'qualquer')$$));
select tests.ok('sem login, ninguém grava endereço', tests.denied($$select public.set_cell_web_slug('10000000-0000-0000-0000-000000000031', 'x-y-z')$$));
reset role;

-- Logo: só o líder, só na pasta da célula, e a equipe tira do ar.
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder envia o logo na pasta da célula',
  tests.allowed($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/logo-a1.png')$$));
insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/logo-a1.png');
select tests.ok('o líder não envia logo na pasta de outra célula',
  tests.denied($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000032/logo-x.png')$$));
select tests.ok('logo fora da pasta da célula não é aceito', public.set_cell_logo('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000032/logo-x.png') = 'invalid');
select tests.ok('logo que não foi enviado não entra na página', public.set_cell_logo('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031/logo-a0.png') = 'invalid');
insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/logo-a0.png');
select public.set_cell_logo('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031/logo-a0.png');
select tests.ok('o líder troca o logo (o arquivo antigo o app apaga pela API do Storage)', public.set_cell_logo('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031/logo-a1.png') = 'ok');
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000033');
select tests.ok('quem não é líder não envia logo',
  tests.denied($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/logo-b.png')$$));
select tests.ok('quem não é líder não troca o logo', public.set_cell_logo('10000000-0000-0000-0000-000000000031', null) = 'no_access');
reset role;
select tests.as_anon();
select tests.ok('a página mostra o logo', (select logo_path from public.public_cell_page('celula-viva')) = '10000000-0000-0000-0000-000000000031/logo-a1.png');
reset role;
update public.cells set logo_hidden = true where id = '10000000-0000-0000-0000-000000000031';
select tests.as_anon();
select tests.ok('logo tirado do ar pela equipe some da página', (select logo_path from public.public_cell_page('celula-viva')) is null);
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder não tira o bloqueio do logo feito pela equipe',
  tests.denied($$update public.cells set logo_hidden = false where id = '10000000-0000-0000-0000-000000000031'$$));
reset role;

-- Célula parada: o endereço fica guardado 90 dias e depois fica livre.
update public.subscriptions set status = 'expired', renews_at = now() - interval '1 day', trial_start = now() - interval '30 days' where user_id = '00000000-0000-0000-0000-000000000032';
select public.release_cell_slugs();
select tests.ok('sem o plano Líder, a célula guarda o endereço e a data em que parou',
  (select web_slug = 'viva-centro' and web_inactive_since is not null from public.cells where id = '10000000-0000-0000-0000-000000000032'));
update public.cells set web_inactive_since = now() - interval '91 days' where id = '10000000-0000-0000-0000-000000000032';
select tests.ok('a rotina libera um endereço', public.release_cell_slugs() = 1);
select tests.ok('depois de 90 dias parada, o endereço fica livre', (select web_slug from public.cells where id = '10000000-0000-0000-0000-000000000032') is null);
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('ninguém roda a liberação de endereços pelo app', tests.denied($$select public.release_cell_slugs()$$));
reset role;

-- ─── Registros de acesso (6 meses) e contatos da página (12 meses) ──────────

select tests.as_user('00000000-0000-0000-0000-000000000031');
select set_config('request.headers', '{"x-forwarded-for": "6.6.6.6, 200.1.2.3"}', false);
select public.log_access();
select public.log_access();
select tests.ok('ninguém lê os registros de acesso pelo app', tests.denied($$select * from public.access_logs$$));
select tests.ok('ninguém roda a limpeza pelo app', tests.denied($$select public.purge_logs_and_web_contacts()$$));
reset role;
select set_config('request.headers', '', false);
select tests.ok('o acesso fica registrado com o IP posto pelo proxy (o último), não o que o celular inventou, uma vez por hora',
  (select count(*) from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031') = 1
  and (select ip from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031') = '200.1.2.3');
select tests.as_anon();
select tests.ok('sem login, não registra acesso', tests.denied($$select public.log_access()$$));
reset role;

insert into public.access_logs (user_id, ip, at) values ('00000000-0000-0000-0000-000000000031', '1.1.1.1', now() - interval '7 months');
insert into public.cell_leads (cell_id, name, phone, source, created_at) values
  ('10000000-0000-0000-0000-000000000031', 'Antigo', '11911112222', 'web', now() - interval '13 months'),
  ('10000000-0000-0000-0000-000000000031', 'Cadastrado à mão', '11911113333', 'manual', now() - interval '13 months');
insert into public.cell_web_prayers (cell_id, text, created_at) values ('10000000-0000-0000-0000-000000000031', 'Pedido antigo', now() - interval '13 months');
select public.purge_logs_and_web_contacts();
select tests.ok('registro de acesso com mais de 6 meses é apagado; o recente fica',
  (select count(*) from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031') = 1);
select tests.ok('contato da página com mais de 12 meses é apagado; o recente fica',
  not exists (select 1 from public.cell_leads where name = 'Antigo')
  and exists (select 1 from public.cell_leads where name = 'Visitante' and cell_id = '10000000-0000-0000-0000-000000000031'));
select tests.ok('visitante cadastrado à mão pelo líder não é apagado', exists (select 1 from public.cell_leads where name = 'Cadastrado à mão'));
select tests.ok('pedido da página com mais de 12 meses é apagado; o recente fica',
  not exists (select 1 from public.cell_web_prayers where text = 'Pedido antigo')
  and exists (select 1 from public.cell_web_prayers where text = 'Pedido pela página'));
update public.cells set archived = true where id = '10000000-0000-0000-0000-000000000031';
select public.purge_logs_and_web_contacts();
select tests.ok('célula encerrada: os contatos e pedidos da página saem na hora',
  not exists (select 1 from public.cell_leads where cell_id = '10000000-0000-0000-0000-000000000031' and source = 'web')
  and not exists (select 1 from public.cell_web_prayers where cell_id = '10000000-0000-0000-0000-000000000031'));
update public.cells set archived = false where id = '10000000-0000-0000-0000-000000000031';

-- ─── Revisão de 18/10 ────────────────────────────────────────────────────────

select tests.as_user('00000000-0000-0000-0000-000000000031');
select set_config('request.headers', '{"cf-connecting-ip": "177.10.10.10", "x-forwarded-for": "9.9.9.9"}', false);
select public.log_access();
reset role;
select set_config('request.headers', '', false);
select tests.ok('dentro da mesma hora, outro IP não cria registro novo',
  (select count(*) from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031' and at > now() - interval '1 hour') = 1);
delete from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031';
select tests.as_user('00000000-0000-0000-0000-000000000031');
select set_config('request.headers', '{"cf-connecting-ip": "177.10.10.10", "x-forwarded-for": "9.9.9.9"}', false);
select public.log_access();
reset role;
select set_config('request.headers', '', false);
select tests.ok('com o cabeçalho do Cloudflare, vale o IP dele', (select ip from public.access_logs where user_id = '00000000-0000-0000-0000-000000000031') = '177.10.10.10');

select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('na pasta do logo, só arquivo com nome de logo',
  tests.denied($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/qualquer.png')$$));
reset role;
update public.subscriptions set status = 'expired', renews_at = now() - interval '1 day', trial_start = now() - interval '30 days' where user_id = '00000000-0000-0000-0000-000000000031';
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('líder de célula parada não envia logo',
  tests.denied($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/logo-z9.png')$$));
reset role;
select tests.as_anon();
select tests.ok('célula parada aparece como parada, não como arquivada',
  (select paused and not archived from public.public_cell_page('celula-viva')));
reset role;
update public.subscriptions set status = 'active', renews_at = now() + interval '30 days' where user_id = '00000000-0000-0000-0000-000000000031';

-- Quem perde a vaga sai da escala.
update public.subscriptions set trial_start = now() - interval '30 days', status = 'expired' where user_id = '00000000-0000-0000-0000-000000000033';
insert into public.cell_members (cell_id, user_id, role, status, joined_at) values
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000033', 'membro', 'approved', now())
  on conflict (cell_id, user_id) do update set status = 'approved', role = 'membro';
insert into public.cell_seats (cell_id, user_id) values ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000033') on conflict do nothing;
insert into public.cell_schedule (cell_id, role_name, member_id) values ('10000000-0000-0000-0000-000000000031', 'Lanche', '00000000-0000-0000-0000-000000000033');
select tests.ok('com vaga, a pessoa está na escala', exists (select 1 from public.cell_schedule where role_name = 'Lanche' and member_id = '00000000-0000-0000-0000-000000000033'));
delete from public.cell_seats where cell_id = '10000000-0000-0000-0000-000000000031' and user_id = '00000000-0000-0000-0000-000000000033';
select tests.ok('ao perder a vaga, a pessoa sai da escala e a função continua lá',
  exists (select 1 from public.cell_schedule where cell_id = '10000000-0000-0000-0000-000000000031' and role_name = 'Lanche' and member_id is null));

-- ─── Capa da página e limite por aparelho (19/10) ────────────────────────────

select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder envia a capa na pasta da célula',
  tests.allowed($$insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/capa-a1.jpg')$$));
insert into storage.objects (bucket_id, name) values ('cell-logos', '10000000-0000-0000-0000-000000000031/capa-a1.jpg');
select tests.ok('o líder põe a capa na página', public.set_cell_cover('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031/capa-a1.jpg') = 'ok');
select tests.ok('arquivo de logo não vale como capa', public.set_cell_cover('10000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031/logo-a1.png') = 'invalid');
select tests.ok('o líder não muda a capa direto na tabela', tests.denied($$update public.cells set web_cover_path = 'x' where id = '10000000-0000-0000-0000-000000000031'$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000033');
select tests.ok('quem não é líder não troca a capa', public.set_cell_cover('10000000-0000-0000-0000-000000000031', null) = 'no_access');
reset role;
select tests.as_anon();
select tests.ok('a página mostra a capa', (select cover_path from public.public_cell_page('celula-viva')) = '10000000-0000-0000-0000-000000000031/capa-a1.jpg');
select public.report_cell_page('celula-viva', 'capa');
reset role;
select tests.ok('dá para denunciar a capa', exists (select 1 from public.web_reports where reason = 'capa'));
update public.cells set web_cover_hidden = true where id = '10000000-0000-0000-0000-000000000031';
select tests.as_anon();
select tests.ok('capa tirada do ar pela equipe some da página', (select cover_path from public.public_cell_page('celula-viva')) is null);
reset role;

-- Limite por aparelho: 5 contatos por dia, mesmo com telefones diferentes.
select set_config('request.headers', '{"cf-connecting-ip": "201.5.5.5"}', false);
select tests.as_anon();
select public.leave_contact('celula-viva', 'Robô', '1198000000' || g) from generate_series(1, 5) g;
select tests.ok('o 6º contato do mesmo aparelho no dia é recusado', tests.denied($$select * from public.leave_contact('celula-viva', 'Robô', '11980000099')$$));
reset role;
select set_config('request.headers', '{"cf-connecting-ip": "201.5.5.6"}', false);
select tests.as_anon();
select tests.ok('outro aparelho continua deixando contato', (select invite_code from public.leave_contact('celula-viva', 'Pessoa', '11980000077')) is not null);
reset role;
select set_config('request.headers', '', false);
select tests.ok('o endereço de internet não fica guardado, só um código', not exists (select 1 from public.web_attempts where ip_hash like '%201.5%'));
select tests.as_anon();
select tests.ok('ninguém lê as tentativas', tests.denied($$select * from public.web_attempts$$));
reset role;

-- ─── Cartão de visita (19/10) ────────────────────────────────────────────────
select tests.as_user('00000000-0000-0000-0000-000000000032');
update public.cells set web_bio = 'Invadido' where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('quem não é líder não muda o texto da página', (select web_bio from public.cells where id = '10000000-0000-0000-0000-000000000031') is null);
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('texto da página com mais de 300 letras não vale',
  tests.denied($$update public.cells set web_bio = repeat('a', 301) where id = '10000000-0000-0000-0000-000000000031'$$));
update public.cells set web_bio = 'Jovens que se reúnem para ler a Bíblia.', web_show_schedule = false where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('o líder escreve o texto e esconde o horário', (select web_bio is not null and not web_show_schedule from public.cells where id = '10000000-0000-0000-0000-000000000031'));
select tests.as_anon();
select tests.ok('a página mostra a biografia', (select bio from public.public_cell_page('celula-viva')) = 'Jovens que se reúnem para ler a Bíblia.');
select tests.ok('com o horário escondido, a página não mostra dia nem hora', (select weekday is null and "time" is null from public.public_cell_page('celula-viva')));
select tests.ok('a página não tem endereço nem nome do líder',
  pg_get_function_result('public.public_cell_page(text)'::regprocedure) !~ '(address|reference|leader)');
select tests.ok('sem login, ninguém usa a prévia do convite do app', tests.denied($$select * from public.invite_preview('ABC123')$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000033');
select tests.ok('no app, quem tem o código vê nome, líder e dia', (select name from public.invite_preview(lower(:'rui_code'))) = 'Célula Viva'
  and (select leader_first_name from public.invite_preview(:'rui_code')) is not null);
reset role;

-- ─── Pedido de entrada com mensagem e igreja (20/10) ─────────────────────────
-- Lia (41) ainda não existe aqui: usa um usuário novo.
insert into auth.users (id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000039', '5511980000039', now());
select tests.as_user('00000000-0000-0000-0000-000000000039');
select public.request_join(:'rui_code', 'Sou amigo do Téo', 'Igreja Batista Central');
select tests.ok('quem pede vê a própria mensagem', (select message from public.join_request_notes where user_id = auth.uid()) = 'Sou amigo do Téo');
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000033');
select tests.ok('membro da célula não lê a mensagem do pedido de outra pessoa',
  not exists (select 1 from public.join_request_notes where user_id = '00000000-0000-0000-0000-000000000039'));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('o líder lê a mensagem e a igreja do pedido',
  (select church from public.join_request_notes where user_id = '00000000-0000-0000-0000-000000000039') = 'Igreja Batista Central');
select tests.ok('ninguém escreve direto na tabela', tests.denied($$insert into public.join_request_notes (cell_id, user_id, message) values ('10000000-0000-0000-0000-000000000031', auth.uid(), 'x')$$));
update public.cell_members set status = 'approved' where cell_id = '10000000-0000-0000-0000-000000000031' and user_id = '00000000-0000-0000-0000-000000000039';
reset role;
select tests.ok('pedido aprovado: a mensagem sai', not exists (select 1 from public.join_request_notes where user_id = '00000000-0000-0000-0000-000000000039'));

-- ─── Vários dias e horários (21/10) ──────────────────────────────────────────
select tests.as_user('00000000-0000-0000-0000-000000000031');
update public.cells set meeting_slots = '[{"weekday":2,"time":"20:00"},{"weekday":6,"time":"16:00"}]', web_show_schedule = true where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('o líder guarda dois dias com horários diferentes', (select jsonb_array_length(meeting_slots) from public.cells where id = '10000000-0000-0000-0000-000000000031') = 2);
select tests.as_user('00000000-0000-0000-0000-000000000031');
select tests.ok('dia da semana fora de 0 a 6 não vale', tests.denied($$update public.cells set meeting_slots = '[{"weekday":7,"time":"20:00"}]' where id = '10000000-0000-0000-0000-000000000031'$$));
select tests.ok('horário inválido não vale', tests.denied($$update public.cells set meeting_slots = '[{"weekday":2,"time":"25:00"}]' where id = '10000000-0000-0000-0000-000000000031'$$));
select tests.ok('o mesmo dia duas vezes não vale', tests.denied($$update public.cells set meeting_slots = '[{"weekday":2,"time":"20:00"},{"weekday":2,"time":"21:00"}]' where id = '10000000-0000-0000-0000-000000000031'$$));
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000032');
update public.cells set meeting_slots = '[]' where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('quem não é líder não muda a agenda', (select jsonb_array_length(meeting_slots) from public.cells where id = '10000000-0000-0000-0000-000000000031') = 2);
select tests.as_anon();
select tests.ok('a página mostra os dois dias', (select jsonb_array_length(meeting_slots) from public.public_cell_page('celula-viva')) = 2);
reset role;
update public.cells set web_show_schedule = false where id = '10000000-0000-0000-0000-000000000031';
select tests.as_anon();
select tests.ok('com o horário escondido, a página não mostra a agenda', (select meeting_slots from public.public_cell_page('celula-viva')) = '[]'::jsonb);
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000033');
select tests.ok('a prévia do convite mostra a agenda', (select jsonb_array_length(meeting_slots) from public.invite_preview(:'rui_code')) = 2);
reset role;
select tests.as_user('00000000-0000-0000-0000-000000000031');
update public.cells set weekday = 4, time = '19:00' where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('a versão anterior do app muda só o dia: a agenda volta para o dia único', (select meeting_slots = '[]'::jsonb and weekday = 4 from public.cells where id = '10000000-0000-0000-0000-000000000031'));
select tests.as_user('00000000-0000-0000-0000-000000000031');
update public.cells set weekday = 2, time = '20:00', meeting_slots = '[{"weekday":2,"time":"20:00"},{"weekday":6,"time":"16:00"}]' where id = '10000000-0000-0000-0000-000000000031';
reset role;
select tests.ok('o app novo muda o dia e a agenda juntos', (select jsonb_array_length(meeting_slots) from public.cells where id = '10000000-0000-0000-0000-000000000031') = 2);
