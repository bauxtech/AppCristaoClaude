-- Vagas da célula e visitante (14/10).
-- Vaga: o líder com o plano Líder tem vagas (plan_config.cell_free_members) para membros sem plano próprio.
-- Quem o líder aprova como membro pega uma vaga livre na hora. Visitante não ocupa vaga. Quem tem plano próprio nunca ocupa.
-- Quando uma vaga abre, ela fica livre até o líder dar para alguém.
-- Visitante: até N reuniões da célula ou N dias, o que vier primeiro (app_settings). Depois vira membro sozinho.
-- Membro sem vaga: vê reunião, horário, endereço e roteiro e confirma presença. Não vê pedidos, escala nem avisos.

insert into public.app_settings (key, value) values ('visitor_meetings', '3'), ('visitor_days', '30') on conflict (key) do nothing;

-- Curso pela foto do cronograma: Completo e Líder (e o teste). No Essencial o curso é cadastrado à mão.
update public.plan_config set features = array_append(features, 'course_photo')
where plan in ('completo', 'lider', 'trial') and not ('course_photo' = any (features));

-- ─── Vagas ───────────────────────────────────────────────────────────────────

-- Fica fora de cell_members: os outros membros não precisam saber quem usa vaga (e, por tabela, quem não paga).
create table public.cell_seats (
  cell_id uuid not null,
  user_id uuid not null,
  since timestamptz not null default now(),
  primary key (cell_id, user_id),
  foreign key (cell_id, user_id) references public.cell_members (cell_id, user_id) on delete cascade
);
alter table public.cell_seats enable row level security;
create policy seats_read on public.cell_seats for select to authenticated using (user_id = auth.uid() or public.is_cell_leader(cell_id));
revoke all on public.cell_seats from anon;
revoke insert, update, delete, truncate, references, trigger on public.cell_seats from authenticated;
grant select on public.cell_seats to authenticated;

-- Quem conta numa vaga agora: aprovado, não visitante, sem plano próprio, por ordem de quando ganhou a vaga.
-- Se o limite baixar no painel, os primeiros continuam e os últimos ficam sem vaga.
create or replace function public.seat_holders(p_cell uuid) returns table (user_id uuid)
language sql stable security definer set search_path = public as $$
  select s.user_id from public.cell_seats s
  join public.cell_members m on m.cell_id = s.cell_id and m.user_id = s.user_id
  where s.cell_id = p_cell and m.status = 'approved' and m.role <> 'visitante' and not public.can(s.user_id, 'cell')
  order by s.since, s.user_id
  limit public.cell_free_seats(p_cell)
$$;

create or replace function public.cell_seats_left(p_cell uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, public.cell_free_seats(p_cell) - (select count(*)::int from public.seat_holders(p_cell)))
$$;

