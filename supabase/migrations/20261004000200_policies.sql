-- Regras de acesso (RLS). Ninguém lê dado de outra pessoa ou de outra célula sem permissão.
-- As funções auxiliares rodam como dono (security definer) para não cair em recursão de RLS.

-- ─── Funções auxiliares ──────────────────────────────────────────────────────

-- Papel de quem chamou na célula, só se aprovado. Nulo quando não é membro.
create or replace function public.my_cell_role(p_cell uuid) returns public.cell_role
language sql stable security definer set search_path = public as $$
  select role from public.cell_members
  where cell_id = p_cell and user_id = auth.uid() and status = 'approved'
$$;

create or replace function public.is_cell_member(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_cell_role(p_cell) is not null
$$;

-- Vê os pedidos de oração da célula: membro aprovado que não é visitante.
create or replace function public.can_see_cell_prayers(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_cell_role(p_cell) <> 'visitante', false)
$$;

create or replace function public.is_cell_leader(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_cell_role(p_cell) = 'lider', false)
$$;

-- Marca presença e edita a escala: líder e auxiliar. O anfitrião não tem permissão a mais.
create or replace function public.can_manage_attendance(p_cell uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_cell_role(p_cell) in ('lider', 'auxiliar'), false)
$$;

-- Compartilham alguma célula (para ver nome e foto um do outro).
create or replace function public.shares_cell(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cell_members a
    join public.cell_members b on a.cell_id = b.cell_id
    where a.user_id = auth.uid() and a.status = 'approved'
      and b.user_id = p_other and b.status = 'approved'
  )
$$;

create or replace function public.has_blocked(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = p_other)
$$;

revoke all on function public.my_cell_role, public.is_cell_member, public.can_see_cell_prayers, public.is_cell_leader,
  public.can_manage_attendance, public.shares_cell, public.has_blocked from public, anon;
grant execute on function public.my_cell_role, public.is_cell_member, public.can_see_cell_prayers, public.is_cell_leader,
  public.can_manage_attendance, public.shares_cell, public.has_blocked to authenticated;

-- ─── Acesso básico às tabelas ────────────────────────────────────────────────
-- anon não lê nenhuma tabela. A página web usa só as funções públicas.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ─── Tabelas só do dono ──────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'bible_reads', 'bible_highlights', 'bible_favorites', 'bible_notes', 'reading_plans', 'plan_progress',
    'activity_days', 'notes', 'milestones', 'prayer_diary', 'prayer_campaigns', 'user_churches',
    'courses', 'ministries', 'saved_events', 'sermons', 'chat_conversations', 'chat_messages',
    'push_tokens'
  ] loop
    execute format($p$create policy owner_all on public.%I for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t);
  end loop;
end $$;

-- ─── Perfil ──────────────────────────────────────────────────────────────────
-- A pessoa lê e edita só o próprio perfil. Nome e foto dos colegas de célula vêm por cell_member_cards().

create policy profile_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ─── Assinatura e limites: a pessoa lê; só o servidor escreve ────────────────

create policy sub_self_select on public.subscriptions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.subscriptions from authenticated;

create policy usage_self_select on public.usage_counters for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.usage_counters from authenticated;

-- ─── Avisos ──────────────────────────────────────────────────────────────────

create policy notif_self_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_self_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_self_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke insert on public.notifications from authenticated;

-- ─── Bloqueio, denúncia e conteúdo escondido ─────────────────────────────────

create policy blocks_self on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
revoke select, update, delete on public.reports from authenticated;

create policy hidden_self on public.hidden_content for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Igreja ──────────────────────────────────────────────────────────────────
-- Diretório: qualquer pessoa logada lê. Igreja à mão: quem cadastrou edita.
-- EM ABERTO: quem pode editar horários de culto e acessibilidade. Por enquanto, só quem cadastrou a igreja.

