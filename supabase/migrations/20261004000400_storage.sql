-- Arquivos. Todos os baldes são privados; o caminho começa pelo id do dono ou da célula.
--   avatars/<user_id>/...        foto de perfil: o dono escreve; quem divide célula lê
--   sermon-audio/<user_id>/...   áudio do culto: só o dono (apagado em 30 dias)
--   prayer-videos/<user_id>/...  pedido em Libras: só o dono
--   cell-files/<cell_id>/...     capa e materiais: membros leem, o líder escreve

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', false),
  ('sermon-audio', 'sermon-audio', false),
  ('prayer-videos', 'prayer-videos', false),
  ('cell-files', 'cell-files', false)
on conflict (id) do nothing;

create or replace function public.path_uuid(p_name text) returns uuid
language plpgsql immutable as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end $$;

create policy own_files_all on storage.objects for all to authenticated
  using (bucket_id in ('avatars', 'sermon-audio', 'prayer-videos') and public.path_uuid(name) = auth.uid())
  with check (bucket_id in ('avatars', 'sermon-audio', 'prayer-videos') and public.path_uuid(name) = auth.uid());

create policy avatars_cellmates_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.shares_cell(public.path_uuid(name))
    and exists (select 1 from public.profiles p where p.id = public.path_uuid(name) and p.show_photo));

create policy cell_files_read on storage.objects for select to authenticated
  using (bucket_id = 'cell-files' and public.is_cell_member(public.path_uuid(name)));

create policy cell_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'cell-files' and public.is_cell_leader(public.path_uuid(name)));

create policy cell_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cell-files' and public.is_cell_leader(public.path_uuid(name)));
