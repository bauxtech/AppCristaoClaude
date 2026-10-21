-- Busca da igreja pelo nome e pela cidade (21/10). Quase ninguém sabe o CNPJ da igreja.
-- church_directory guarda as organizações religiosas ativas dos dados abertos do CNPJ (Receita Federal),
-- carregadas por scripts/igrejas_receita.py. Sem telefone, e-mail nem sócios. Ninguém lê a tabela direto:
-- a busca passa por search_churches, e a igreja escolhida vira linha de churches por church_from_directory.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Texto para busca: minúsculo e sem acento ("São João" vira "sao joao").
create or replace function public.search_norm(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

create table if not exists public.church_directory (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  name text not null,
  legal_name text,
  address text,
  neighborhood text,
  city text,
  busca text generated always as (public.search_norm(name || ' ' || coalesce(legal_name, '') || ' ' || coalesce(neighborhood, '') || ' ' || coalesce(city, ''))) stored
);
create index if not exists church_directory_busca on public.church_directory using gin (busca extensions.gin_trgm_ops);
alter table public.church_directory enable row level security;
revoke all on public.church_directory from anon, authenticated;

-- Palavras da busca: sem acento, sem as curtas, e com as siglas mais usadas por extenso.
create or replace function public.church_search_words(p_q text) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct w), '{}')
  from regexp_split_to_table(
    regexp_replace(regexp_replace(public.search_norm(left(p_q, 80)), '\mpib\M', 'primeira igreja batista', 'g'), '\mibc\M', 'igreja batista', 'g'),
    '[^a-z0-9]+') w
  where length(w) >= 2 and w not in ('de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no')
$$;

-- Igrejas do app e da lista da Receita em que aparecem todas as palavras (nome, bairro ou cidade).
-- Na lista da Receita, a igreja que já está no app aparece só uma vez, com o id dela.
create or replace function public.search_churches(p_q text)
returns table (id uuid, cnpj text, name text, address text, neighborhood text, city text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  words text[] := public.church_search_words(p_q);
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
       order by similarity(d.busca, %L) desc, d.name limit 30)',
    cond_app, cond_dir, array_to_string(words, ' '));
end $$;
revoke all on function public.search_churches(text) from public, anon;
grant execute on function public.search_churches(text) to authenticated;

-- A pessoa escolheu uma igreja da lista da Receita: ela entra em churches (sem dono) e devolve o id.
-- Se alguém tinha cadastrado à mão com esse CNPJ, os dados da Receita tomam o lugar, como na busca pelo CNPJ.
create or replace function public.church_from_directory(p_cnpj text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d church_directory;
  v uuid;
begin
  if auth.uid() is null then raise exception 'Sem permissão'; end if;
  select * into d from church_directory where cnpj = p_cnpj;
  if d.cnpj is null then raise exception 'Igreja não encontrada'; end if;
  insert into churches (cnpj, name, address, neighborhood, city, created_by)
  values (d.cnpj, d.name, d.address, d.neighborhood, d.city, null)
  on conflict (cnpj) do update set name = excluded.name, address = excluded.address, neighborhood = excluded.neighborhood, city = excluded.city, created_by = null
  returning churches.id into v;
  return v;
end $$;
revoke all on function public.church_from_directory(text) from public, anon;
grant execute on function public.church_from_directory(text) to authenticated;
revoke all on function public.church_search_words(text) from public, anon;
