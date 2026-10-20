-- 20/10 (QA): o pedido de entrada leva uma mensagem opcional e a igreja de quem pede, para o líder reconhecer a pessoa.
-- Fica numa tabela à parte (a lista de membros é lida por todos da célula): só quem pediu e os líderes da célula leem,
-- e sai quando o pedido é aprovado ou recusado.

create table public.join_request_notes (
  cell_id uuid not null references public.cells (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 200),
  church text check (char_length(church) <= 120),
  created_at timestamptz not null default now(),
  primary key (cell_id, user_id)
);
alter table public.join_request_notes enable row level security;
revoke all on public.join_request_notes from anon, authenticated;
grant select on public.join_request_notes to authenticated;
create policy join_notes_read on public.join_request_notes for select to authenticated
  using (user_id = auth.uid() or public.is_cell_leader(cell_id));

drop function public.request_join(text);
create function public.request_join(p_code text, p_message text default null, p_church text default null)
returns table (cell_id uuid, cell_name text, status public.member_status)
language plpgsql security definer set search_path = public as $$
declare c public.cells; v_msg text := nullif(left(trim(coalesce(p_message, '')), 200), ''); v_church text := nullif(left(trim(coalesce(p_church, '')), 120), '');
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  select * into c from public.cells where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) and not archived;
  if c.id is null then raise exception 'Código inválido'; end if;
  insert into public.cell_members (cell_id, user_id, role, status)
  values (c.id, auth.uid(), 'membro', 'pending')
  on conflict on constraint cell_members_pkey do update
    set status = case when cell_members.status = 'rejected' then 'pending' else cell_members.status end,
        requested_at = now();
  if exists (select 1 from public.cell_members m where m.cell_id = c.id and m.user_id = auth.uid() and m.status = 'pending') then
    if v_msg is null and v_church is null then
      delete from public.join_request_notes where join_request_notes.cell_id = c.id and join_request_notes.user_id = auth.uid();
    else
      insert into public.join_request_notes (cell_id, user_id, message, church) values (c.id, auth.uid(), v_msg, v_church)
      on conflict on constraint join_request_notes_pkey do update set message = excluded.message, church = excluded.church, created_at = now();
    end if;
  end if;
  return query select c.id, c.name, m.status from public.cell_members m where m.cell_id = c.id and m.user_id = auth.uid();
end $$;
revoke all on function public.request_join from public, anon;
grant execute on function public.request_join to authenticated;

-- Pedido aprovado, recusado ou desfeito: a mensagem sai.
create or replace function public.clear_join_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.join_request_notes where cell_id = old.cell_id and user_id = old.user_id;
    return old;
  end if;
  if new.status <> 'pending' then
    delete from public.join_request_notes where cell_id = new.cell_id and user_id = new.user_id;
  end if;
  return new;
end $$;
revoke all on function public.clear_join_note from public, anon, authenticated;
create trigger clear_join_note after update of status or delete on public.cell_members
for each row execute function public.clear_join_note();
