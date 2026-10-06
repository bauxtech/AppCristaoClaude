-- Célula ligada ao app: o que faltava no banco para as telas que já existem.
-- Roteiro e tamanho máximo na própria célula, reuniões canceladas e extras, confirmação de presença
-- e registro de presença por função (que confere o papel antes de gravar).

alter table public.cells add column max_size integer not null default 10 check (max_size between 4 and 40);
-- Roteiro da próxima reunião: título, texto base e seções. Todos os aprovados leem; só o líder escreve (cells_update).
alter table public.cells add column plan jsonb not null default '{"title": "", "ref": "", "sections": []}'::jsonb;

-- Uma reunião por dia em cada célula. Cancelar e marcar encontro extra viram linhas desta tabela.
alter table public.cell_meetings add column cancelled boolean not null default false;
create unique index cell_meetings_cell_date on public.cell_meetings (cell_id, date);

-- Confirmação de presença ("vou" / "não vou"). Cada um grava a sua; a célula vê só quantos vão.
create table public.cell_rsvps (
  cell_id uuid not null references public.cells (id) on delete cascade,
  meeting_date date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  going boolean not null,
  updated_at timestamptz not null default now(),
  primary key (cell_id, meeting_date, user_id)
);
alter table public.cell_rsvps enable row level security;
alter table public.cell_rsvps force row level security;
create policy rsvp_self on public.cell_rsvps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_cell_member(cell_id));
revoke all on public.cell_rsvps from anon;
revoke truncate, references, trigger on public.cell_rsvps from authenticated;
grant select, insert, update, delete on public.cell_rsvps to authenticated;
grant all on public.cell_rsvps to service_role;

-- Quantos confirmaram, sem dizer quem. Só para membro aprovado da célula.
create or replace function public.cell_rsvp_count(p_cell uuid, p_date date)
returns integer language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  return (select count(*)::int from public.cell_rsvps where cell_id = p_cell and meeting_date = p_date and going and user_id <> auth.uid());
end $$;

-- Presença da reunião de um dia: líder e auxiliar. Só conta quem é membro aprovado da célula.
-- p_present: {"<user_id>": true|false, ...}
create or replace function public.mark_attendance(p_cell uuid, p_date date, p_present jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_meeting uuid;
begin
  if not public.can_manage_attendance(p_cell) then raise exception 'Só líder e auxiliar marcam presença'; end if;
  insert into public.cell_meetings (cell_id, date) values (p_cell, p_date)
  on conflict (cell_id, date) do update set date = excluded.date
  returning id into v_meeting;
  insert into public.cell_attendance (meeting_id, user_id, present, marked_by)
  select v_meeting, m.user_id, (p_present ->> m.user_id::text)::boolean, auth.uid()
  from public.cell_members m
  where m.cell_id = p_cell and m.status = 'approved' and p_present ? m.user_id::text
  on conflict (meeting_id, user_id) do update set present = excluded.present, marked_by = excluded.marked_by;
end $$;

revoke all on function public.cell_rsvp_count, public.mark_attendance from public, anon;
grant execute on function public.cell_rsvp_count, public.mark_attendance to authenticated;

-- Criar célula com id gerado no aparelho: funciona sem internet e a fila envia depois.
drop function public.create_cell(text, text, int, text, text, text, text);
create function public.create_cell(p_name text, p_type text, p_weekday int, p_time text, p_address text, p_reference text, p_neighborhood text, p_id uuid default null)
returns public.cells language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  -- Reenvio da mesma criação (fila): devolve a célula que já existe, se for de quem criou.
  select * into c from public.cells where id = p_id and created_by = auth.uid();
  if c.id is not null then return c; end if;
  insert into public.cells (id, name, type, weekday, time, address, reference, neighborhood, created_by)
  values (coalesce(p_id, gen_random_uuid()), trim(p_name), p_type, p_weekday, p_time, p_address, p_reference, p_neighborhood, auth.uid())
  returning * into c;
  insert into public.cell_members (cell_id, user_id, role, status, joined_at) values (c.id, auth.uid(), 'lider', 'approved', now());
  return c;
end $$;
revoke all on function public.create_cell from public, anon;
grant execute on function public.create_cell to authenticated;
