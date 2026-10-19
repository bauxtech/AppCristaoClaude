-- 19/10: capa da página da célula e limite de contatos por aparelho.
-- 1. Capa pública da página (como LinkedIn ou Dribbble): o líder envia, fica no mesmo balde público do logo
--    (cell-logos), com nome capa-*. A capa interna do app (cells.cover_path, balde privado) não muda.
--    A equipe tira do ar com cells.web_cover_hidden; a rotina diária apaga o arquivo.
-- 2. Página da célula: no máximo 5 contatos e 10 pedidos de oração por dia por aparelho (endereço de internet).
--    O banco guarda só um código do endereço, nunca o endereço, e apaga em 2 dias.

-- ─── 1. Capa ────────────────────────────────────────────────────────────────

alter table public.cells
  add column web_cover_path text,
  add column web_cover_hidden boolean not null default false;

-- As colunas da página só mudam pelas funções (ou pela equipe, no painel).
create or replace function public.guard_cell_web_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and coalesce(current_setting('acasa.web_ok', true), '') <> '1' and (
    new.web_slug is distinct from old.web_slug or new.logo_path is distinct from old.logo_path
    or new.logo_hidden is distinct from old.logo_hidden or new.web_inactive_since is distinct from old.web_inactive_since
    or new.web_cover_path is distinct from old.web_cover_path or new.web_cover_hidden is distinct from old.web_cover_hidden
  ) then
    raise exception 'Use as funções da página da célula';
  end if;
  return new;
end $$;

