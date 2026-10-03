-- Texto bíblico do app (tradução de domínio público), acesso pela assinatura e limites do plano.

-- ─── Texto bíblico ───────────────────────────────────────────────────────────
-- Carregado por script a partir de uma fonte de domínio público confirmada. Nunca gerado por IA.

create table public.bible_verses (
  book text not null,          -- slug do livro, como no app: 'salmos', '1-pedro'
  chapter integer not null,
  verse integer not null,
  text text not null,
  translation text not null default 'almeida',
  search tsvector generated always as (to_tsvector('portuguese', text)) stored,
  primary key (translation, book, chapter, verse)
);
create index bible_verses_search on public.bible_verses using gin (search);

alter table public.bible_verses enable row level security;
create policy bible_read on public.bible_verses for select to authenticated using (true);
grant select on public.bible_verses to authenticated;
grant all on public.bible_verses to service_role;

-- Busca de versículos para o chat: só devolve texto que está no banco.
create or replace function public.search_verses(p_query text, p_limit int default 12)
returns table (verse_key text, text text, rank real)
language sql stable security definer set search_path = public as $$
  select v.book || ':' || v.chapter || ':' || v.verse, v.text,
    ts_rank(v.search, websearch_to_tsquery('portuguese', p_query))
  from public.bible_verses v
  where v.translation = 'almeida' and v.search @@ websearch_to_tsquery('portuguese', p_query)
  order by 3 desc, v.book, v.chapter, v.verse
  limit least(greatest(p_limit, 1), 30)
$$;

-- Busca por chave, para conferir o que a IA citou.
create or replace function public.verses_by_keys(p_keys text[])
returns table (verse_key text, text text)
language sql stable security definer set search_path = public as $$
  select v.book || ':' || v.chapter || ':' || v.verse, v.text
  from public.bible_verses v
  where v.translation = 'almeida' and (v.book || ':' || v.chapter || ':' || v.verse) = any (p_keys)
$$;

revoke all on function public.search_verses, public.verses_by_keys from public, anon;
grant execute on function public.search_verses, public.verses_by_keys to authenticated, service_role;

-- ─── Acesso pela assinatura ──────────────────────────────────────────────────
-- 7 dias grátis controlados pelo app. Depois, só quem assina. Pagamento falhou: prazo para regularizar.

create or replace function public.has_access(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case s.status
      when 'trial' then s.trial_start > now() - interval '7 days'
      when 'active' then true
      when 'canceled_active' then s.renews_at is null or s.renews_at > now()
      when 'payment_failed' then s.grace_until is null or s.grace_until > now()
      else false
    end
    from public.subscriptions s where s.user_id = p_user
  ), false)
$$;

revoke all on function public.has_access(uuid) from public, anon, authenticated;
grant execute on function public.has_access(uuid) to service_role;

-- A pessoa pode perguntar só sobre ela mesma.
create or replace function public.my_access() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_access(auth.uid())
$$;
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- ─── Limites do plano ────────────────────────────────────────────────────────
-- 20 perguntas por dia no chat e 5 cultos por mês. Conta e confere no mesmo passo, sem corrida.

create or replace function public.consume_usage(p_user uuid, p_kind text, p_period text, p_limit int)
returns integer language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.usage_counters (user_id, kind, period, count) values (p_user, p_kind, p_period, 1)
  on conflict (user_id, kind, period) do update set count = usage_counters.count + 1
  where usage_counters.count < p_limit
  returning count into v;
  if v is null then return -1; end if; -- limite atingido
  return p_limit - v;                  -- quantos restam
end $$;

-- Devolve uma unidade quando a resposta falha (a pessoa não perde a pergunta).
create or replace function public.refund_usage(p_user uuid, p_kind text, p_period text)
returns void language sql security definer set search_path = public as $$
  update public.usage_counters set count = greatest(count - 1, 0) where user_id = p_user and kind = p_kind and period = p_period
$$;

revoke all on function public.consume_usage, public.refund_usage from public, anon, authenticated;
grant execute on function public.consume_usage, public.refund_usage to service_role;

-- O servidor grava cultos e mensagens do chat em nome da pessoa.
grant execute on function public.purge_expired() to service_role;
