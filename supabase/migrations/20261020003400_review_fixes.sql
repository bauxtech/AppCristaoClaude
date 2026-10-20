-- Revisão de segurança de 20/10.

-- 1. Foto de quem está na mesma célula: ninguém via a foto dos colegas. A regra comparava com profiles.name
-- (o nome da pessoa) em vez do caminho do arquivo, e lia o perfil do colega, que a pessoa não pode ler.
-- Agora usa o caminho do arquivo e uma função que só diz se o colega mostra a foto.
create or replace function public.cellmate_shows_photo(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.shares_cell(p_other) and exists (select 1 from public.profiles p where p.id = p_other and p.show_photo)
$$;
revoke all on function public.cellmate_shows_photo(uuid) from public, anon;
grant execute on function public.cellmate_shows_photo(uuid) to authenticated;

drop policy if exists avatars_cellmates_read on storage.objects;
create policy avatars_cellmates_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.cellmate_shows_photo(public.path_uuid(objects.name)));

-- 2. Ninguém pelo app troca a pessoa ou a célula de uma linha de membro, nem o líder.
-- Antes o líder podia trocar user_id e colocar na célula qualquer pessoa que não pediu para entrar.
create or replace function public.guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- servidor
  if new.user_id <> old.user_id or new.cell_id <> old.cell_id then
    raise exception 'Não é possível trocar a pessoa ou a célula' using errcode = '42501';
  end if;
  if not public.is_cell_leader(old.cell_id) then
    if new.role <> old.role or new.status <> old.status then
      raise exception 'Só o líder muda papel ou aprova entrada';
    end if;
  end if;
  return new;
end $$;