-- O balde aceita logo-* e capa-* na pasta da célula, só de líder de célula ativa.
create or replace function public.can_upload_cell_logo(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_name ~ '^[0-9a-f-]{36}/(logo|capa)-[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
    and public.is_cell_leader(public.path_uuid(p_name))
    and public.cell_active(public.path_uuid(p_name))
$$;

-- Põe ou tira a capa. O app apaga o arquivo antigo pela API do Storage depois do 'ok'.
create or replace function public.set_cell_cover(p_cell uuid, p_path text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_cell_leader(p_cell) or not public.cell_active(p_cell) then return 'no_access'; end if;
  if p_path is not null and (public.path_uuid(p_path) is distinct from p_cell
      or p_path !~ '^[0-9a-f-]{36}/capa-[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
      or not exists (select 1 from storage.objects where bucket_id = 'cell-logos' and name = p_path)) then
    return 'invalid';
  end if;
  perform set_config('acasa.web_ok', '1', true);
  -- Capa nova volta a aparecer, mesmo se a equipe tinha tirado a anterior.
  update public.cells set web_cover_path = p_path, web_cover_hidden = false where id = p_cell;
  return 'ok';
end $$;
revoke all on function public.set_cell_cover from public, anon;
grant execute on function public.set_cell_cover to authenticated;

drop function public.public_cell_page(text);
create function public.public_cell_page(p_code text)
returns table (name text, type text, weekday int, "time" text, neighborhood text, leader_first_name text, archived boolean, paused boolean, slug text, logo_path text, cover_path text)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, c.weekday, c.time, c.neighborhood,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.archived,
    not c.archived and not public.cell_active(c.id),
    c.web_slug,
    case when c.logo_hidden then null else c.logo_path end,
    case when c.web_cover_hidden then null else c.web_cover_path end
  from public.cells c
  where c.id = public.web_cell_id(p_code)
$$;
revoke all on function public.public_cell_page from public;
grant execute on function public.public_cell_page to anon, authenticated;

-- Denúncia da capa.
alter table public.web_reports drop constraint if exists web_reports_reason_check;
alter table public.web_reports add constraint web_reports_reason_check check (reason in ('logo', 'capa', 'nome', 'outro'));

create or replace function public.report_cell_page(p_code text, p_reason text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cell uuid := public.web_cell_id(p_code);
begin
  if v_cell is null then raise exception 'Célula não encontrada'; end if;
  if p_reason not in ('logo', 'capa', 'nome', 'outro') then raise exception 'Motivo inválido'; end if;
  if (select count(*) from public.web_reports where cell_id = v_cell and created_at > now() - interval '1 day') >= 30 then
    return;
  end if;
  insert into public.web_reports (cell_id, reason, detail) values (v_cell, p_reason, nullif(left(trim(coalesce(p_detail, '')), 500), ''));
end $$;

-- ─── 2. Limite por aparelho na página ───────────────────────────────────────

-- Endereço de internet de quem chama, como o proxy da frente informa (o mesmo critério de log_access).
create or replace function public.request_ip() returns text
language plpgsql stable as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_xff text[] := string_to_array(coalesce(v_headers ->> 'x-forwarded-for', ''), ',');
begin
  return nullif(left(trim(coalesce(
    nullif(v_headers ->> 'cf-connecting-ip', ''),
    nullif(v_xff[array_length(v_xff, 1)], ''),
    nullif(v_headers ->> 'x-real-ip', ''),
    ''
  )), 45), '');
end $$;
revoke all on function public.request_ip from public, anon, authenticated;

create table public.web_attempts (
  id bigint generated always as identity primary key,
  -- Código do endereço de internet com um segredo do banco: não dá para voltar ao endereço.
  ip_hash text not null,
  kind text not null check (kind in ('contact', 'prayer')),
  at timestamptz not null default now()
);
create index web_attempts_ip_at on public.web_attempts (ip_hash, kind, at desc);
alter table public.web_attempts enable row level security;
revoke all on public.web_attempts from anon, authenticated;

-- Segredo do código, criado uma vez no próprio banco.
create table public.web_attempt_salt (id boolean primary key default true check (id), salt text not null);
alter table public.web_attempt_salt enable row level security;
revoke all on public.web_attempt_salt from anon, authenticated;
insert into public.web_attempt_salt (salt) values (encode(gen_random_bytes(32), 'hex')) on conflict do nothing;

-- Conta a tentativa e diz se ainda cabe no limite do dia. Sem endereço conhecido, não limita.
create or replace function public.web_attempt_ok(p_kind text, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ip text := public.request_ip(); v_hash text;
begin
  if v_ip is null then return true; end if;
  v_hash := encode(digest(v_ip || (select salt from public.web_attempt_salt), 'sha256'), 'hex');
  if (select count(*) from public.web_attempts where ip_hash = v_hash and kind = p_kind and at > now() - interval '1 day') >= p_max then
    return false;
  end if;
  insert into public.web_attempts (ip_hash, kind) values (v_hash, p_kind);
  return true;
end $$;
revoke all on function public.web_attempt_ok from public, anon, authenticated;

create or replace function public.leave_contact(p_code text, p_name text, p_phone text)
returns table (address text, reference text)
language plpgsql security definer set search_path = public as $$
declare c public.cells; v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if char_length(trim(coalesce(p_name, ''))) = 0 or char_length(v_phone) < 10 or char_length(v_phone) > 13 then
    raise exception 'Nome e telefone são obrigatórios';
  end if;
  select * into c from public.cells where id = public.web_cell_id(p_code) and not archived;
  if c.id is null then raise exception 'Célula não encontrada'; end if;
  -- 5 contatos por telefone por dia e 5 por aparelho por dia.
  if (select count(*) from public.cell_leads where phone = v_phone and created_at > now() - interval '1 day') >= 5
      or not public.web_attempt_ok('contact', 5) then
    raise exception 'Muitas tentativas. Tente amanhã';
  end if;
  insert into public.cell_leads (cell_id, name, phone, source) values (c.id, left(trim(p_name), 80), v_phone, 'web');
  return query select c.address, c.reference;
end $$;

create or replace function public.leave_web_prayer(p_code text, p_name text, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  select * into c from public.cells where id = public.web_cell_id(p_code) and not archived;
  if c.id is null then raise exception 'Célula não encontrada'; end if;
  if char_length(trim(coalesce(p_text, ''))) = 0 then raise exception 'Escreva o pedido'; end if;
  if not public.web_attempt_ok('prayer', 10) then raise exception 'Muitas tentativas. Tente amanhã'; end if;
  insert into public.cell_web_prayers (cell_id, name, text) values (c.id, nullif(left(trim(coalesce(p_name, '')), 80), ''), left(trim(p_text), 1000));
end $$;

-- A limpeza diária também apaga as tentativas com mais de 2 dias.
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
  delete from public.web_attempts where at < now() - interval '2 days';
  perform public.clear_seatless_schedule();
  return query select a, b, c;
end $$;
