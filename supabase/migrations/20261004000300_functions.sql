-- Funções chamadas pelo app e pela página web. Cada uma confere a permissão antes de agir.

-- ─── Célula ──────────────────────────────────────────────────────────────────

-- Cria a célula e põe quem criou como líder aprovado.
create or replace function public.create_cell(p_name text, p_type text, p_weekday int, p_time text, p_address text, p_reference text, p_neighborhood text)
returns public.cells language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  insert into public.cells (name, type, weekday, time, address, reference, neighborhood, created_by)
  values (trim(p_name), p_type, p_weekday, p_time, p_address, p_reference, p_neighborhood, auth.uid())
  returning * into c;
  insert into public.cell_members (cell_id, user_id, role, status, joined_at) values (c.id, auth.uid(), 'lider', 'approved', now());
  return c;
end $$;

-- Pede para entrar com o código. A entrada depende do líder: sempre fica pendente.
-- Devolve só o nome da célula, nunca o endereço.
create or replace function public.request_join(p_code text)
returns table (cell_id uuid, cell_name text, status public.member_status)
language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  select * into c from public.cells where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) and not archived;
  if c.id is null then raise exception 'Código inválido'; end if;
  insert into public.cell_members (cell_id, user_id, role, status)
  values (c.id, auth.uid(), 'membro', 'pending')
  on conflict on constraint cell_members_pkey do update
    set status = case when cell_members.status = 'rejected' then 'pending' else cell_members.status end,
        requested_at = now();
  return query select c.id, c.name, m.status from public.cell_members m where m.cell_id = c.id and m.user_id = auth.uid();
end $$;

