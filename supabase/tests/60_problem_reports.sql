-- Reportar um problema (22/10): só o servidor grava e lê. Roda depois de 50_church_directory.sql.

insert into public.problem_reports (user_id, message, screen) select id, 'O app fechou ao abrir a célula', '/celula' from public.profiles limit 1;
insert into public.problem_reports (user_id, message, created_at) select id, 'Relato antigo', now() - interval '13 months' from public.profiles limit 1;

select tests.as_user((select user_id from public.problem_reports limit 1));
select tests.ok('quem reportou não lê os relatos pelo app', tests.denied($$select * from public.problem_reports$$));
select tests.ok('ninguém grava relato direto pelo app, só pela função', tests.denied($$insert into public.problem_reports (user_id, message) values (auth.uid(), 'oi')$$));
select tests.ok('ninguém apaga relato pelo app', tests.denied($$delete from public.problem_reports$$));
select tests.ok('a limpeza só roda pelo servidor', tests.denied($$select public.purge_problem_reports()$$));
reset role;
select tests.as_anon();
select tests.ok('sem login, ninguém lê os relatos', tests.denied($$select * from public.problem_reports$$));
reset role;
select tests.ok('relato vazio é recusado', tests.denied($$insert into public.problem_reports (user_id, message) select id, '   ' from public.profiles limit 1$$));
select tests.ok('a limpeza tira os relatos com mais de 12 meses', public.purge_problem_reports() = 1);
select tests.ok('e mantém os recentes', (select count(*) from public.problem_reports) = 1);