-- plan: tem plano próprio. seat: usa uma vaga. visitor: visitante. none: membro sem plano e sem vaga.
create or replace function public.seat_state(p_cell uuid, p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when m.user_id is null then null
    when public.can(p_user, 'cell') then 'plan'
    when m.role = 'visitante' then 'visitor'
    when exists (select 1 from public.seat_holders(p_cell) h where h.user_id = p_user) then 'seat'
    else 'none' end
  from (select 1) x left join public.cell_members m on m.cell_id = p_cell and m.user_id = p_user and m.status = 'approved'
$$;

-- Usa as funções da célula: célula funcionando e (plano próprio, vaga ou visitante).
-- O visitante continua com os limites do papel (não vê pedidos, não vota, não oferece carona).
create or replace function public.can_use_cell(p_cell uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and public.cell_active(p_cell) and coalesce(public.seat_state(p_cell, p_user) in ('plan', 'seat', 'visitor'), false)
$$;

-- Está na célula funcionando, com ou sem vaga: confirma presença.
create or replace function public.in_active_cell(p_cell uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and public.cell_active(p_cell)
    and exists (select 1 from public.cell_members where cell_id = p_cell and user_id = p_user and status = 'approved')
$$;

-- Pedidos, escala e avisos: quem usa a célula. Célula parada: o que existia continua visível para todos os membros.
create or replace function public.sees_cell_extras(p_cell uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not public.cell_active(p_cell) or public.can_use_cell(p_cell, p_user)
$$;

revoke all on function public.seat_holders(uuid), public.cell_seats_left(uuid), public.seat_state(uuid, uuid), public.can_use_cell(uuid, uuid),
  public.in_active_cell(uuid, uuid), public.sees_cell_extras(uuid, uuid) from public, anon, authenticated;
grant execute on function public.seat_holders(uuid), public.cell_seats_left(uuid), public.seat_state(uuid, uuid), public.can_use_cell(uuid, uuid),
  public.in_active_cell(uuid, uuid), public.sees_cell_extras(uuid, uuid) to service_role;

create or replace function public.i_in_active_cell(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.in_active_cell(p_cell, auth.uid())
$$;
create or replace function public.i_see_cell_extras(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.sees_cell_extras(p_cell, auth.uid())
$$;
revoke all on function public.i_in_active_cell(uuid), public.i_see_cell_extras(uuid) from public, anon;
grant execute on function public.i_in_active_cell(uuid), public.i_see_cell_extras(uuid) to authenticated;

-- Pedidos da célula: membro que não é visitante e que usa a célula (ou célula parada, só leitura).
create or replace function public.can_see_cell_prayers(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_cell_role(p_cell) <> 'visitante', false) and public.sees_cell_extras(p_cell, auth.uid())
$$;

-- Escala, trocas e mural: só quem usa a célula.
create policy seat_read on public.cell_schedule as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.cell_swaps as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.cell_board as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));

-- Confirmar presença: qualquer membro da célula funcionando, com ou sem vaga.
drop policy if exists plan_insert on public.cell_rsvps;
drop policy if exists plan_update on public.cell_rsvps;
create policy plan_insert on public.cell_rsvps as restrictive for insert to authenticated with check (public.i_in_active_cell(cell_id));
create policy plan_update on public.cell_rsvps as restrictive for update to authenticated
  using (public.i_in_active_cell(cell_id)) with check (public.i_in_active_cell(cell_id));

-- Ganha a vaga livre quem o líder aprova como membro, ou quem deixa de ser visitante. Virar visitante devolve a vaga.
create or replace function public.assign_seat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'approved' or new.role = 'visitante' then
    delete from public.cell_seats where cell_id = new.cell_id and user_id = new.user_id;
    return new;
  end if;
  if tg_op = 'INSERT' or old.status <> 'approved' or old.role = 'visitante' then
    if not public.can(new.user_id, 'cell') and public.cell_active(new.cell_id) and public.cell_seats_left(new.cell_id) > 0 then
      insert into public.cell_seats (cell_id, user_id) values (new.cell_id, new.user_id) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
create trigger assign_seat after insert or update of status, role on public.cell_members for each row execute function public.assign_seat();

-- O líder dá ou tira a vaga de alguém (para trocar: tira de um e dá para outro).
create or replace function public.set_member_seat(p_cell uuid, p_user uuid, p_give boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m public.cell_members;
begin
  if not public.is_cell_leader(p_cell) then raise exception 'Só o líder cuida das vagas' using errcode = '42501'; end if;
  if not p_give then
    delete from public.cell_seats where cell_id = p_cell and user_id = p_user;
    return;
  end if;
  if not public.cell_active(p_cell) then raise exception 'Célula sem o plano Líder' using errcode = '42501'; end if;
  select * into m from public.cell_members where cell_id = p_cell and user_id = p_user and status = 'approved';
  if m.user_id is null then raise exception 'Pessoa não está na célula'; end if;
  if m.role = 'visitante' then raise exception 'Visitante não ocupa vaga'; end if;
  if public.can(p_user, 'cell') then raise exception 'Quem tem plano próprio não precisa de vaga'; end if;
  if exists (select 1 from public.seat_holders(p_cell) h where h.user_id = p_user) then return; end if;
  if public.cell_seats_left(p_cell) <= 0 then raise exception 'Não há vaga livre'; end if;
  -- Quem tinha uma vaga antiga além do limite volta para o fim da fila.
  insert into public.cell_seats (cell_id, user_id) values (p_cell, p_user)
  on conflict (cell_id, user_id) do update set since = now();
end $$;

-- Para o líder: quantas vagas a célula tem e quantas estão em uso.
create or replace function public.cell_seat_summary(p_cell uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cell_leader(p_cell) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object('total', public.cell_free_seats(p_cell), 'left', public.cell_seats_left(p_cell));
end $$;
revoke all on function public.set_member_seat(uuid, uuid, boolean), public.cell_seat_summary(uuid) from public, anon;
grant execute on function public.set_member_seat(uuid, uuid, boolean), public.cell_seat_summary(uuid) to authenticated;
revoke all on function public.assign_seat() from public, anon, authenticated;

-- Quem já estava na célula sem plano mantém a situação de antes: vagas pela ordem de entrada.
insert into public.cell_seats (cell_id, user_id, since)
select x.cell_id, x.user_id, x.joined
from (
  select m.cell_id, m.user_id, coalesce(m.joined_at, m.requested_at) as joined,
    row_number() over (partition by m.cell_id order by coalesce(m.joined_at, m.requested_at), m.user_id) as pos
  from public.cell_members m
  where m.status = 'approved' and m.role <> 'visitante' and not public.can(m.user_id, 'cell')
) x
where x.pos <= public.cell_free_seats(x.cell_id)
on conflict do nothing;

-- ─── Visitante ───────────────────────────────────────────────────────────────

alter table public.cell_members add column if not exists visitor_since timestamptz;

-- Marca quando a pessoa começou como visitante. Ninguém escolhe essa data: o banco calcula.
create or replace function public.track_visitor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'visitante' then
    new.visitor_since := null;
  elsif tg_op = 'INSERT' or old.role <> 'visitante' or (new.status = 'approved' and old.status <> 'approved') then
    new.visitor_since := case when new.status = 'approved' then now() end;
  else
    new.visitor_since := old.visitor_since;
  end if;
  return new;
end $$;
create trigger track_visitor before insert or update on public.cell_members for each row execute function public.track_visitor();
revoke all on function public.track_visitor() from public, anon, authenticated;

update public.cell_members set visitor_since = coalesce(joined_at, now()) where role = 'visitante' and status = 'approved' and visitor_since is null;

-- Rotina diária: visitante com N reuniões da célula desde a entrada, ou N dias, vira membro (e pega vaga livre).
create or replace function public.promote_visitors() returns integer
language plpgsql security definer set search_path = public as $$
declare v_meetings int := public.setting_int('visitor_meetings', 3); v_days int := public.setting_int('visitor_days', 30);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_n int;
begin
  update public.cell_members m set role = 'membro'
  where m.role = 'visitante' and m.status = 'approved' and m.visitor_since is not null
    and (m.visitor_since <= now() - make_interval(days => v_days)
      or (select count(*) from public.cell_meetings g
          where g.cell_id = m.cell_id and g.date >= (m.visitor_since at time zone 'America/Sao_Paulo')::date and g.date <= v_today) >= v_meetings);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.promote_visitors() from public, anon, authenticated;

-- ─── Avisos: só para quem vê ─────────────────────────────────────────────────

create or replace function public.notify_board() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cell text; m record;
begin
  select name into v_cell from public.cells where id = new.cell_id;
  for m in select user_id from public.cell_members where cell_id = new.cell_id and status = 'approved' and not muted loop
    if public.sees_cell_extras(new.cell_id, m.user_id) then
      perform public.notify(m.user_id, new.author_id, 'cell', 'Novo aviso da célula', v_cell || ': ' || public.first_name(new.author_id) || ' publicou no mural.', '/celula/mural', 'mudancaCelula');
    end if;
  end loop;
  return new;
end $$;

create or replace function public.notify_shared_prayer() returns trigger
language plpgsql security definer set search_path = public as $$
declare m record;
begin
  if new.shared_cell_id is null or (tg_op = 'UPDATE' and old.shared_cell_id is not null) then return new; end if;
  for m in select user_id from public.cell_members where cell_id = new.shared_cell_id and status = 'approved' and role <> 'visitante' and not muted loop
    if public.sees_cell_extras(new.shared_cell_id, m.user_id) then
      perform public.notify(m.user_id, new.user_id, 'prayer', 'Novo pedido na célula', public.first_name(new.user_id) || ' compartilhou um pedido de oração.', '/celula/pedidos', 'novoPedido', true);
    end if;
  end loop;
  return new;
end $$;

-- ─── Lista de membros ────────────────────────────────────────────────────────
-- O líder vê a situação da vaga de cada um. Os outros membros não.

drop function if exists public.cell_member_cards(uuid);
create function public.cell_member_cards(p_cell uuid)
returns table (user_id uuid, name text, photo_path text, birthday text, role public.cell_role, status public.member_status,
  active boolean, show_books boolean, books_read integer, phone text, is_me boolean,
  reading_joined boolean, show_reading boolean, reading_progress smallint, seat text)
language plpgsql stable security definer set search_path = public as $$
declare v_leader boolean := public.is_cell_leader(p_cell);
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  return query
  select m.user_id, p.name,
    case when p.show_photo then p.photo_path end,
    case when p.show_birthday and p.birthday is not null then to_char(p.birthday, 'MM-DD') end,
    m.role, m.status,
    public.can_use_cell(p_cell, m.user_id),
    p.show_books,
    case when p.show_books then (select count(distinct book)::int from public.bible_reads r where r.user_id = m.user_id) end,
    case when v_leader then p.phone end,
    m.user_id = auth.uid(),
    m.reading_joined,
    m.show_reading,
    case when m.show_reading or m.user_id = auth.uid() then m.reading_progress end,
    case when (v_leader or m.user_id = auth.uid()) and m.status = 'approved' then public.seat_state(p_cell, m.user_id) end
  from public.cell_members m
  join public.profiles p on p.id = m.user_id
  where m.cell_id = p_cell and (m.status = 'approved' or v_leader);
end $$;
revoke all on function public.cell_member_cards from public, anon;
grant execute on function public.cell_member_cards to authenticated;

-- ─── O que o app recebe ──────────────────────────────────────────────────────

create or replace function public.my_access() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_plan text; c public.plan_config; s public.subscriptions; chat record; sermon record;
begin
  if v_uid is null then return null; end if;
  v_plan := public.plan_of(v_uid);
  select * into c from public.plan_config where plan = v_plan;
  select * into s from public.subscriptions where user_id = v_uid;
  select * into chat from public.limit_info(v_uid, 'chat');
  select * into sermon from public.limit_info(v_uid, 'sermon');
  return jsonb_build_object(
    'plan', v_plan,
    'features', to_jsonb(c.features),
    'trial_start', s.trial_start,
    'trial_ends_at', case when s.trial_start is not null then public.trial_end(s.trial_start) end,
    'trial_used', s.trial_used,
    'trial_mode', (select value #>> '{}' from public.app_settings where key = 'trial_mode'),
    'status', s.status,
    'billing', s.billing,
    'store_plan', s.plan,
    'renews_at', s.renews_at,
    'grace_until', s.grace_until,
    'paywall_seen', s.paywall_seen_at is not null,
    'chat', jsonb_build_object('limit', chat.lim, 'used', coalesce((select count from public.usage_counters u where u.user_id = v_uid and u.kind = chat.counter and u.period = chat.period), 0), 'resets_at', chat.resets_at),
    'sermon', jsonb_build_object('limit', sermon.lim, 'used', coalesce((select count from public.usage_counters u where u.user_id = v_uid and u.kind = sermon.counter and u.period = sermon.period), 0), 'resets_at', sermon.resets_at),
    -- Em quais planos cada função aparece, para o cadeado dizer "No plano Completo".
    'min_plan', (select jsonb_object_agg(f, p) from (
      select distinct on (f) f, pc.plan as p from public.plan_config pc, unnest(pc.features) f
      where pc.plan in ('essencial', 'completo', 'lider') order by f, pc.rank) x),
    -- Cada célula: funcionando, usa tudo, e a situação da vaga (plan, seat, visitor, none).
    'cells', coalesce((select jsonb_object_agg(m.cell_id, jsonb_build_object('active', public.cell_active(m.cell_id), 'can_use', public.can_use_cell(m.cell_id, v_uid),
        'seat', public.seat_state(m.cell_id, v_uid)))
      from public.cell_members m where m.user_id = v_uid and m.status = 'approved'), '{}'::jsonb)
  );
end $$;
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;