-- Lista da célula com o que cada um pode ver. Telefone só para o líder.
-- Foto e aniversário respeitam a privacidade de cada pessoa.
create or replace function public.cell_member_cards(p_cell uuid)
returns table (user_id uuid, name text, photo_path text, birthday text, role public.cell_role, status public.member_status,
  active boolean, show_books boolean, books_read integer, phone text, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_leader boolean := public.is_cell_leader(p_cell);
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  return query
  select m.user_id, p.name,
    case when p.show_photo then p.photo_path end,
    case when p.show_birthday and p.birthday is not null then to_char(p.birthday, 'MM-DD') end,
    m.role, m.status,
    -- Quem não assinou fica na lista como inativo e sai da escala.
    coalesce(s.status in ('trial', 'active', 'canceled_active', 'payment_failed') and
      not (s.status = 'trial' and s.trial_start < now() - interval '7 days'), false),
    p.show_books,
    case when p.show_books then (select count(distinct book)::int from public.bible_reads r where r.user_id = m.user_id) end,
    case when v_leader then p.phone end,
    m.user_id = auth.uid()
  from public.cell_members m
  join public.profiles p on p.id = m.user_id
  left join public.subscriptions s on s.user_id = m.user_id
  where m.cell_id = p_cell and (m.status = 'approved' or v_leader);
end $$;

-- Carona aceita: devolve o telefone só para o motorista e para quem foi aceito, para abrir o WhatsApp.
create or replace function public.ride_contact(p_ride uuid, p_user uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare r public.cell_rides; v_status text;
begin
  select * into r from public.cell_rides where id = p_ride;
  select status into v_status from public.ride_requests where ride_id = p_ride and user_id = p_user;
  if r.id is null or v_status is distinct from 'accepted' then raise exception 'Sem permissão'; end if;
  if auth.uid() = p_user then return (select phone from public.profiles where id = r.driver_id); end if;
  if auth.uid() = r.driver_id then return (select phone from public.profiles where id = p_user); end if;
  raise exception 'Sem permissão';
end $$;

-- Quem sai da célula leva os pedidos de oração com ele: saem do grupo, continuam com a pessoa.
create or replace function public.on_member_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.prayer_requests set shared_cell_id = null where user_id = old.user_id and shared_cell_id = old.cell_id;
  update public.cell_schedule set member_id = null where member_id = old.user_id and cell_id = old.cell_id;
  return old;
end $$;
create trigger on_member_leave after delete on public.cell_members for each row execute function public.on_member_leave();

-- O líder sai só depois de passar a liderança ou arquivar a célula.
create or replace function public.guard_leader_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return old; end if; -- servidor (exclusão de conta já conferida)
  if old.role = 'lider' and old.status = 'approved'
     and not exists (select 1 from public.cells where id = old.cell_id and archived)
     and not exists (select 1 from public.cell_members where cell_id = old.cell_id and role = 'lider' and status = 'approved' and user_id <> old.user_id)
     and exists (select 1 from public.cells where id = old.cell_id) then
    raise exception 'Passe a liderança ou arquive a célula antes de sair';
  end if;
  return old;
end $$;
create trigger guard_leader_leave before delete on public.cell_members for each row execute function public.guard_leader_leave();

-- Passa a liderança: o novo líder precisa ser membro aprovado; quem passou vira membro.
create or replace function public.transfer_leadership(p_cell uuid, p_new_leader uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_cell_leader(p_cell) then raise exception 'Só o líder passa a liderança'; end if;
  if not exists (select 1 from public.cell_members where cell_id = p_cell and user_id = p_new_leader and status = 'approved' and user_id <> auth.uid()) then
    raise exception 'A pessoa precisa ser membro aprovado';
  end if;
  update public.cell_members set role = 'lider' where cell_id = p_cell and user_id = p_new_leader;
  update public.cell_members set role = 'membro' where cell_id = p_cell and user_id = auth.uid();
end $$;

-- ─── Página web da célula (sem login) ────────────────────────────────────────

-- Mostra só o bairro. Nada de endereço, membros ou pedidos.
create or replace function public.public_cell_page(p_code text)
returns table (name text, type text, weekday int, "time" text, neighborhood text, leader_first_name text, archived boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, c.weekday, c.time, c.neighborhood,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.archived
  from public.cells c
  where c.invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
$$;

-- A pessoa deixa nome e telefone; o líder recebe o contato e a página mostra o endereço completo.
create or replace function public.leave_contact(p_code text, p_name text, p_phone text)
returns table (address text, reference text)
language plpgsql security definer set search_path = public as $$
declare c public.cells; v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if char_length(trim(coalesce(p_name, ''))) = 0 or char_length(v_phone) < 10 or char_length(v_phone) > 13 then
    raise exception 'Nome e telefone são obrigatórios';
  end if;
  select * into c from public.cells where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) and not archived;
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
  select * into c from public.cells where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) and not archived;
  if c.id is null then raise exception 'Célula não encontrada'; end if;
  if char_length(trim(coalesce(p_text, ''))) = 0 then raise exception 'Escreva o pedido'; end if;
  insert into public.cell_web_prayers (cell_id, name, text) values (c.id, nullif(left(trim(coalesce(p_name, '')), 80), ''), left(trim(p_text), 1000));
end $$;

-- ─── Conta ───────────────────────────────────────────────────────────────────

-- Marca a conta para exclusão em 30 dias. Quem lidera célula com outros membros passa a liderança antes.
create or replace function public.request_account_deletion()
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.cell_members m
    join public.cells c on c.id = m.cell_id
    where m.user_id = auth.uid() and m.role = 'lider' and m.status = 'approved' and not c.archived
      and exists (select 1 from public.cell_members o where o.cell_id = m.cell_id and o.user_id <> auth.uid() and o.status = 'approved')
  ) then
    raise exception 'Passe a liderança antes de excluir a conta';
  end if;
  update public.profiles set deletion_requested_at = now() where id = auth.uid();
  return now() + interval '30 days';
end $$;

create or replace function public.cancel_account_deletion()
returns void language sql security definer set search_path = public as $$
  update public.profiles set deletion_requested_at = null where id = auth.uid()
$$;

-- Rotina diária (servidor): apaga contas marcadas há 30 dias e áudios vencidos.
create or replace function public.purge_expired()
returns table (accounts integer, audios integer) language plpgsql security definer set search_path = public as $$
declare a int; b int;
begin
  with gone as (
    delete from auth.users u using public.profiles p
    where p.id = u.id and p.deletion_requested_at is not null and p.deletion_requested_at < now() - interval '30 days'
    returning u.id
  ) select count(*) into a from gone;
  with cleared as (
    update public.sermons set audio_path = null, audio_expires_at = null
    where audio_path is not null and audio_expires_at < now() returning id
  ) select count(*) into b from cleared;
  return query select a, b;
end $$;

-- Ninguém além do servidor roda a limpeza.
revoke all on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.purge_expired() to service_role;

-- Funções do app: só para quem está logado.
revoke all on function public.create_cell, public.request_join, public.cell_member_cards, public.ride_contact,
  public.transfer_leadership, public.unshare_prayer, public.request_account_deletion, public.cancel_account_deletion from public, anon;
grant execute on function public.create_cell, public.request_join, public.cell_member_cards, public.ride_contact,
  public.transfer_leadership, public.unshare_prayer, public.request_account_deletion, public.cancel_account_deletion to authenticated;

-- Funções da página web: abertas, sem login.
revoke all on function public.public_cell_page, public.leave_contact, public.leave_web_prayer from public;
grant execute on function public.public_cell_page, public.leave_contact, public.leave_web_prayer to anon, authenticated;

-- Funções internas de gatilho não são chamadas por ninguém.
revoke all on function public.handle_new_user, public.guard_member_update, public.on_member_leave, public.guard_leader_leave from public, anon, authenticated;
