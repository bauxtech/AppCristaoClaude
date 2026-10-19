-- 19/10, decisão do Thiago: a página da célula é um cartão de visita.
-- Mostra só nome, tipo, uma biografia, bairro, logo, capa e, se o líder quiser, dia e horário.
-- Nada interno: sem endereço, roteiro, materiais, pedidos de oração nem nome do líder.
-- O formulário "Quero participar" guarda nome e telefone para o líder e devolve o código de convite:
-- a pessoa entra na célula pelo app, com conta, e só lá vê o resto (depois da aprovação do líder).

alter table public.cells
  add column web_bio text check (char_length(web_bio) <= 300),
  add column web_show_schedule boolean not null default true;

drop function public.public_cell_page(text);
create function public.public_cell_page(p_code text)
returns table (name text, type text, bio text, weekday int, "time" text, neighborhood text, archived boolean, paused boolean, slug text, logo_path text, cover_path text)
language sql stable security definer set search_path = public as $$
  select c.name, c.type, nullif(trim(coalesce(c.web_bio, '')), ''),
    case when c.web_show_schedule then c.weekday end,
    case when c.web_show_schedule then c.time end,
    c.neighborhood,
    c.archived,
    not c.archived and not public.cell_active(c.id),
    c.web_slug,
    case when c.logo_hidden then null else c.logo_path end,
    case when c.web_cover_hidden then null else c.web_cover_path end
  from public.cells c
  where c.id = public.web_cell_id(p_code)
$$;
revoke all on function public.public_cell_page from public;
grant execute on function public.public_cell_page to anon, authenticated;

-- Prévia no app, para quem digitou ou escaneou o código de convite (já logado).
create or replace function public.invite_preview(p_code text)
returns table (name text, leader_first_name text, weekday int, "time" text, neighborhood text, archived boolean)
language sql stable security definer set search_path = public as $$
  select c.name,
    (select split_part(p.name, ' ', 1) from public.cell_members m join public.profiles p on p.id = m.user_id
      where m.cell_id = c.id and m.role = 'lider' and m.status = 'approved' limit 1),
    c.weekday, c.time, c.neighborhood, c.archived
  from public.cells c
  where c.invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;
revoke all on function public.invite_preview from public, anon;
grant execute on function public.invite_preview to authenticated;

-- "Quero participar": o líder recebe nome e telefone; a pessoa recebe o código para entrar pelo app.
drop function public.leave_contact(text, text, text);
create function public.leave_contact(p_code text, p_name text, p_phone text)
returns table (invite_code text)
language plpgsql security definer set search_path = public as $$
declare c public.cells; v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if char_length(trim(coalesce(p_name, ''))) = 0 or char_length(v_phone) < 10 or char_length(v_phone) > 13 then
    raise exception 'Nome e telefone são obrigatórios';
  end if;
  select * into c from public.cells where id = public.web_cell_id(p_code) and not archived;
  if c.id is null then raise exception 'Célula não encontrada'; end if;
  -- 5 contatos por telefone por dia e 5 por aparelho por dia.
  if (select count(*) from public.cell_leads where phone = v_phone and created_at > now() - interval '1 day') >= 5
      or not public.web_attempt_ok('contact', 5) then
    raise exception 'Muitas tentativas. Tente amanhã';
  end if;
  insert into public.cell_leads (cell_id, name, phone, source) values (c.id, left(trim(p_name), 80), v_phone, 'web');
  return query select c.invite_code;
end $$;
revoke all on function public.leave_contact from public;
grant execute on function public.leave_contact to anon, authenticated;

-- A página não recebe mais pedido de oração. Os pedidos já recebidos continuam para o líder.
revoke execute on function public.leave_web_prayer from anon, authenticated;
