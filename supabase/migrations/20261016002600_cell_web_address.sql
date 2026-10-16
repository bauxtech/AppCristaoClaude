-- Endereço próprio da página da célula (acasa.app.br/celulas/<nome>) e logo da célula. Decidido em 16/10.
-- - O líder escolhe o nome do endereço ao criar a célula ou depois. Duas células podem ter o mesmo nome,
--   mas o endereço é único. Letras minúsculas, números e hífen, de 3 a 30.
-- - Palavras reservadas e palavrões ficam em tabelas que a equipe edita no painel.
-- - Trocar o endereço: o antigo leva para o novo por 30 dias e ninguém pega ele nesse tempo.
-- - Célula encerrada ou sem o plano Líder: o endereço fica guardado por 90 dias. Depois, fica livre.
-- - Logo: só o líder envia. Fica num balde público (a página é pública), só imagem e até 1 MB.
--   A equipe tira o logo do ar com cells.logo_hidden.
-- - Denúncia pela página: vai para a equipe (web_reports), sem login.
-- - O link antigo /c/<código> continua funcionando.

-- ─── Colunas ────────────────────────────────────────────────────────────────

alter table public.cells
  add column web_slug text unique,
  add column logo_path text,
  add column logo_hidden boolean not null default false,
  -- Desde quando a célula está encerrada ou sem o plano Líder. A rotina diária preenche e limpa.
  add column web_inactive_since timestamptz;

-- Endereços antigos: levam para o novo até "until".
create table public.cell_slug_history (
  slug text primary key,
  cell_id uuid not null references public.cells (id) on delete cascade,
  until timestamptz not null
);
alter table public.cell_slug_history enable row level security;
-- Ninguém lê nem escreve direto: só as funções abaixo.
revoke all on public.cell_slug_history from anon, authenticated;

create table public.reserved_slugs (word text primary key);
alter table public.reserved_slugs enable row level security;
revoke all on public.reserved_slugs from anon, authenticated;
insert into public.reserved_slugs (word) values
  ('acasa'), ('a-casa'), ('admin'), ('administrador'), ('api'), ('app'), ('apps'), ('c'), ('celula'), ('celulas'),
  ('login'), ('entrar'), ('sair'), ('cadastro'), ('conta'), ('contas'), ('ajuda'), ('suporte'), ('contato'),
  ('termos'), ('termos-de-uso'), ('privacidade'), ('politica'), ('politica-de-privacidade'), ('lgpd'),
  ('www'), ('site'), ('blog'), ('sobre'), ('equipe'), ('oficial'), ('teste'), ('testes'), ('demo'),
  ('novo'), ('nova'), ('static'), ('assets'), ('planos'), ('assinatura'), ('baixar'), ('download'),
  ('igreja'), ('igrejas'), ('biblia'), ('chat'), ('culto'), ('cultos'), ('suporte-acasa'), ('null'), ('undefined')
on conflict do nothing;

-- Palavrões: a palavra inteira entre hífens, ou dentro do endereço quando tem 5 letras ou mais.
create table public.blocked_slug_words (word text primary key);
alter table public.blocked_slug_words enable row level security;
revoke all on public.blocked_slug_words from anon, authenticated;
insert into public.blocked_slug_words (word) values
  ('porra'), ('caralho'), ('buceta'), ('boceta'), ('cacete'), ('merda'), ('bosta'), ('foder'), ('fodase'),
  ('foda'), ('fodido'), ('puta'), ('putaria'), ('puto'), ('viado'), ('veado'), ('arrombado'), ('arrombada'),
  ('cuzao'), ('cu'), ('piroca'), ('pica'), ('rola'), ('xoxota'), ('xereca'), ('punheta'), ('siririca'),
  ('vagabunda'), ('vagabundo'), ('vadia'), ('corno'), ('babaca'), ('otario'), ('desgracado'), ('desgraca'),
  ('satanas'), ('diabo'), ('demonio'), ('lucifer'), ('nazista'), ('hitler'), ('macumba'), ('sexo'), ('porno'),
  ('pornografia'), ('nude'), ('nudes'), ('safada'), ('safado'), ('fdp'), ('pqp'), ('vsf'), ('tnc'), ('krl')
on conflict do nothing;

-- Denúncias feitas pela página, sem login. A equipe lê no painel.
create table public.web_reports (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  reason text not null check (reason in ('logo', 'nome', 'outro')),
  detail text check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);
alter table public.web_reports enable row level security;
revoke all on public.web_reports from anon, authenticated;

-- ─── Regras do nome do endereço ─────────────────────────────────────────────

