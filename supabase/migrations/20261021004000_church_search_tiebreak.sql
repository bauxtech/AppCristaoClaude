-- Busca de igreja: igrejas igualmente parecidas saem sempre na mesma ordem (pelo nome), em toda chamada (21/10).

create or replace function public.search_churches(p_q text)
returns table (id uuid, cnpj text, name text, address text, neighborhood text, city text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  words text[] := public.church_search_terms(p_q);
  digits text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g');
  cond_app text;
  cond_dir text;
begin
  if auth.uid() is null then raise exception 'Sem permissão'; end if;
  if length(digits) = 14 then
    return query
      select c.id, c.cnpj, c.name, c.address, c.neighborhood, c.city from churches c where c.cnpj = digits
      union all
      select null::uuid, d.cnpj, d.name, d.address, d.neighborhood, d.city from church_directory d
      where d.cnpj = digits and not exists (select 1 from churches c where c.cnpj = digits);
    return;
  end if;
  if cardinality(words) = 0 then return; end if;
  select string_agg(format('public.search_norm(c.name || '' '' || coalesce(c.neighborhood, '''') || '' '' || coalesce(c.city, '''')) like %L', '%' || w || '%'), ' and '),
         string_agg(format('d.busca like %L', '%' || w || '%'), ' and ')
    into cond_app, cond_dir
  from unnest(words) w;
  return query execute format(
    '(select c.id, c.cnpj, c.name, c.address, c.neighborhood, c.city from churches c where %s order by c.name limit 20)
     union all
     (select null::uuid, d.cnpj, d.name, d.address, d.neighborhood, d.city from church_directory d
       where %s and not exists (select 1 from churches c where c.cnpj = d.cnpj)
       order by public.search_norm(d.name || '' '' || coalesce(d.city, '''')) operator(extensions.<->) %L, d.name, d.cnpj limit 30)',
    cond_app, cond_dir, array_to_string(words, ' '));
end $$;
revoke all on function public.search_churches(text) from public, anon;
grant execute on function public.search_churches(text) to authenticated;
