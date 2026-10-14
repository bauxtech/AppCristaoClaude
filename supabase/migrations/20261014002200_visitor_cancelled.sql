-- Reunião cancelada não conta entre as 3 do visitante: contam só as que aconteceram.
create or replace function public.promote_visitors() returns integer
language plpgsql security definer set search_path = public as $$
declare v_meetings int := public.setting_int('visitor_meetings', 3); v_days int := public.setting_int('visitor_days', 30);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_n int;
begin
  update public.cell_members m set role = 'membro'
  where m.role = 'visitante' and m.status = 'approved' and m.visitor_since is not null
    and (m.visitor_since <= now() - make_interval(days => v_days)
      or (select count(*) from public.cell_meetings g
          where g.cell_id = m.cell_id and not g.cancelled and g.date >= (m.visitor_since at time zone 'America/Sao_Paulo')::date and g.date <= v_today) >= v_meetings);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.promote_visitors() from public, anon, authenticated;
