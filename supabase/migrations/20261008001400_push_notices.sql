-- Avisos que dependem de outras pessoas. O banco cria o aviso na hora do fato; a função push envia
-- para o celular (rotina a cada minuto). O texto do aviso nunca leva o conteúdo do pedido de oração
-- nem do mural, porque aparece na tela bloqueada e passa pela Apple e pelo Google.

alter table public.notifications add column if not exists pref text;
alter table public.notifications add column if not exists cell_prayer boolean not null default false;
alter table public.notifications add column if not exists pushed_at timestamptz;
create index if not exists notifications_unpushed on public.notifications (created_at) where pushed_at is null;

-- Tipos de aviso ligados e horário de silêncio, copiados do app para o servidor respeitar.
alter table public.profiles add column if not exists notify_prefs jsonb not null default '{}'::jsonb;

create or replace function public.first_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(trim(name), ' ', 1), ''), 'Alguém') from public.profiles where id = p_user
$$;
revoke all on function public.first_name from public, anon, authenticated;

-- Cria o aviso, menos quando quem recebe bloqueou quem causou.
create or replace function public.notify(p_to uuid, p_from uuid, p_type text, p_title text, p_body text, p_href text, p_pref text, p_cell_prayer boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_to is null or p_to = p_from then return; end if;
  if p_from is not null and exists (select 1 from public.blocks where blocker_id = p_to and blocked_id = p_from) then return; end if;
  insert into public.notifications (user_id, type, title, body, href, pref, cell_prayer)
  values (p_to, p_type, left(p_title, 80), left(p_body, 200), p_href, p_pref, p_cell_prayer);
end $$;
revoke all on function public.notify from public, anon, authenticated;

-- "Orei por você"
create or replace function public.notify_prayed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify((select user_id from public.prayer_requests where id = new.request_id), new.user_id,
    'prayer', 'Orei por você', public.first_name(new.user_id) || ' orou pelo seu pedido.', '/oracao', 'orou');
  return new;
end $$;
create trigger notify_prayed after insert on public.prayer_prayed for each row execute function public.notify_prayed();

-- Pedido de entrada: avisa os líderes. Entrada aprovada: avisa a pessoa.
create or replace function public.notify_membership() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cell text; l record;
begin
  select name into v_cell from public.cells where id = new.cell_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    for l in select user_id from public.cell_members where cell_id = new.cell_id and role = 'lider' and status = 'approved' loop
      perform public.notify(l.user_id, new.user_id, 'cell', 'Novo pedido de entrada',
        public.first_name(new.user_id) || ' pediu para entrar na célula ' || v_cell || '.', '/celula/entradas', 'mudancaCelula');
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    perform public.notify(new.user_id, null, 'cell', 'Entrada aprovada', 'Você agora faz parte da célula ' || v_cell || '.', '/celula', null);
  end if;
  return new;
end $$;
create trigger notify_membership after insert or update of status on public.cell_members for each row execute function public.notify_membership();

-- Aviso novo no mural: avisa quem não silenciou a célula.
create or replace function public.notify_board() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cell text; m record;
begin
  select name into v_cell from public.cells where id = new.cell_id;
  for m in select user_id from public.cell_members where cell_id = new.cell_id and status = 'approved' and not muted loop
    perform public.notify(m.user_id, new.author_id, 'cell', 'Novo aviso da célula', v_cell || ': ' || public.first_name(new.author_id) || ' publicou no mural.', '/celula/mural', 'mudancaCelula');
  end loop;
  return new;
end $$;
create trigger notify_board after insert on public.cell_board for each row execute function public.notify_board();

-- Pedido compartilhado com a célula: avisa quem vê os pedidos (o visitante não vê). Mudança de célula
-- (multiplicação) não avisa de novo.
create or replace function public.notify_shared_prayer() returns trigger
language plpgsql security definer set search_path = public as $$
declare m record;
begin
  if new.shared_cell_id is null or (tg_op = 'UPDATE' and old.shared_cell_id is not null) then return new; end if;
  for m in select user_id from public.cell_members where cell_id = new.shared_cell_id and status = 'approved' and role <> 'visitante' and not muted loop
    perform public.notify(m.user_id, new.user_id, 'prayer', 'Novo pedido na célula', public.first_name(new.user_id) || ' compartilhou um pedido de oração.', '/celula/pedidos', 'novoPedido', true);
  end loop;
  return new;
end $$;
create trigger notify_shared_prayer after insert or update of shared_cell_id on public.prayer_requests for each row execute function public.notify_shared_prayer();

revoke all on function public.notify_prayed, public.notify_membership, public.notify_board, public.notify_shared_prayer from public, anon, authenticated;
