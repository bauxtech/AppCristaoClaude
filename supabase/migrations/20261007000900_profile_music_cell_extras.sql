-- Perfil, música e o que faltava da célula: músicas favoritas, playlist e enquetes da célula.

-- Músicas favoritas da pessoa.
create table public.favorite_songs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist text not null default '' check (char_length(artist) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, title, artist)
);
alter table public.favorite_songs enable row level security;
alter table public.favorite_songs force row level security;
create policy owner_all on public.favorite_songs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Playlist da célula: membros aprovados leem, o líder escreve.
create table public.cell_playlist (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist text not null default '' check (char_length(artist) <= 120),
  url text check (url is null or url ~* '^https://'),
  created_at timestamptz not null default now()
);
alter table public.cell_playlist enable row level security;
alter table public.cell_playlist force row level security;
create policy playlist_read on public.cell_playlist for select to authenticated using (public.is_cell_member(cell_id));
create policy playlist_write on public.cell_playlist for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));

-- Enquetes da célula: o líder cria; quem participa (não visitante) vota uma vez. O voto é secreto: a célula vê só a contagem.
create table public.cell_polls (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  options text[] not null check (array_length(options, 1) between 2 and 6),
  created_at timestamptz not null default now()
);
alter table public.cell_polls enable row level security;
alter table public.cell_polls force row level security;
create policy polls_read on public.cell_polls for select to authenticated using (public.is_cell_member(cell_id));
create policy polls_write on public.cell_polls for all to authenticated using (public.is_cell_leader(cell_id)) with check (public.is_cell_leader(cell_id));

create table public.cell_poll_votes (
  poll_id uuid not null references public.cell_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option integer not null check (option >= 0),
  primary key (poll_id, user_id)
);
alter table public.cell_poll_votes enable row level security;
alter table public.cell_poll_votes force row level security;
-- Cada um vê e muda só o próprio voto.
create policy votes_self on public.cell_poll_votes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.cell_polls p where p.id = poll_id and public.my_cell_role(p.cell_id) is not null and public.my_cell_role(p.cell_id) <> 'visitante'
      and option < array_length(p.options, 1)));

-- Contagem dos votos por opção, sem dizer quem votou.
create or replace function public.cell_poll_counts(p_cell uuid)
returns table (poll_id uuid, option integer, votes integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cell_member(p_cell) then raise exception 'Sem permissão'; end if;
  return query
  select v.poll_id, v.option, count(*)::int
  from public.cell_poll_votes v join public.cell_polls p on p.id = v.poll_id
  where p.cell_id = p_cell
  group by v.poll_id, v.option;
end $$;

do $$
declare t text;
begin
  foreach t in array array['favorite_songs', 'cell_playlist', 'cell_polls', 'cell_poll_votes'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

revoke all on function public.cell_poll_counts from public, anon;
grant execute on function public.cell_poll_counts to authenticated;

-- Capa e materiais da célula: o líder também troca arquivo que já existe (upsert no Storage).
create policy cell_files_update on storage.objects for update to authenticated
  using (bucket_id = 'cell-files' and public.is_cell_leader(public.path_uuid(name)))
  with check (bucket_id = 'cell-files' and public.is_cell_leader(public.path_uuid(name)));
