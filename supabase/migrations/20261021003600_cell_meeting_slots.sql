-- Pedido do Thiago (21/10): a célula pode se reunir em mais de um dia da semana, cada dia com o seu horário.
-- meeting_slots guarda a agenda: [{"weekday": 2, "time": "20:00"}, {"weekday": 6, "time": "16:00"}] (0 = domingo).
-- weekday e time continuam com o primeiro dia, para quem ainda usa a versão anterior do app.
-- Escala e roteiro continuam um de cada, livres para o líder. Presença é por reunião (cell_meetings, por data).

create or replace function public.valid_meeting_slots(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 7
    and not exists (
      select 1 from jsonb_array_elements(p) e
      where jsonb_typeof(e) <> 'object'
        or not (e ? 'weekday') or not (e ? 'time')
        or jsonb_typeof(e -> 'weekday') <> 'number' or (e ->> 'weekday')::numeric not in (0, 1, 2, 3, 4, 5, 6)
        or (e ->> 'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    )
    -- Um horário por dia.
    and (select count(distinct e ->> 'weekday') from jsonb_array_elements(p) e) = jsonb_array_length(p)
$$;

alter table public.cells add column if not exists meeting_slots jsonb not null default '[]'::jsonb;
alter table public.cells add constraint cells_meeting_slots_valid check (public.valid_meeting_slots(meeting_slots));

-- A versão anterior do app muda só weekday e time. Nesse caso a agenda antiga deixaria de valer: volta para o dia único.
create or replace function public.cells_legacy_schedule() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.weekday is distinct from old.weekday or new.time is distinct from old.time) and new.meeting_slots = old.meeting_slots then
    new.meeting_slots := '[]'::jsonb;
  end if;
  return new;
end $$;
drop trigger if exists cells_legacy_schedule on public.cells;
create trigger cells_legacy_schedule before update of weekday, time on public.cells
  for each row execute function public.cells_legacy_schedule();

-- Multiplicação: a célula nova herda a agenda.
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

  insert into public.cells (id, name, type, weekday, time, meeting_slots, neighborhood, max_size, created_by)
  values (coalesce(p_new_id, gen_random_uuid()), left(trim(p_name), 80), old.type, old.weekday, old.time, old.meeting_slots, old.neighborhood, old.max_size, auth.uid())
  returning id into p_new_id;

  insert into public.cell_members (cell_id, user_id, role, status, joined_at)
  select p_new_id, m.user_id, case when m.user_id = p_new_leader then 'lider'::public.cell_role when m.role = 'lider' then 'membro'::public.cell_role else m.role end, 'approved', now()
  from public.cell_members m where m.cell_id = p_cell and m.user_id = any(moving);

  -- Pedidos compartilhados vão junto com a pessoa. A escala, as caronas e as trocas da célula antiga ficam sem ela.
  update public.prayer_requests set shared_cell_id = p_new_id where shared_cell_id = p_cell and user_id = any(moving);
  update public.cell_schedule set member_id = null where cell_id = p_cell and member_id = any(moving);
  delete from public.cell_rides where cell_id = p_cell and driver_id = any(moving);
  delete from public.ride_requests r using public.cell_rides c where c.id = r.ride_id and c.cell_id = p_cell and r.user_id = any(moving);
  delete from public.cell_swaps where cell_id = p_cell and status = 'pending' and (from_id = any(moving) or to_id = any(moving));
  delete from public.cell_members where cell_id = p_cell and user_id = any(moving);
  return p_new_id;
end $$;

-- Página na internet: a agenda inteira, quando o líder escolheu mostrar dia e horário.
drop function public.public_cell_page(text);
create function public.public_cell_page(p_code text)
returns table (name text, type text, bio text, weekday int, "time" text, neighborhood text, archived boolean, paused boolean, slug text, logo_path text, cover_path text, meeting_slots jsonb)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, nullif(trim(coalesce(c.web_bio, '')), ''),
    case when c.web_show_schedule then c.weekday end,
    case when c.web_show_schedule then c.time end,
    c.neighborhood,
    c.archived,
    not c.archived and not public.cell_active(c.id),
    c.web_slug,
    case when c.logo_hidden then null else c.logo_path end,
    case when c.web_cover_hidden then null else c.web_cover_path end,
    case when c.web_show_schedule then c.meeting_slots else '[]'::jsonb end
  from public.cells c
  where c.id = public.web_cell_id(p_code)
$$;
revoke all on function public.public_cell_page from public;
grant execute on function public.public_cell_page to anon, authenticated;

-- Prévia do convite no app: a agenda inteira.
drop function public.invite_preview(text);
create function public.invite_preview(p_code text)
returns table (name text, leader_first_name text, weekday int, "time" text, neighborhood text, archived boolean, meeting_slots jsonb)
language sql stable security definer set search_path = public as $$
  select c.name,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.weekday, c.time, c.neighborhood, c.archived, c.meeting_slots
  from public.cells c
  where c.invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;
revoke all on function public.invite_preview from public, anon;
grant execute on function public.invite_preview to authenticated;
