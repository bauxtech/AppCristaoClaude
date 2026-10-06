-- Traduções da Bíblia com origem e licença registradas. O app é comercial: cada texto precisa
-- dizer de onde veio e sob qual licença. A v1 usa a Bíblia Livre (Creative Commons Atribuição),
-- que não é domínio público e exige crédito. Mesmo registro em src/features/bible/translations.ts.

create table public.bible_translations (
  id text primary key,
  name text not null,
  short_name text not null,
  language text not null,
  license text not null check (license in ('public-domain', 'cc-by-3.0-br', 'licensed')),
  license_name text not null,
  license_url text,
  attribution text not null,
  source text not null
);

insert into public.bible_translations (id, name, short_name, language, license, license_name, license_url, attribution, source) values (
  'biblia-livre', 'Bíblia Livre', 'BLIVRE', 'pt-BR', 'cc-by-3.0-br', 'Creative Commons Atribuição 3.0 Brasil',
  'https://creativecommons.org/licenses/by/3.0/br/',
  'Bíblia Livre. Atualização da tradução de João Ferreira de Almeida (1819). Diego Santos, Mario Sérgio e Marco Teles.',
  'Arquivo PorBLivre do repositório scrollmapper/bible_databases (github.com/scrollmapper/bible_databases).'
);

alter table public.bible_translations enable row level security;
create policy bible_translations_read on public.bible_translations for select to authenticated using (true);
revoke all on public.bible_translations from anon;
revoke insert, update, delete, truncate, references, trigger on public.bible_translations from authenticated;
grant select on public.bible_translations to authenticated;
grant all on public.bible_translations to service_role;

-- O texto passa a apontar para uma tradução registrada. O banco estava vazio de versículos.
delete from public.bible_verses where translation = 'almeida';
alter table public.bible_verses alter column translation set default 'biblia-livre';
alter table public.bible_verses add constraint bible_verses_translation_fk foreign key (translation) references public.bible_translations (id);

-- Buscas do chat: só no texto da tradução do app.
create or replace function public.search_verses(p_query text, p_limit int default 12)
returns table (verse_key text, text text, rank real)
language sql stable security definer set search_path = public as $$
  select v.book || ':' || v.chapter || ':' || v.verse, v.text,
    ts_rank(v.search, websearch_to_tsquery('portuguese', p_query))
  from public.bible_verses v
  where v.translation = 'biblia-livre' and v.search @@ websearch_to_tsquery('portuguese', p_query)
  order by 3 desc, v.book, v.chapter, v.verse
  limit least(greatest(p_limit, 1), 30)
$$;

create or replace function public.verses_by_keys(p_keys text[])
returns table (verse_key text, text text)
language sql stable security definer set search_path = public as $$
  select v.book || ':' || v.chapter || ':' || v.verse, v.text
  from public.bible_verses v
  where v.translation = 'biblia-livre' and (v.book || ':' || v.chapter || ':' || v.verse) = any (p_keys)
$$;

revoke all on function public.search_verses, public.verses_by_keys from public, anon;
grant execute on function public.search_verses, public.verses_by_keys to authenticated, service_role;