create policy churches_read on public.churches for select to authenticated using (true);
create policy churches_insert on public.churches for insert to authenticated with check (created_by = auth.uid() and cnpj is null);
create policy churches_update on public.churches for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy services_read on public.church_services for select to authenticated using (true);
create policy services_write on public.church_services for all to authenticated
  using (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid()))
  with check (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid()));

create policy access_read on public.church_accessibility for select to authenticated using (true);
create policy access_write on public.church_accessibility for all to authenticated
  using (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid()))
  with check (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid()));

-- Conteúdo diário publicado: qualquer pessoa logada lê. Só o servidor escreve.
create policy daily_read on public.daily_content for select to authenticated using (published);
revoke insert, update, delete on public.daily_content from authenticated;

-- ─── Célula ──────────────────────────────────────────────────────────────────

-- Célula: só membros aprovados leem (inclui o visitante, que vê reunião e endereço).
create policy cells_read on public.cells for select to authenticated using (public.is_cell_member(id));
create policy cells_update on public.cells for update to authenticated using (public.is_cell_leader(id)) with check (public.is_cell_leader(id));
-- Criar célula passa por create_cell(), que já põe a pessoa como líder.
revoke insert, delete on public.cells from authenticated;

-- Membros: quem é aprovado vê a lista da célula. Cada um vê a própria linha (inclusive o pedido pendente).
-- Telefone não está aqui: fica no perfil, e só o líder recebe por cell_member_cards().
create policy members_read on public.cell_members for select to authenticated
  using (user_id = auth.uid() or public.is_cell_member(cell_id));
-- O líder aprova, recusa e muda papéis. A pessoa pode silenciar a célula para si.
create policy members_leader_update on public.cell_members for update to authenticated
  using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));
create policy members_self_mute on public.cell_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Sair da célula: a própria linha. O líder pode tirar alguém.
create policy members_delete on public.cell_members for delete to authenticated
  using (user_id = auth.uid() or public.is_cell_leader(cell_id));
-- Entrar passa por request_join(), que sempre cria pedido pendente.
revoke insert on public.cell_members from authenticated;

-- Quem não é líder não troca o próprio papel nem se aprova sozinho.
create or replace function public.guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- servidor
  if not public.is_cell_leader(old.cell_id) then
    if new.role <> old.role or new.status <> old.status or new.user_id <> old.user_id or new.cell_id <> old.cell_id then
      raise exception 'Só o líder muda papel ou aprova entrada';
    end if;
  end if;
  return new;
end $$;
create trigger guard_member_update before update on public.cell_members
for each row execute function public.guard_member_update();

-- Pedidos de oração: o dono sempre. A célula vê os compartilhados, menos o visitante.
-- Quem bloqueou alguém deixa de ver os pedidos dessa pessoa.
create policy prayer_owner on public.prayer_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and (shared_cell_id is null or public.can_see_cell_prayers(shared_cell_id)));
create policy prayer_cell_read on public.prayer_requests for select to authenticated
  using (shared_cell_id is not null and public.can_see_cell_prayers(shared_cell_id) and not public.has_blocked(user_id)
    and not exists (select 1 from public.hidden_content h where h.user_id = auth.uid() and h.target_type = 'prayer' and h.target_id = prayer_requests.id::text));
-- O líder pode tirar um pedido do grupo (moderação), sem apagar do dono.
create or replace function public.unshare_prayer(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_cell uuid;
begin
  select shared_cell_id into v_cell from public.prayer_requests where id = p_request;
  if v_cell is null or not (public.is_cell_leader(v_cell) or exists (select 1 from public.prayer_requests where id = p_request and user_id = auth.uid())) then
    raise exception 'Sem permissão';
  end if;
  update public.prayer_requests set shared_cell_id = null where id = p_request;
end $$;

create policy prayed_read on public.prayer_prayed for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.prayer_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy prayed_insert on public.prayer_prayed for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.prayer_requests r where r.id = request_id));
create policy prayed_delete on public.prayer_prayed for delete to authenticated using (user_id = auth.uid());

