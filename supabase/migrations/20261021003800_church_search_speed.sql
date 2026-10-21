-- Busca de igreja mais rápida com a lista completa da Receita (21/10, 209 mil igrejas).
-- Medido no Postgres local: "igreja" sozinha levava 1,9 s; agora fica abaixo de 20 ms.
-- Palavras que estão em quase todos os nomes saem da busca quando há outras, e a ordenação por parecença
-- olha no máximo 400 igrejas.

-- "Igreja" e "evangélica" estão em quase todos os nomes: com outras palavras na busca, saem dela (a busca fica rápida).
create or replace function public.church_search_terms(p_q text) returns text[]
language sql immutable set search_path = public as $$
  select case when cardinality(x.rest) > 0 then x.rest else x.all_words end
  from (select w as all_words, array(select v from unnest(w) v where v not in ('igreja', 'evangelica', 'evangelico', 'ministerio')) as rest
        from (select public.church_search_words(p_q) as w) t) x
$$;

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
     (select x.id, x.cnpj, x.name, x.address, x.neighborhood, x.city from (
        select null::uuid as id, d.cnpj, d.name, d.address, d.neighborhood, d.city, d.busca from church_directory d
        where %s and not exists (select 1 from churches c where c.cnpj = d.cnpj) limit 400) x
       order by similarity(x.busca, %L) desc, x.name limit 30)',
    cond_app, cond_dir, array_to_string(words, ' '));
end $$;
revoke all on function public.search_churches(text) from public, anon;
grant execute on function public.search_churches(text) to authenticated;
revoke all on function public.church_search_terms(text) from public, anon;
revoke all on function public.search_norm(text) from public, anon;
grant execute on function public.search_norm(text) to authenticated;
