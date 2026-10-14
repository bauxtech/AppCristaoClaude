-- Membro sem vaga vê só reunião, horário, endereço, roteiro e presença (14/10).
-- Carona, materiais, playlist e enquetes ficam para quem usa a célula, como pedidos, escala e mural.
create policy seat_read on public.cell_rides as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.cell_materials as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.cell_playlist as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.cell_polls as restrictive for select to authenticated using (public.i_see_cell_extras(cell_id));
create policy seat_read on public.ride_requests as restrictive for select to authenticated
  using (exists (select 1 from public.cell_rides r where r.id = ride_id and public.i_see_cell_extras(r.cell_id)));

-- Lista de membros: "ativo" só para líder e auxiliar.
drop function if exists public.cell_member_cards(uuid);
create function public.cell_member_cards(p_cell uuid)
returns table (user_id uuid, name text, photo_path text, birthday text, role public.cell_role, status public.member_status,
  active boolean, show_books boolean, books_read integer, phone text, is_me boolean,
  reading_joined boolean, show_reading boolean, reading_progress smallint, seat text)
language plpgsql stable security definer set search_path = public as $$
declare v_leader boolean := public.is_cell_leader(p_cell); v_manager boolean := public.can_manage_attendance(p_cell);
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  return query
  select m.user_id, p.name,
    case when p.show_photo then p.photo_path end,
    case when p.show_birthday and p.birthday is not null then to_char(p.birthday, 'MM-DD') end,
    m.role, m.status,
    -- Quem está ativo revela quem não paga: só o líder e o auxiliar (que monta a escala) veem. A própria pessoa também.
    case when v_manager or m.user_id = auth.uid() then public.can_use_cell(p_cell, m.user_id) end,
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

