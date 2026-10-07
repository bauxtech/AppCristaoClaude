-- Decisões do Thiago (7/10):
-- 1. Uma célula pode ter mais de um líder. Quem lidera e não é o único líder sai ou exclui a conta sem passar a liderança.
-- 2. Retirar o consentimento de fé (LGPD art. 11) para o tratamento no servidor: apaga diário, pedidos de oração e tradição
--    da pessoa no banco. No app, esses dados ficam só no aparelho. Sem consentimento, o banco não aceita gravar esses dados.

-- ─── Consentimento de fé ─────────────────────────────────────────────────────

create or replace function public.withdraw_faith_consent()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  update public.profiles set faith_consent = false, faith_consent_at = null, tradition = null where id = auth.uid();
  -- Pedidos apagados levam junto quem orou (cascade) e saem da célula.
  delete from public.prayer_requests where user_id = auth.uid();
  delete from public.prayer_diary where user_id = auth.uid();
end $$;
revoke all on function public.withdraw_faith_consent from public, anon;
grant execute on function public.withdraw_faith_consent to authenticated;

create or replace function public.has_faith_consent() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select faith_consent from public.profiles where id = auth.uid()), false)
$$;
revoke all on function public.has_faith_consent from public, anon;
grant execute on function public.has_faith_consent to authenticated;

-- Regras restritivas: valem junto com as outras. Sem consentimento, nada de diário ou pedido novo no servidor.
create policy faith_consent_diary_insert on public.prayer_diary as restrictive for insert to authenticated with check (public.has_faith_consent());
create policy faith_consent_diary_update on public.prayer_diary as restrictive for update to authenticated using (true) with check (public.has_faith_consent());
create policy faith_consent_requests_insert on public.prayer_requests as restrictive for insert to authenticated with check (public.has_faith_consent());
create policy faith_consent_requests_update on public.prayer_requests as restrictive for update to authenticated using (true) with check (public.has_faith_consent());

-- Tradição só fica guardada com consentimento.
create or replace function public.guard_tradition() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tradition is not null and not coalesce(new.faith_consent, false) then new.tradition := null; end if;
  return new;
end $$;
create trigger guard_tradition before insert or update on public.profiles for each row execute function public.guard_tradition();
revoke all on function public.guard_tradition from public, anon, authenticated;

-- ─── Mais de um líder ────────────────────────────────────────────────────────

create or replace function public.request_account_deletion()
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  -- Precisa passar a liderança só quem é o único líder de uma célula ativa com outros membros.
  if exists (
    select 1 from public.cell_members m
    join public.cells c on c.id = m.cell_id
    where m.user_id = auth.uid() and m.role = 'lider' and m.status = 'approved' and not c.archived
      and exists (select 1 from public.cell_members o where o.cell_id = m.cell_id and o.user_id <> auth.uid() and o.status = 'approved')
      and not exists (select 1 from public.cell_members l where l.cell_id = m.cell_id and l.user_id <> auth.uid() and l.role = 'lider' and l.status = 'approved')
  ) then
    raise exception 'Passe a liderança antes de excluir a conta';
  end if;
  update public.profiles set deletion_requested_at = now() where id = auth.uid();
  return now() + interval '30 days';
end $$;
revoke all on function public.request_account_deletion from public, anon;
grant execute on function public.request_account_deletion to authenticated;
