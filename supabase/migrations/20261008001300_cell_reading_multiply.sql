-- Célula: plano de leitura em grupo, histórico para o líder e multiplicação.

-- ─── Plano de leitura em grupo ───────────────────────────────────────────────
-- O líder escolhe o plano. Cada pessoa decide se participa e se mostra o progresso para a célula.
alter table public.cells add column if not exists reading_plan_id text check (char_length(reading_plan_id) <= 60);
alter table public.cell_members add column if not exists reading_joined boolean not null default false;
alter table public.cell_members add column if not exists show_reading boolean not null default false;
alter table public.cell_members add column if not exists reading_progress smallint check (reading_progress between 0 and 100);

-- A pessoa só muda a própria participação. O resto da linha (papel, situação) segue com o líder.
create or replace function public.set_my_cell_reading(p_cell uuid, p_joined boolean, p_show boolean, p_progress int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  update public.cell_members
    set reading_joined = coalesce(p_joined, reading_joined),
        show_reading = coalesce(p_show, show_reading),
        reading_progress = case when p_progress is null then reading_progress else greatest(0, least(100, p_progress)) end
    where cell_id = p_cell and user_id = auth.uid() and status = 'approved';
end $$;
revoke all on function public.set_my_cell_reading from public, anon;
grant execute on function public.set_my_cell_reading to authenticated;

-- Cartões dos membros passam a trazer o plano em grupo. O progresso só aparece para quem escolheu mostrar.
drop function if exists public.cell_member_cards(uuid);
create function public.cell_member_cards(p_cell uuid)
returns table (user_id uuid, name text, photo_path text, birthday text, role public.cell_role, status public.member_status,
  active boolean, show_books boolean, books_read integer, phone text, is_me boolean,
  reading_joined boolean, show_reading boolean, reading_progress smallint)
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
    public.has_access(m.user_id),
    p.show_books,
    case when p.show_books then (select count(distinct book)::int from public.bible_reads r where r.user_id = m.user_id) end,
    case when v_leader then p.phone end,
    m.user_id = auth.uid(),
    m.reading_joined,
    m.show_reading,
    case when m.show_reading or m.user_id = auth.uid() then m.reading_progress end
  from public.cell_members m
  join public.profiles p on p.id = m.user_id
  where m.cell_id = p_cell and (m.status = 'approved' or v_leader);
end $$;
revoke all on function public.cell_member_cards from public, anon;
grant execute on function public.cell_member_cards to authenticated;

-- ─── Histórico da célula (só o líder) ────────────────────────────────────────
create or replace function public.cell_history(p_cell uuid)
returns table (meetings integer, avg_attendance integer, answered integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cell_leader(p_cell) then raise exception 'Sem permissão'; end if;
  return query
  select
    (select count(*)::int from public.cell_meetings g where g.cell_id = p_cell and g.date <= current_date and not g.cancelled),
    (select coalesce(round(100.0 * avg(case when a.present then 1 else 0 end))::int, 0)
       from public.cell_attendance a join public.cell_meetings g on g.id = a.meeting_id
       where g.cell_id = p_cell and not g.cancelled),
    (select count(*)::int from public.prayer_requests r where r.shared_cell_id = p_cell and r.answered_at is not null);
end $$;
revoke all on function public.cell_history from public, anon;
grant execute on function public.cell_history to authenticated;

-- ─── Multiplicação ───────────────────────────────────────────────────────────
-- O líder escolhe quem lidera a nova célula e quem vai com ela. As pessoas mudam de célula juntas, numa só operação.
-- A nova célula começa com o mesmo tipo, dia, horário e bairro. O endereço fica para o novo líder preencher.
create or replace function public.multiply_cell(p_cell uuid, p_new_id uuid, p_name text, p_new_leader uuid, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  old public.cells;
  moving uuid[];
begin
  if not public.is_cell_leader(p_cell) then raise exception 'Sem permissão'; end if;
  if p_new_id is not null and exists (select 1 from public.cells where id = p_new_id) then
    -- Reenvio pela fila: a divisão já foi feita.
    if exists (select 1 from public.cells where id = p_new_id and created_by = auth.uid()) then return p_new_id; end if;
    raise exception 'Sem permissão';
  end if;
  select * into old from public.cells where id = p_cell and not archived;
  if old.id is null then raise exception 'Célula não encontrada'; end if;
  moving := array(select distinct x from unnest(coalesce(p_members, '{}') || p_new_leader) x where x is not null and x <> auth.uid());
  if p_new_leader is null or p_new_leader = auth.uid() then raise exception 'Escolha quem lidera a nova célula'; end if;
  if exists (select 1 from unnest(moving) x where not exists (
    select 1 from public.cell_members m where m.cell_id = p_cell and m.user_id = x and m.status = 'approved' and m.role <> 'visitante')) then
    raise exception 'Só membros aprovados da célula podem ir para a nova célula';
  end if;

  insert into public.cells (id, name, type, weekday, time, neighborhood, max_size, created_by)
  values (coalesce(p_new_id, gen_random_uuid()), left(trim(p_name), 80), old.type, old.weekday, old.time, old.neighborhood, old.max_size, auth.uid())
  returning id into p_new_id;

  insert into public.cell_members (cell_id, user_id, role, status, joined_at)
  select p_new_id, m.user_id, case when m.user_id = p_new_leader then 'lider'::public.cell_role when m.role = 'lider' then 'membro'::public.cell_role else m.role end, 'approved', now()
  from public.cell_members m where m.cell_id = p_cell and m.user_id = any(moving);

  -- Pedidos compartilhados vão junto com a pessoa. A escala da célula antiga fica sem ela.
  update public.prayer_requests set shared_cell_id = p_new_id where shared_cell_id = p_cell and user_id = any(moving);
  update public.cell_schedule set member_id = null where cell_id = p_cell and member_id = any(moving);
  delete from public.cell_members where cell_id = p_cell and user_id = any(moving);
  return p_new_id;
end $$;
revoke all on function public.multiply_cell from public, anon;
grant execute on function public.multiply_cell to authenticated;
