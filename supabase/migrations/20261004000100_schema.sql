-- App Cristão: tabelas.
-- As regras de acesso (RLS) ficam em 20261004000200_policies.sql.
-- Regra geral: dado pessoal é só do dono. Dado da célula é só de quem foi aprovado nela.

create extension if not exists pgcrypto;

-- ─── Tipos ───────────────────────────────────────────────────────────────────

create type public.cell_role as enum ('lider', 'auxiliar', 'anfitriao', 'membro', 'visitante');
create type public.member_status as enum ('pending', 'approved', 'rejected');
create type public.sub_status as enum ('trial', 'active', 'canceled_active', 'payment_failed', 'expired');
create type public.sermon_status as enum ('processing', 'ready', 'failed');

-- ─── Pessoa ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  phone text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  birthday date,
  photo_path text,
  tradition text,
  goal text,
  reminder_time text,
  show_photo boolean not null default true,
  show_birthday boolean not null default true,
  show_books boolean not null default false,
  -- LGPD art. 11: consentimento separado para dado de fé.
  faith_consent boolean not null default false,
  faith_consent_at timestamptz,
  terms_accepted_at timestamptz,
  adult_confirmed boolean not null default false,
  -- Preferências do app (avisos, aparência, gravação). Não guarda dado sensível.
  settings jsonb not null default '{}'::jsonb,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.sub_status not null default 'trial',
  trial_start timestamptz not null default now(),
  billing text check (billing in ('monthly', 'annual')),
  renews_at timestamptz,
  grace_until timestamptz,
  store text check (store in ('app_store', 'play_store')),
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('chat_day', 'sermon_month')),
  period text not null,
  count integer not null default 0,
  primary key (user_id, kind, period)
);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('cell', 'bible', 'prayer', 'church', 'system')),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Denúncias vão para a equipe do app. Quem denunciou não lê a fila.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('member', 'prayer', 'board', 'photo', 'material', 'other')),
  target_id text,
  reason text not null,
  detail text check (char_length(detail) <= 2000),
  created_at timestamptz not null default now()
);

-- O conteúdo denunciado some na hora para quem denunciou.
create table public.hidden_content (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id text not null,
  primary key (user_id, target_type, target_id)
);

-- ─── Bíblia, leitura e anotações (só do dono) ────────────────────────────────

create table public.bible_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  read_at timestamptz not null default now(),
  primary key (user_id, book, chapter)
);

create table public.bible_highlights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  verse_key text not null,
  color text not null,
  primary key (user_id, verse_key)
);

create table public.bible_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  verse_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, verse_key)
);

create table public.bible_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  verse_key text not null,
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, verse_key)
);

create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  books text[] not null,
  days integer not null check (days between 1 and 1500),
  created_at timestamptz not null default now()
);

create table public.plan_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null,
  started_at date not null,
  done_days integer[] not null default '{}',
  active boolean not null default true,
  primary key (user_id, plan_id)
);

-- Total de dias com leitura ou oração. Não existe sequência.
create table public.activity_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  reading_minutes integer not null default 0,
  prayer_minutes integer not null default 0,
  primary key (user_id, day)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  ref text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  date date not null,
  description text not null default ''
);

-- ─── Oração ──────────────────────────────────────────────────────────────────

-- Diário: dado sensível, sempre só do dono.
create table public.prayer_diary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prayer_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null,
  start_date date not null,
  end_date date not null,
  done_days integer[] not null default '{}'
);

-- ─── Igreja (diretório público) ──────────────────────────────────────────────

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique,
  name text not null,
  address text,
  neighborhood text,
  city text,
  -- Igreja cadastrada à mão por alguém (sem CNPJ).
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.church_services (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  time text not null,
  label text,
  created_by uuid references public.profiles (id) on delete set null
);

create table public.church_accessibility (
  church_id uuid primary key references public.churches (id) on delete cascade,
  libras boolean not null default false,
  ramp boolean not null default false,
  audio_description boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.user_churches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  is_main boolean not null default false,
  primary key (user_id, church_id)
);

-- Cursos e ministérios ficam com a pessoa (o app é dela, não da igreja).
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  church_id uuid references public.churches (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  church_id uuid references public.churches (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.saved_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  church_id uuid references public.churches (id) on delete set null,
  title text not null,
  date date not null,
  time text
);

-- ─── Célula ──────────────────────────────────────────────────────────────────

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  type text,
  weekday integer check (weekday between 0 and 6),
  time text,
  -- Endereço completo: só para membros aprovados (e para quem deixa nome e telefone na página web).
  address text,
  reference text,
  -- Bairro: o que a página pública mostra.
  neighborhood text,
  cover_path text,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cell_members (
  cell_id uuid not null references public.cells (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.cell_role not null default 'membro',
  status public.member_status not null default 'pending',
  muted boolean not null default false,
  requested_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (cell_id, user_id)
);

create index cell_members_user on public.cell_members (user_id);

-- Pedidos de oração. Ficam com o dono; quando compartilhados, a célula vê (menos o visitante).
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  text text not null check (char_length(text) <= 2000),
  video_path text,
  shared_cell_id uuid references public.cells (id) on delete set null,
  answered_at date,
  testimony text,
  created_at timestamptz not null default now()
);

create index prayer_requests_cell on public.prayer_requests (shared_cell_id) where shared_cell_id is not null;

create table public.prayer_prayed (
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table public.cell_meetings (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  date date not null,
  time text,
  extra boolean not null default false,
  script jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Presença: o líder e o auxiliar marcam. Cada membro vê só a própria.
create table public.cell_attendance (
  meeting_id uuid not null references public.cell_meetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  present boolean not null,
  marked_by uuid references public.profiles (id) on delete set null,
  primary key (meeting_id, user_id)
);

create table public.cell_schedule (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  meeting_date date,
  role_name text not null,
  member_id uuid references public.profiles (id) on delete set null
);

create table public.cell_swaps (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  schedule_id uuid not null references public.cell_schedule (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create table public.cell_board (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  text text not null check (char_length(text) <= 1000),
  created_at timestamptz not null default now()
);

create table public.cell_materials (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  name text not null,
  kind text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table public.cell_rides (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  origin text not null,
  seats integer not null check (seats between 1 and 8),
  created_at timestamptz not null default now()
);

create table public.ride_requests (
  ride_id uuid not null references public.cell_rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  primary key (ride_id, user_id)
);

-- Visitantes e contatos da página web: só o líder vê.
create table public.cell_leads (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 8 and 20),
  notes text,
  source text not null default 'web' check (source in ('web', 'manual')),
  follow_up_at date,
  created_at timestamptz not null default now()
);

create table public.cell_web_prayers (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  name text,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- ─── Culto e chat (só do dono) ───────────────────────────────────────────────

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  church text,
  preacher text,
  date date not null default current_date,
  duration_sec integer not null default 0,
  status public.sermon_status not null default 'processing',
  transcript text,
  summary jsonb,
  notes jsonb not null default '[]'::jsonb,
  -- Áudio só quando a pessoa escolhe guardar. Apagado em 30 dias.
  audio_path text,
  audio_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  context jsonb,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  verses jsonb,
  created_at timestamptz not null default now()
);

-- Conteúdo diário escrito pela IA. O versículo vem sempre do texto bíblico do app.
create table public.daily_content (
  day date primary key,
  verse_key text not null,
  reflection text not null,
  prayer text not null,
  reviewed_by text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Criação automática do perfil e do teste grátis ──────────────────────────

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
