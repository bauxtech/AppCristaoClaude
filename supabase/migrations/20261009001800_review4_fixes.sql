-- Correções da revisão 4.

-- Igreja à mão não pode ganhar CNPJ depois: o CNPJ só entra pelo servidor, com os dados da Receita.
drop policy if exists churches_update on public.churches;
create policy churches_update on public.churches for update to authenticated
  using (created_by = auth.uid() and cnpj is null) with check (created_by = auth.uid() and cnpj is null);

-- Horários e acessibilidade: só de igreja cadastrada à mão, por quem cadastrou.
drop policy if exists services_write on public.church_services;
create policy services_write on public.church_services for all to authenticated
  using (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid() and c.cnpj is null))
  with check (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid() and c.cnpj is null));
drop policy if exists access_write on public.church_accessibility;
create policy access_write on public.church_accessibility for all to authenticated
  using (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid() and c.cnpj is null))
  with check (exists (select 1 from public.churches c where c.id = church_id and c.created_by = auth.uid() and c.cnpj is null));
