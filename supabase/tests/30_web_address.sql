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
select tests.ok('pelo endereço novo, deixar nome e telefone devolve o endereço completo',
  (select address from public.leave_contact('celula-viva', 'Visitante', '11987654321')) = 'Rua Secreta, 10');
select public.leave_web_prayer('celula-viva', null, 'Pedido pela página');
select public.report_cell_page('celula-viva', 'logo', 'Imagem imprópria');
reset role;
select tests.ok('pelo endereço novo, o pedido de oração chega ao líder', exists (select 1 from public.cell_web_prayers where text = 'Pedido pela página' and cell_id = '10000000-0000-0000-0000-000000000031'));
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
