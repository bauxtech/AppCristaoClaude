-- Reportar um problema (22/10): a pessoa escreve o que aconteceu e o servidor guarda e avisa a equipe
-- por e-mail (oi@acasa.app.br). Só a função report-problem grava e lê: o app não lê nem altera nada aqui.
-- Apagado junto com a conta e depois de 12 meses (rotina purge).

create table public.problem_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  screen text check (char_length(screen) <= 200),
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 20),
  device text check (char_length(device) <= 100),
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index problem_reports_user on public.problem_reports (user_id, created_at desc);

alter table public.problem_reports enable row level security;
-- Sem políticas: ninguém lê nem grava pelo app. A função usa a chave do servidor depois de conferir o login.
revoke all on public.problem_reports from anon, authenticated;

-- Limpeza: relatos com mais de 12 meses saem (chamada pela rotina purge).
create or replace function public.purge_problem_reports() returns int
language sql security definer set search_path = public as $$
  with d as (delete from public.problem_reports where created_at < now() - interval '12 months' returning 1)
  select count(*)::int from d;
$$;
revoke all on function public.purge_problem_reports() from public, anon, authenticated;
