-- Correções da revisão de segurança de 18/10.

-- ─── 1. IP do registro de acesso ────────────────────────────────────────────
-- O primeiro valor de x-forwarded-for vem de quem chama e pode ser inventado. O proxy da frente
-- (Cloudflare) põe o IP de verdade em cf-connecting-ip e no fim de x-forwarded-for.
-- E no máximo um registro por hora por pessoa, qualquer que seja o IP.
create or replace function public.log_access()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_xff text[] := string_to_array(coalesce(v_headers ->> 'x-forwarded-for', ''), ',');
  v_ip text := left(trim(coalesce(
    nullif(v_headers ->> 'cf-connecting-ip', ''),
    nullif(v_xff[array_length(v_xff, 1)], ''),
    nullif(v_headers ->> 'x-real-ip', ''),
    ''
  )), 45);
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.access_logs where user_id = auth.uid() and at > now() - interval '1 hour') then
    return;
  end if;
  insert into public.access_logs (user_id, ip) values (auth.uid(), nullif(v_ip, ''));
end $$;

-- ─── 2. Logo: só arquivo de logo, só célula ativa ───────────────────────────
-- As regras do Storage rodam como quem chama; esta função confere tudo com permissão do dono.
create or replace function public.can_upload_cell_logo(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_name ~ '^[0-9a-f-]{36}/logo-[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
    and public.is_cell_leader(public.path_uuid(p_name))
    and public.cell_active(public.path_uuid(p_name))
$$;
revoke all on function public.can_upload_cell_logo from public, anon;
grant execute on function public.can_upload_cell_logo to authenticated;

drop policy if exists cell_logos_write on storage.objects;
create policy cell_logos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'cell-logos' and public.can_upload_cell_logo(name));

-- ─── 3. Página: célula parada não é célula arquivada ────────────────────────
drop function public.public_cell_page(text);
create function public.public_cell_page(p_code text)
returns table (name text, type text, weekday int, "time" text, neighborhood text, leader_first_name text, archived boolean, paused boolean, slug text, logo_path text)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, c.weekday, c.time, c.neighborhood,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.archived,
    -- Parada: o líder está sem o plano Líder. Volta quando ele assinar de novo.
    not c.archived and not public.cell_active(c.id),
    c.web_slug,
    case when c.logo_hidden then null else c.logo_path end
  from public.cells c
  where c.id = public.web_cell_id(p_code)
$$;
revoke all on function public.public_cell_page from public;
grant execute on function public.public_cell_page to anon, authenticated;

-- ─── 4. Quem fica sem vaga sai da escala ────────────────────────────────────
-- Ao perder a vaga (o líder tira, ou a pessoa sai da célula), a escala de hoje em diante fica sem ela.
-- Quem perde o plano próprio sai pela rotina diária, porque o fim do plano não passa por nenhuma tabela da célula.
create or replace function public.clear_seatless_schedule(p_cell uuid default null, p_user uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    update public.cell_schedule s set member_id = null
    where s.member_id is not null
      and (p_cell is null or s.cell_id = p_cell)
      and (p_user is null or s.member_id = p_user)
      and (s.meeting_date is null or s.meeting_date >= (now() at time zone 'America/Sao_Paulo')::date)
      and public.cell_active(s.cell_id)
      and not public.can_use_cell(s.cell_id, s.member_id)
    returning 1
  ) select count(*) into n from gone;
  return n;
end $$;
revoke all on function public.clear_seatless_schedule from public, anon, authenticated;
grant execute on function public.clear_seatless_schedule to service_role;

create or replace function public.on_seat_removed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.clear_seatless_schedule(old.cell_id, old.user_id);
  return old;
end $$;
revoke all on function public.on_seat_removed from public, anon, authenticated;
create trigger on_seat_removed after delete on public.cell_seats for each row execute function public.on_seat_removed();

-- A limpeza diária também tira da escala quem ficou sem plano.
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
  perform public.clear_seatless_schedule();
  return query select a, b, c;
end $$;
