-- Correção da revisão: o reenvio de create_cell só devolve a célula se quem criou ainda é membro dela.
-- Quem saiu não recebe de volta endereço e código de convite.

create or replace function public.create_cell(p_name text, p_type text, p_weekday int, p_time text, p_address text, p_reference text, p_neighborhood text, p_id uuid default null)
returns public.cells language plpgsql security definer set search_path = public as $$
declare c public.cells;
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  if p_id is not null and exists (select 1 from public.cells where id = p_id) then
    -- Reenvio da mesma criação pela fila: devolve a célula só a quem a criou e ainda participa dela.
    select * into c from public.cells where id = p_id and created_by = auth.uid() and public.is_cell_member(id);
    if c.id is null then raise exception 'Sem permissão'; end if;
    return c;
  end if;
  insert into public.cells (id, name, type, weekday, time, address, reference, neighborhood, created_by)
  values (coalesce(p_id, gen_random_uuid()), trim(p_name), p_type, p_weekday, p_time, p_address, p_reference, p_neighborhood, auth.uid())
  returning * into c;
  insert into public.cell_members (cell_id, user_id, role, status, joined_at) values (c.id, auth.uid(), 'lider', 'approved', now());
  return c;
end $$;
revoke all on function public.create_cell from public, anon;
grant execute on function public.create_cell to authenticated;