-- 'ok' | 'invalid' | 'reserved' | 'blocked'
create or replace function public.slug_problem(p_slug text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p_slug is null or p_slug !~ '^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$' or p_slug like '%--%' then 'invalid'
    when exists (select 1 from public.reserved_slugs where word = p_slug) then 'reserved'
    when exists (
      select 1 from public.blocked_slug_words w
      where w.word = any (string_to_array(p_slug, '-'))
        or (char_length(w.word) >= 5 and position(w.word in replace(p_slug, '-', '')) > 0)
    ) then 'blocked'
    else 'ok'
  end
$$;

-- O endereço está com outra célula (agora ou guardado como antigo)?
create or replace function public.slug_taken(p_slug text, p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cells where web_slug = p_slug and id is distinct from p_cell)
    or exists (select 1 from public.cell_slug_history where slug = p_slug and cell_id is distinct from p_cell and until > now())
$$;

-- Para o app conferir enquanto o líder digita. Devolve 'ok', 'invalid', 'reserved', 'blocked' ou 'taken'.
create or replace function public.check_cell_web_slug(p_slug text, p_cell uuid default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare v text := public.slug_problem(p_slug);
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  if v <> 'ok' then return v; end if;
  if public.slug_taken(p_slug, p_cell) then return 'taken'; end if;
  return 'ok';
end $$;

-- Grava o endereço. Só o líder, com a célula ativa. O antigo leva para o novo por 30 dias.
-- Devolve 'ok', 'invalid', 'reserved', 'blocked', 'taken' ou 'no_access'.
create or replace function public.set_cell_web_slug(p_cell uuid, p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v text := public.slug_problem(p_slug); v_old text;
begin
  if not public.is_cell_leader(p_cell) or not public.cell_active(p_cell) then return 'no_access'; end if;
  if v <> 'ok' then return v; end if;
  -- Trava por endereço: dois líderes pedindo o mesmo nome ao mesmo tempo, só um leva.
  perform pg_advisory_xact_lock(hashtext('cell_web_slug:' || p_slug));
  if public.slug_taken(p_slug, p_cell) then return 'taken'; end if;
  select web_slug into v_old from public.cells where id = p_cell for update;
  if v_old = p_slug then return 'ok'; end if;
  -- Voltar para um endereço antigo da própria célula: ele deixa de ser antigo.
  delete from public.cell_slug_history where slug = p_slug and cell_id = p_cell;
  if v_old is not null then
    insert into public.cell_slug_history (slug, cell_id, until) values (v_old, p_cell, now() + interval '30 days')
    on conflict (slug) do update set cell_id = excluded.cell_id, until = excluded.until;
  end if;
  perform set_config('acasa.web_ok', '1', true);
  update public.cells set web_slug = p_slug where id = p_cell;
  return 'ok';
end $$;

-- Logo: o caminho precisa estar na pasta da célula, no balde cell-logos. null tira o logo.
create or replace function public.set_cell_logo(p_cell uuid, p_path text)
returns text language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_cell_leader(p_cell) or not public.cell_active(p_cell) then return 'no_access'; end if;
  if p_path is not null and (public.path_uuid(p_path) is distinct from p_cell
      or p_path !~ '^[0-9a-f-]{36}/logo-[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
      or not exists (select 1 from storage.objects where bucket_id = 'cell-logos' and name = p_path)) then
    return 'invalid';
  end if;
  select logo_path into v_old from public.cells where id = p_cell for update;
  perform set_config('acasa.web_ok', '1', true);
  -- Logo novo volta a aparecer, mesmo se a equipe tinha tirado o anterior.
  update public.cells set logo_path = p_path, logo_hidden = false where id = p_cell;
  if v_old is not null and v_old is distinct from p_path then
    delete from storage.objects where bucket_id = 'cell-logos' and name = v_old;
  end if;
  return 'ok';
end $$;

-- As colunas da página só mudam pelas funções acima (ou pela equipe, no painel).
create or replace function public.guard_cell_web_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and coalesce(current_setting('acasa.web_ok', true), '') <> '1' and (
    new.web_slug is distinct from old.web_slug or new.logo_path is distinct from old.logo_path
    or new.logo_hidden is distinct from old.logo_hidden or new.web_inactive_since is distinct from old.web_inactive_since
  ) then
    raise exception 'Use as funções da página da célula';
  end if;
  return new;
end $$;
create trigger guard_cell_web_columns before update on public.cells for each row execute function public.guard_cell_web_columns();

-- ─── Criar célula com o endereço ────────────────────────────────────────────
-- p_web_slug é opcional. Se estiver tomado ou não valer, a célula é criada sem endereço e o líder escolhe depois.

drop function public.create_cell(text, text, int, text, text, text, text, uuid);
create function public.create_cell(p_name text, p_type text, p_weekday int, p_time text, p_address text, p_reference text, p_neighborhood text, p_id uuid default null, p_web_slug text default null)
returns public.cells language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  if p_id is not null and exists (select 1 from public.cells where id = p_id) then
    -- Reenvio da mesma criação pela fila: devolve a célula só a quem a criou e ainda participa dela.
    select * into c from public.cells where id = p_id and created_by = auth.uid() and public.is_cell_member(id);
    if c.id is null then raise exception 'Sem permissão'; end if;
    return c;
  end if;
  insert into public.cells (id, name, type, weekday, time, address, reference, neighborhood, created_by)
  values (coalesce(p_id, gen_random_uuid()), trim(p_name), p_type, p_weekday, p_time, p_address, p_reference, p_neighborhood, auth.uid())
  returning * into c;
  insert into public.cell_members (cell_id, user_id, role, status, joined_at) values (c.id, auth.uid(), 'lider', 'approved', now());
  if p_web_slug is not null then
    perform public.set_cell_web_slug(c.id, p_web_slug);
    select * into c from public.cells where id = c.id;
  end if;
  return c;
end $$;

-- ─── Página pública ─────────────────────────────────────────────────────────

-- Acha a célula pelo endereço novo ou por um antigo ainda válido (/celulas/<nome>).
-- Links antigos /c/<código> chegam como 'c:<código>' e procuram só pelo código de convite,
-- para um endereço como "abc123" nunca abrir a célula de outro código.
create or replace function public.web_cell_id(p_key text) returns uuid
language sql stable security definer set search_path = public as $$
  select case when p_key like 'c:%' then
    (select id from public.cells where invite_code = upper(regexp_replace(substr(p_key, 3), '[^A-Za-z0-9]', '', 'g')))
  else coalesce(
    (select id from public.cells where web_slug = lower(p_key)),
    (select cell_id from public.cell_slug_history where slug = lower(p_key) and until > now())
  ) end
$$;

drop function public.public_cell_page(text);
create function public.public_cell_page(p_code text)
returns table (name text, type text, weekday int, "time" text, neighborhood text, leader_first_name text, archived boolean, slug text, logo_path text)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, c.weekday, c.time, c.neighborhood,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.archived or not public.cell_active(c.id),
    c.web_slug,
    case when c.logo_hidden then null else c.logo_path end
  from public.cells c
  where c.id = public.web_cell_id(p_code)
$$;

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
  -- Limite simples contra abuso: 5 contatos por telefone por dia.
  if (select count(*) from public.cell_leads where phone = v_phone and created_at > now() - interval '1 day') >= 5 then
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
  insert into public.cell_web_prayers (cell_id, name, text) values (c.id, nullif(left(trim(coalesce(p_name, '')), 80), ''), left(trim(p_text), 1000));
end $$;

-- Denúncia pela página. Até 30 por célula por dia, para a fila não ser inundada.
create or replace function public.report_cell_page(p_code text, p_reason text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cell uuid := public.web_cell_id(p_code);
begin
  if v_cell is null then raise exception 'Célula não encontrada'; end if;
  if p_reason not in ('logo', 'nome', 'outro') then raise exception 'Motivo inválido'; end if;
  if (select count(*) from public.web_reports where cell_id = v_cell and created_at > now() - interval '1 day') >= 30 then
    return;
  end if;
  insert into public.web_reports (cell_id, reason, detail) values (v_cell, p_reason, nullif(left(trim(coalesce(p_detail, '')), 500), ''));
end $$;

-- ─── Rotina diária: guardar e liberar endereços ─────────────────────────────

create or replace function public.release_cell_slugs()
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('acasa.web_ok', '1', true);
  update public.cells c set web_inactive_since = now()
    where web_slug is not null and web_inactive_since is null and not public.cell_active(c.id);
  update public.cells c set web_inactive_since = null
    where web_inactive_since is not null and public.cell_active(c.id);
  -- 90 dias parada: o endereço fica livre. A célula continua com a página pelo código de convite.
  with freed as (
    update public.cells set web_slug = null
    where web_slug is not null and web_inactive_since < now() - interval '90 days'
    returning id
  ) select count(*) into n from freed;
  delete from public.cell_slug_history where until < now();
  return n;
end $$;

-- ─── Balde do logo ──────────────────────────────────────────────────────────
-- Público porque a página é pública. Só imagem, até 1 MB. Só o líder da célula escreve na pasta dela.
-- Célula parada não põe logo na página: set_cell_logo confere.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cell-logos', 'cell-logos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy cell_logos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'cell-logos' and public.is_cell_leader(public.path_uuid(name)));
create policy cell_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cell-logos' and public.is_cell_leader(public.path_uuid(name)));

-- ─── Permissões ─────────────────────────────────────────────────────────────

revoke all on function public.slug_problem, public.slug_taken, public.web_cell_id, public.release_cell_slugs, public.guard_cell_web_columns from public, anon, authenticated;
grant execute on function public.release_cell_slugs to service_role;

revoke all on function public.check_cell_web_slug, public.set_cell_web_slug, public.set_cell_logo, public.create_cell from public, anon;
grant execute on function public.check_cell_web_slug, public.set_cell_web_slug, public.set_cell_logo, public.create_cell to authenticated;

revoke all on function public.public_cell_page, public.leave_contact, public.leave_web_prayer, public.report_cell_page from public;
grant execute on function public.public_cell_page, public.leave_contact, public.leave_web_prayer, public.report_cell_page to anon, authenticated;
