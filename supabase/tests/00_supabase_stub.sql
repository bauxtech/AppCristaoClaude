-- Só para testar aqui fora do Supabase. Imita o mínimo do Supabase:
-- papéis anon, authenticated e service_role, auth.users, auth.uid() e o storage.
-- No Supabase de verdade este arquivo NÃO é aplicado.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text,
  phone_confirmed_at timestamptz,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
-- Como no Supabase: apagar linha de storage.objects direto é proibido (só pela API do Storage).
create or replace function storage.protect_delete() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), '') <> 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead' using errcode = '42501';
  end if;
  return null;
end $$;
create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- O Supabase dá todos os privilégios nas tabelas novas de public para anon e authenticated.
-- As migrações precisam tirar o que não deve existir.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
