-- Aprovado pelo Thiago em 18/10.
-- 1. Registros de acesso por 6 meses (Marco Civil da Internet, art. 15): data, hora e IP de cada uso do app.
--    Ficam mesmo depois de a conta ser excluída, porque a lei manda guardar. Ninguém lê pelo app.
-- 2. Contatos e pedidos de oração deixados pela página da célula: apagados depois de 12 meses
--    ou quando a célula é encerrada, o que vier primeiro. Os visitantes que o líder cadastra à mão ficam.

-- ─── Registros de acesso ────────────────────────────────────────────────────

create table public.access_logs (
  id bigint generated always as identity primary key,
  -- Sem ligação com a conta: o registro precisa sobreviver à exclusão por 6 meses.
  user_id uuid not null,
  ip text,
  at timestamptz not null default now()
);
create index access_logs_user_at on public.access_logs (user_id, at desc);
create index access_logs_at on public.access_logs (at);
alter table public.access_logs enable row level security;
revoke all on public.access_logs from anon, authenticated;

-- O app chama ao abrir. Grava no máximo um registro por hora para o mesmo IP.
-- O IP vem do cabeçalho que o Supabase repassa; quem chama não escolhe o que é gravado.
create or replace function public.log_access()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text := left(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1)), 45);
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.access_logs where user_id = auth.uid() and ip is not distinct from nullif(v_ip, '') and at > now() - interval '1 hour') then
    return;
  end if;
  insert into public.access_logs (user_id, ip) values (auth.uid(), nullif(v_ip, ''));
end $$;

-- ─── Limpeza diária ─────────────────────────────────────────────────────────

create or replace function public.purge_logs_and_web_contacts()
returns table (logs integer, leads integer, prayers integer)
language plpgsql security definer set search_path = public as $$
declare a int; b int; c int;
begin
  with gone as (delete from public.access_logs where at < now() - interval '6 months' returning 1)
    select count(*) into a from gone;
  with gone as (
    delete from public.cell_leads l using public.cells c
    where l.cell_id = c.id and l.source = 'web' and (l.created_at < now() - interval '12 months' or c.archived)
    returning 1
  ) select count(*) into b from gone;
  with gone as (
    delete from public.cell_web_prayers p using public.cells c
    where p.cell_id = c.id and (p.created_at < now() - interval '12 months' or c.archived)
    returning 1
  ) select count(*) into c from gone;
  return query select a, b, c;
end $$;

revoke all on function public.log_access from public, anon;
grant execute on function public.log_access to authenticated;
revoke all on function public.purge_logs_and_web_contacts from public, anon, authenticated;
grant execute on function public.purge_logs_and_web_contacts to service_role;
