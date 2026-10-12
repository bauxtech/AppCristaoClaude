-- Planos, teste grátis e bloqueio por função (decisão do Thiago, 12/10).
-- Três planos (Essencial, Completo, Líder), mensal ou anual, com os mesmos limites.
-- Teste: 7 dias corridos pelo servidor, um por número de celular. Depois, grátis para sempre só a Bíblia.
-- O que a pessoa criou nunca é apagado: fica só para leitura. Apagar continua permitido (LGPD).
-- Limites e funções de cada plano ficam em plan_config, editável no painel do Supabase sem versão nova do app.

-- ─── Configuração ────────────────────────────────────────────────────────────

create table public.plan_config (
  plan text primary key check (plan in ('free', 'trial', 'essencial', 'completo', 'lider')),
  rank integer not null,
  -- Funções liberadas: reading_plans, prayer, church, music, chat, sermon, cell, cell_lead.
  features text[] not null default '{}',
  chat_per_day integer not null default 0 check (chat_per_day >= 0),
  sermons_per_period integer not null default 0 check (sermons_per_period >= 0),
  -- Plano Líder: quantos membros sem plano usam as funções da célula.
  cell_free_members integer not null default 0 check (cell_free_members >= 0),
  updated_at timestamptz not null default now()
);

insert into public.plan_config (plan, rank, features, chat_per_day, sermons_per_period, cell_free_members) values
  ('free', 0, '{}', 0, 0, 0),
  ('essencial', 1, '{reading_plans,prayer,church,music,cell,chat}', 5, 0, 0),
  ('completo', 2, '{reading_plans,prayer,church,music,cell,chat,sermon}', 10, 4, 0),
  ('lider', 3, '{reading_plans,prayer,church,music,cell,chat,sermon,cell_lead}', 10, 8, 20),
  -- Teste: tudo liberado, com limites menores para controlar o custo em 7 dias.
  ('trial', 3, '{reading_plans,prayer,church,music,cell,chat,sermon,cell_lead}', 10, 2, 20);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('trial_days', '7'),
  -- "server": teste pelo nosso servidor, sem forma de pagamento. "store": teste da própria loja, se a Apple recusar o nosso.
  ('trial_mode', '"server"');

alter table public.plan_config enable row level security;
alter table public.app_settings enable row level security;
create policy plan_config_read on public.plan_config for select to authenticated using (true);
create policy app_settings_read on public.app_settings for select to authenticated using (true);
revoke all on public.plan_config, public.app_settings from anon;
revoke insert, update, delete, truncate, references, trigger on public.plan_config, public.app_settings from authenticated;

-- ─── Assinatura ──────────────────────────────────────────────────────────────

alter table public.subscriptions add column if not exists plan text check (plan in ('essencial', 'completo', 'lider'));
-- Início do período pago atual, para zerar o contador de cultos a cada período.
alter table public.subscriptions add column if not exists period_start timestamptz;
alter table public.subscriptions add column if not exists product_id text;
-- A conta já usou o teste (ou o número já tinha usado em outra conta).
alter table public.subscriptions add column if not exists trial_used boolean not null default false;
-- A tela de planos do dia 8 já apareceu.
alter table public.subscriptions add column if not exists paywall_seen_at timestamptz;
-- Cortesia para a equipe e para testes: plano liberado até a data, sem loja. Só o servidor grava.
alter table public.subscriptions add column if not exists courtesy_plan text check (courtesy_plan in ('essencial', 'completo', 'lider'));
alter table public.subscriptions add column if not exists courtesy_until timestamptz;
-- Avisos do teste já enviados (5 = dia 5, 7 = dia 7).
alter table public.subscriptions add column if not exists trial_reminded smallint not null default 0;
-- Sem número de celular confirmado, o teste não começa.
alter table public.subscriptions alter column trial_start drop not null;
alter table public.subscriptions alter column trial_start drop default;
update public.subscriptions set trial_used = true where trial_start is not null;
-- Antes do lançamento, todas as contas são da equipe e de testes: ganham o plano Líder de cortesia até 31/12/2026,
-- para os testes no celular não travarem. Para testar o teste grátis e o bloqueio, crie uma conta nova.
update public.subscriptions set courtesy_plan = 'lider', courtesy_until = '2026-12-31 23:59:59-03' where plan is null;