-- Reuniões e roteiro: todos os aprovados (inclui visitante). Só o líder escreve.
create policy meetings_read on public.cell_meetings for select to authenticated using (public.is_cell_member(cell_id));
create policy meetings_write on public.cell_meetings for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));

-- Presença: líder e auxiliar leem e marcam. O membro lê só a própria.
create policy attendance_read on public.cell_attendance for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.cell_meetings m where m.id = meeting_id and public.can_manage_attendance(m.cell_id)));
create policy attendance_write on public.cell_attendance for all to authenticated
  using (exists (select 1 from public.cell_meetings m where m.id = meeting_id and public.can_manage_attendance(m.cell_id)))
  with check (exists (select 1 from public.cell_meetings m where m.id = meeting_id and public.can_manage_attendance(m.cell_id)));

-- Escala: todos os aprovados leem. Líder e auxiliar editam.
create policy schedule_read on public.cell_schedule for select to authenticated using (public.is_cell_member(cell_id));
create policy schedule_write on public.cell_schedule for all to authenticated using (public.can_manage_attendance(cell_id)) with check (public.can_manage_attendance(cell_id));

-- Trocas: quem está na escala pede; o outro aceita; líder e auxiliar veem tudo.
create policy swaps_read on public.cell_swaps for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.can_manage_attendance(cell_id));
create policy swaps_insert on public.cell_swaps for insert to authenticated
  with check (from_id = auth.uid() and public.is_cell_member(cell_id) and public.my_cell_role(cell_id) <> 'visitante');
create policy swaps_update on public.cell_swaps for update to authenticated
  using (to_id = auth.uid() or public.can_manage_attendance(cell_id)) with check (to_id = auth.uid() or public.can_manage_attendance(cell_id));

-- Mural: todos os aprovados leem (menos de quem bloquearam). Só o líder publica.
create policy board_read on public.cell_board for select to authenticated
  using (public.is_cell_member(cell_id) and (author_id is null or not public.has_blocked(author_id))
    and not exists (select 1 from public.hidden_content h where h.user_id = auth.uid() and h.target_type = 'board' and h.target_id = cell_board.id::text));
create policy board_write on public.cell_board for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id) and author_id = auth.uid());

create policy materials_read on public.cell_materials for select to authenticated using (public.is_cell_member(cell_id));
create policy materials_write on public.cell_materials for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));

-- Carona: membros (não visitantes) veem e oferecem. O telefone nunca aparece aqui: o WhatsApp abre por ride_contact().
create policy rides_read on public.cell_rides for select to authenticated using (public.is_cell_member(cell_id));
create policy rides_insert on public.cell_rides for insert to authenticated
  with check (driver_id = auth.uid() and public.is_cell_member(cell_id) and public.my_cell_role(cell_id) <> 'visitante');
create policy rides_owner on public.cell_rides for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy rides_delete on public.cell_rides for delete to authenticated using (driver_id = auth.uid() or public.is_cell_leader(cell_id));

create policy ride_req_read on public.ride_requests for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.cell_rides r where r.id = ride_id and r.driver_id = auth.uid()));
create policy ride_req_insert on public.ride_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and exists (select 1 from public.cell_rides r where r.id = ride_id and public.is_cell_member(r.cell_id)));
create policy ride_req_driver on public.ride_requests for update to authenticated
  using (exists (select 1 from public.cell_rides r where r.id = ride_id and r.driver_id = auth.uid()))
  with check (exists (select 1 from public.cell_rides r where r.id = ride_id and r.driver_id = auth.uid()));
create policy ride_req_delete on public.ride_requests for delete to authenticated using (user_id = auth.uid());

-- Contatos da página web, visitantes e pedidos da página: só o líder.
create policy leads_leader on public.cell_leads for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));
create policy web_prayers_leader on public.cell_web_prayers for select to authenticated using (public.is_cell_leader(cell_id));
create policy web_prayers_delete on public.cell_web_prayers for delete to authenticated using (public.is_cell_leader(cell_id));
revoke insert, update on public.cell_web_prayers from authenticated;
