-- Correção: o Supabase não deixa apagar linha de storage.objects direto (gatilho protect_objects_delete).
-- set_cell_logo só troca o caminho na célula. Quem apaga o arquivo antigo é o app, pela API do Storage,
-- depois do 'ok' (a política cell_logos_delete deixa o líder apagar na pasta da célula).

create or replace function public.set_cell_logo(p_cell uuid, p_path text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_cell_leader(p_cell) or not public.cell_active(p_cell) then return 'no_access'; end if;
  if p_path is not null and (public.path_uuid(p_path) is distinct from p_cell
      or p_path !~ '^[0-9a-f-]{36}/logo-[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
      or not exists (select 1 from storage.objects where bucket_id = 'cell-logos' and name = p_path)) then
    return 'invalid';
  end if;
  perform set_config('acasa.web_ok', '1', true);
  -- Logo novo volta a aparecer, mesmo se a equipe tinha tirado o anterior.
  update public.cells set logo_path = p_path, logo_hidden = false where id = p_cell;
  return 'ok';
end $$;