-- Números que já usaram o teste, em código embaralhado (sha256). Ficam mesmo depois de a conta ser excluída,
-- para garantir um teste por número. Ninguém lê pelo app.
create table public.trial_claims (
  phone_hash text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.trial_claims enable row level security;
revoke all on public.trial_claims from authenticated, anon;

create or replace function public.phone_hash(p_phone text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 'UTF8')), 'hex')
$$;

-- Contas que já existiam guardam o número como teste usado.
insert into public.trial_claims (phone_hash)
select public.phone_hash(u.phone) from auth.users u
where u.phone is not null and char_length(regexp_replace(u.phone, '\D', '', 'g')) >= 10
on conflict do nothing;

create or replace function public.setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.app_settings where key = p_key), p_default)
$$;

-- Fim do teste: meia-noite (Brasília) depois do último dia. 7 dias corridos contando o dia do primeiro login.
create or replace function public.trial_end(p_start timestamptz) returns timestamptz
language sql stable security definer set search_path = public as $$
  select (((p_start at time zone 'America/Sao_Paulo')::date + public.setting_int('trial_days', 7))::timestamp) at time zone 'America/Sao_Paulo'
$$;

-- Começa o teste se a conta tem número confirmado e o número nunca usou o teste.
create or replace function public.claim_trial_for(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; v_phone text;
begin
  select * into s from public.subscriptions where user_id = p_user for update;
  if s.user_id is null then return false; end if;
  if s.trial_start is not null then return true; end if;
  if s.trial_used then return false; end if;
  select phone into v_phone from auth.users where id = p_user;
  if char_length(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g')) < 10 then return false; end if;
  insert into public.trial_claims (phone_hash) values (public.phone_hash(v_phone)) on conflict do nothing;
  if not found then
    update public.subscriptions set trial_used = true where user_id = p_user;
    return false;
  end if;
  update public.subscriptions set trial_start = now(), trial_used = true where user_id = p_user;
  return true;
end $$;
revoke all on function public.claim_trial_for(uuid) from public, anon, authenticated;

-- O app chama depois que a pessoa que entrou pelo Google confirma o celular.
create or replace function public.start_my_trial() returns boolean
language sql security definer set search_path = public as $$
  select public.claim_trial_for(auth.uid())
$$;
revoke all on function public.start_my_trial() from public, anon;
grant execute on function public.start_my_trial() to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone);
  insert into public.subscriptions (user_id) values (new.id);
  perform public.claim_trial_for(new.id);
  return new;
end $$;

-- ─── Plano de cada pessoa ────────────────────────────────────────────────────

-- free, trial, essencial, completo ou lider. Pagamento falhou: vale até o fim do prazo para regularizar.
create or replace function public.plan_of(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when s.status = 'active'
        or (s.status = 'canceled_active' and (s.renews_at is null or s.renews_at > now()))
        or (s.status = 'payment_failed' and (s.grace_until is null or s.grace_until > now()))
        then coalesce(s.plan, 'essencial')
      when s.courtesy_plan is not null and (s.courtesy_until is null or s.courtesy_until > now()) then s.courtesy_plan
      when s.trial_start is not null and now() < public.trial_end(s.trial_start) then 'trial'
      else 'free'
    end
    from public.subscriptions s where s.user_id = p_user
  ), 'free')
$$;

create or replace function public.can(p_user uuid, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p_feature = any (c.features) from public.plan_config c where c.plan = public.plan_of(p_user)), false)
$$;

