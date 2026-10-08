-- Correções da revisão 3.

-- ─── Culto: um processamento por vez ─────────────────────────────────────────
-- Sem trava, um "Tentar de novo" depois de o servidor já ter recebido o pedido gastava 2 dos 5 cultos do mês.
alter table public.sermons add column if not exists processing_started_at timestamptz;

create or replace function public.claim_sermon(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.sermons set status = 'processing', processing_started_at = now()
  where id = p_id and user_id = auth.uid() and status <> 'ready'
    and (processing_started_at is null or processing_started_at < now() - interval '15 minutes' or status = 'failed');
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke all on function public.claim_sermon from public, anon;
grant execute on function public.claim_sermon to authenticated;

-- ─── Avisos: um aparelho recebe só os avisos da conta que está nele ──────────
create or replace function public.register_push_token(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  if p_token is null or char_length(p_token) > 200 then raise exception 'Token inválido'; end if;
  delete from public.push_tokens where token = p_token and user_id <> auth.uid();
  insert into public.push_tokens (user_id, token) values (auth.uid(), p_token) on conflict do nothing;
end $$;
revoke all on function public.register_push_token from public, anon;
grant execute on function public.register_push_token to authenticated;

-- ─── Retirar o consentimento também apaga quem orou pelos pedidos de outros ─
create or replace function public.withdraw_faith_consent()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  update public.profiles set faith_consent = false, faith_consent_at = null, tradition = null where id = auth.uid();
  -- Pedidos apagados levam junto quem orou (cascade) e saem da célula. Conversas levam as mensagens.
  delete from public.prayer_requests where user_id = auth.uid();
  delete from public.prayer_diary where user_id = auth.uid();
  delete from public.chat_conversations where user_id = auth.uid();
  -- O registro de que a pessoa orou pelos pedidos de outros também é prática religiosa.
  delete from public.prayer_prayed where user_id = auth.uid();
end $$;
revoke all on function public.withdraw_faith_consent from public, anon;
grant execute on function public.withdraw_faith_consent to authenticated;

-- ─── Multiplicação: caronas e trocas de quem mudou ficam na célula nova ─────
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

  -- Pedidos compartilhados vão junto com a pessoa. A escala, as caronas e as trocas da célula antiga ficam sem ela.
  update public.prayer_requests set shared_cell_id = p_new_id where shared_cell_id = p_cell and user_id = any(moving);
  update public.cell_schedule set member_id = null where cell_id = p_cell and member_id = any(moving);
  delete from public.cell_rides where cell_id = p_cell and driver_id = any(moving);
  delete from public.ride_requests r using public.cell_rides c where c.id = r.ride_id and c.cell_id = p_cell and r.user_id = any(moving);
  delete from public.cell_swaps where cell_id = p_cell and status = 'pending' and (from_id = any(moving) or to_id = any(moving));
  delete from public.cell_members where cell_id = p_cell and user_id = any(moving);
  return p_new_id;
end $$;
revoke all on function public.multiply_cell from public, anon;
grant execute on function public.multiply_cell to authenticated;