-- Compatível com o que já existia: tem plano ou está no teste.
create or replace function public.has_access(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.plan_of(p_user) <> 'free'
$$;

-- ─── Célula do plano Líder ───────────────────────────────────────────────────

-- A célula funciona quando tem pelo menos um líder com o plano Líder (ou no teste). Sem isso, fica só para leitura.
create or replace function public.cell_active(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cells c join public.cell_members m on m.cell_id = c.id
    where c.id = p_cell and not c.archived and m.role = 'lider' and m.status = 'approved' and public.can(m.user_id, 'cell_lead'))
$$;

-- Vagas sem plano: as maiores entre os líderes da célula. Valem pela ordem de entrada.
create or replace function public.cell_free_seats(p_cell uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(max(c.cell_free_members), 0)
  from public.cell_members m join public.plan_config c on c.plan = public.plan_of(m.user_id)
  where m.cell_id = p_cell and m.role = 'lider' and m.status = 'approved' and 'cell_lead' = any (c.features)
$$;

-- A pessoa usa as funções da célula: célula funcionando e (plano próprio ou uma das vagas sem plano).
create or replace function public.can_use_cell(p_cell uuid, p_user uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_pos int;
begin
  if p_user is null or not public.cell_active(p_cell) then return false; end if;
  if not exists (select 1 from public.cell_members where cell_id = p_cell and user_id = p_user and status = 'approved') then return false; end if;
  if public.can(p_user, 'cell') then return true; end if;
  select pos into v_pos from (
    select m.user_id, row_number() over (order by coalesce(m.joined_at, m.requested_at), m.user_id) as pos
    from public.cell_members m
    where m.cell_id = p_cell and m.status = 'approved' and not public.can(m.user_id, 'cell')
  ) x where x.user_id = p_user;
  return v_pos is not null and v_pos <= public.cell_free_seats(p_cell);
end $$;

revoke all on function public.plan_of(uuid), public.can(uuid, text), public.cell_active(uuid), public.cell_free_seats(uuid), public.can_use_cell(uuid, uuid) from public, anon;
grant execute on function public.plan_of(uuid), public.can(uuid, text), public.cell_active(uuid), public.cell_free_seats(uuid), public.can_use_cell(uuid, uuid) to authenticated, service_role;

-- Atalhos para as regras de acesso: sempre sobre quem está logado.
create or replace function public.i_can(p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can(auth.uid(), p_feature)
$$;
create or replace function public.i_use_cell(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_use_cell(p_cell, auth.uid())
$$;
grant execute on function public.i_can(text), public.i_use_cell(uuid) to authenticated;

-- ─── Limites ─────────────────────────────────────────────────────────────────

alter table public.usage_counters drop constraint if exists usage_counters_kind_check;
alter table public.usage_counters add constraint usage_counters_kind_check check (kind in ('chat_day', 'sermon_month', 'sermon_period', 'cnpj_day'));

-- Período e limite de cada contador. Chat: dia em Brasília. Culto: período atual da assinatura (no teste, o teste todo).
create or replace function public.limit_info(p_user uuid, p_kind text)
returns table (feature text, counter text, period text, lim int, resets_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text := public.plan_of(p_user); c public.plan_config; s public.subscriptions; v_day date; v_start timestamptz; v_anchor timestamptz; v_months int;
begin
  select * into c from public.plan_config where plan = v_plan;
  select * into s from public.subscriptions where user_id = p_user;
  if p_kind = 'chat' then
    v_day := (now() at time zone 'America/Sao_Paulo')::date;
    return query select 'chat'::text, 'chat_day'::text, v_day::text, coalesce(c.chat_per_day, 0), ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo');
  elsif p_kind = 'sermon' then
    if v_plan = 'trial' then
      v_start := s.trial_start;
      return query select 'sermon'::text, 'sermon_period'::text, 't' || to_char(v_start at time zone 'UTC', 'YYYYMMDDHH24MISS'), coalesce(c.sermons_per_period, 0), public.trial_end(s.trial_start);
    else
      -- Ciclos de um mês contados do dia da compra, também no anual (4 por mês, não 4 por ano).
      -- Sem início informado pela loja: mês do calendário.
      v_anchor := coalesce(s.period_start, date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
      v_months := greatest(0, (extract(year from age(now(), v_anchor)) * 12 + extract(month from age(now(), v_anchor)))::int);
      v_start := v_anchor + make_interval(months => v_months);
      return query select 'sermon'::text, 'sermon_period'::text, 'p' || to_char(v_start at time zone 'UTC', 'YYYYMMDDHH24MISS'), coalesce(c.sermons_per_period, 0),
        v_anchor + make_interval(months => v_months + 1);
    end if;
  else
    raise exception 'Limite desconhecido';
  end if;
end $$;

-- Confere a função e conta um uso, no mesmo passo. Só o servidor chama.
-- Resposta: ok, motivo (no_access, limit), restantes, limite, período e quando zera.
create or replace function public.use_limit(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i record; v_left int;
begin
  select * into i from public.limit_info(p_user, p_kind);
  if not public.can(p_user, i.feature) or i.lim <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_access', 'plan', public.plan_of(p_user));
  end if;
  v_left := public.consume_usage(p_user, i.counter, i.period, i.lim);
  if v_left < 0 then
    return jsonb_build_object('ok', false, 'reason', 'limit', 'limit', i.lim, 'resets_at', i.resets_at, 'plan', public.plan_of(p_user));
  end if;
  return jsonb_build_object('ok', true, 'remaining', v_left, 'limit', i.lim, 'counter', i.counter, 'period', i.period, 'resets_at', i.resets_at);
end $$;
revoke all on function public.limit_info(uuid, text), public.use_limit(uuid, text) from public, anon, authenticated;
grant execute on function public.limit_info(uuid, text), public.use_limit(uuid, text) to service_role;

-- ─── O que o app recebe ──────────────────────────────────────────────────────

drop function if exists public.my_access();
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
    'cells', coalesce((select jsonb_object_agg(m.cell_id, jsonb_build_object('active', public.cell_active(m.cell_id), 'can_use', public.can_use_cell(m.cell_id, v_uid)))
      from public.cell_members m where m.user_id = v_uid and m.status = 'approved'), '{}'::jsonb)
  );
end $$;
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- A tela de planos do dia 8 aparece uma vez.
create or replace function public.mark_paywall_seen() returns void
language sql security definer set search_path = public as $$
  update public.subscriptions set paywall_seen_at = coalesce(paywall_seen_at, now()) where user_id = auth.uid()
$$;
revoke all on function public.mark_paywall_seen() from public, anon;
grant execute on function public.mark_paywall_seen() to authenticated;

-- ─── Regras de escrita por função ────────────────────────────────────────────
-- Restritivas: somam às regras que já existem. Só valem para criar e editar. Ler e apagar continuam como antes.

do $$
declare t text; f text;
begin
  for t, f in values
    ('prayer_diary', 'prayer'), ('prayer_campaigns', 'prayer'),
    ('reading_plans', 'reading_plans'), ('plan_progress', 'reading_plans'),
    ('churches', 'church'), ('church_services', 'church'), ('church_accessibility', 'church'),
    ('user_churches', 'church'), ('courses', 'church'), ('ministries', 'church'), ('saved_events', 'church'),
    ('favorite_songs', 'music'),
    ('chat_conversations', 'chat'), ('chat_messages', 'chat'),
    ('sermons', 'sermon')
  loop
    execute format($p$create policy plan_insert on public.%I as restrictive for insert to authenticated with check (public.i_can(%L))$p$, t, f);
    execute format($p$create policy plan_update on public.%I as restrictive for update to authenticated using (public.i_can(%L)) with check (public.i_can(%L))$p$, t, f, f);
  end loop;
end $$;

-- Pedido de oração: plano com oração, ou pedido compartilhado numa célula que a pessoa usa.
create policy plan_insert on public.prayer_requests as restrictive for insert to authenticated
  with check (public.i_can('prayer') or (shared_cell_id is not null and public.i_use_cell(shared_cell_id)));
create policy plan_update on public.prayer_requests as restrictive for update to authenticated
  using (public.i_can('prayer') or (shared_cell_id is not null and public.i_use_cell(shared_cell_id)))
  with check (public.i_can('prayer') or (shared_cell_id is not null and public.i_use_cell(shared_cell_id)));
-- "Orei por você": no plano com oração, ou num pedido da célula que a pessoa usa.
create policy plan_insert on public.prayer_prayed as restrictive for insert to authenticated
  with check (public.i_can('prayer') or exists (select 1 from public.prayer_requests r where r.id = request_id and r.shared_cell_id is not null and public.i_use_cell(r.shared_cell_id)));

-- Tabelas da célula: só numa célula funcionando, por quem tem plano ou vaga.
do $$
declare t text;
begin
  foreach t in array array['cell_board', 'cell_materials', 'cell_meetings', 'cell_playlist', 'cell_polls', 'cell_rides', 'cell_rsvps', 'cell_schedule', 'cell_swaps'] loop
    execute format($p$create policy plan_insert on public.%I as restrictive for insert to authenticated with check (public.i_use_cell(cell_id))$p$, t);
    execute format($p$create policy plan_update on public.%I as restrictive for update to authenticated using (public.i_use_cell(cell_id)) with check (public.i_use_cell(cell_id))$p$, t);
  end loop;
end $$;
create policy plan_insert on public.cell_poll_votes as restrictive for insert to authenticated
  with check (exists (select 1 from public.cell_polls p where p.id = poll_id and public.i_use_cell(p.cell_id)));
create policy plan_update on public.cell_poll_votes as restrictive for update to authenticated
  using (exists (select 1 from public.cell_polls p where p.id = poll_id and public.i_use_cell(p.cell_id)))
  with check (exists (select 1 from public.cell_polls p where p.id = poll_id and public.i_use_cell(p.cell_id)));
create policy plan_insert on public.ride_requests as restrictive for insert to authenticated
  with check (exists (select 1 from public.cell_rides r where r.id = ride_id and public.i_use_cell(r.cell_id)));
create policy plan_update on public.ride_requests as restrictive for update to authenticated
  using (exists (select 1 from public.cell_rides r where r.id = ride_id and public.i_use_cell(r.cell_id)))
  with check (exists (select 1 from public.cell_rides r where r.id = ride_id and public.i_use_cell(r.cell_id)));
create policy plan_attendance on public.cell_attendance as restrictive for insert to authenticated
  with check (exists (select 1 from public.cell_meetings g where g.id = meeting_id and public.i_use_cell(g.cell_id)));
create policy plan_attendance_update on public.cell_attendance as restrictive for update to authenticated
  using (exists (select 1 from public.cell_meetings g where g.id = meeting_id and public.i_use_cell(g.cell_id)))
  with check (exists (select 1 from public.cell_meetings g where g.id = meeting_id and public.i_use_cell(g.cell_id)));
-- Editar a célula (nome, endereço, página web): só o líder com o plano Líder.
create policy plan_update on public.cells as restrictive for update to authenticated
  using (public.i_can('cell_lead')) with check (public.i_can('cell_lead'));

-- Funções do banco que escrevem como dono (passam por cima das regras acima): conferem pelo gatilho.
create or replace function public.guard_cell_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- servidor e rotinas
  if tg_table_name = 'cells' then
    if not public.can(auth.uid(), 'cell_lead') then raise exception 'Criar célula é do plano Líder' using errcode = '42501'; end if;
  elsif tg_table_name = 'cell_meetings' then
    if not public.can_use_cell(new.cell_id, auth.uid()) then raise exception 'Célula sem o plano Líder' using errcode = '42501'; end if;
  elsif tg_table_name = 'cell_attendance' then
    if not exists (select 1 from public.cell_meetings g where g.id = new.meeting_id and public.can_use_cell(g.cell_id, auth.uid())) then
      raise exception 'Célula sem o plano Líder' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_cell_plan before insert on public.cells for each row execute function public.guard_cell_plan();
create trigger guard_cell_plan before insert on public.cell_meetings for each row execute function public.guard_cell_plan();
create trigger guard_cell_plan before insert on public.cell_attendance for each row execute function public.guard_cell_plan();

-- Entrar numa célula pelo convite: só se ela está funcionando.
create or replace function public.guard_join_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() or new.role = 'lider' then return new; end if;
  if tg_op = 'INSERT' and not public.cell_active(new.cell_id) then raise exception 'Esta célula não está recebendo pessoas agora' using errcode = '42501'; end if;
  return new;
end $$;
create trigger guard_join_plan before insert on public.cell_members for each row execute function public.guard_join_plan();

-- ─── Página web da célula ────────────────────────────────────────────────────
-- Célula sem o plano Líder: a página mostra que não está se reunindo e não recebe contato nem pedido.

create or replace function public.public_cell_page(p_code text)
returns table (name text, type text, weekday int, "time" text, neighborhood text, leader_first_name text, archived boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, c.weekday, c.time, c.neighborhood,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.archived or not public.cell_active(c.id)
  from public.cells c
  where c.invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.guard_web_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.cell_active(new.cell_id) then raise exception 'Célula não encontrada'; end if;
  return new;
end $$;
create trigger guard_web_plan before insert on public.cell_leads for each row execute function public.guard_web_plan();
create trigger guard_web_plan before insert on public.cell_web_prayers for each row execute function public.guard_web_plan();

-- ─── Lista de membros ────────────────────────────────────────────────────────
-- "Ativo" agora quer dizer: usa as funções da célula (plano próprio ou vaga do líder). Quem não usa sai da escala.

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
    public.can_use_cell(p_cell, m.user_id),
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

-- ─── Avisos do teste ─────────────────────────────────────────────────────────
-- Rotina diária: no dia 5, quanto falta e o que a pessoa já usou; no dia 7, que o teste termina amanhã.
-- Quem já assinou não recebe. Pedidos e diário só entram na conta para quem deu o consentimento de fé.

create or replace function public.trial_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; v_day int; v_n int := 0; v_body text; v_ch int; v_se int; v_pr int;
begin
  for r in
    select s.user_id, s.trial_start, s.trial_reminded, p.faith_consent
    from public.subscriptions s join public.profiles p on p.id = s.user_id
    where s.trial_start is not null and s.plan is null and s.status not in ('active', 'canceled_active', 'payment_failed')
      and now() < public.trial_end(s.trial_start) and s.trial_reminded < 7
  loop
    v_day := (now() at time zone 'America/Sao_Paulo')::date - (r.trial_start at time zone 'America/Sao_Paulo')::date + 1;
    if v_day >= 7 and r.trial_reminded < 7 then
      perform public.notify(r.user_id, null, 'system', 'Seu teste termina amanhã', 'Escolha um plano para continuar usando tudo. A Bíblia continua grátis.', '/assinatura', null);
      update public.subscriptions set trial_reminded = 7 where user_id = r.user_id;
      v_n := v_n + 1;
    elsif v_day >= 5 and r.trial_reminded < 5 then
      select count(*) into v_ch from public.bible_reads where user_id = r.user_id;
      select count(*) into v_se from public.sermons where user_id = r.user_id and status = 'ready';
      v_pr := 0;
      if r.faith_consent then
        select (select count(*) from public.prayer_diary where user_id = r.user_id) + (select count(*) from public.prayer_requests where user_id = r.user_id) into v_pr;
      end if;
      v_body := format('Até agora: %s %s, %s %s transcrito%s e %s %s.',
        v_ch, case when v_ch = 1 then 'capítulo lido' else 'capítulos lidos' end,
        v_se, case when v_se = 1 then 'culto' else 'cultos' end, case when v_se = 1 then '' else 's' end,
        v_pr, case when v_pr = 1 then 'oração' else 'orações' end);
      perform public.notify(r.user_id, null, 'system', 'Faltam 2 dias do seu teste', v_body, '/assinatura', null);
      update public.subscriptions set trial_reminded = 5 where user_id = r.user_id;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;
revoke all on function public.trial_reminders() from public, anon, authenticated;
grant execute on function public.trial_reminders() to service_role;
