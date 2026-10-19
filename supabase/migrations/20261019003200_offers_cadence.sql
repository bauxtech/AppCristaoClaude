-- 19/10: régua de assinatura.
-- 1. Ofertas e novidades do acasa: duas autorizações separadas, no celular e por e-mail, com a data do aceite.
--    Sem autorização, nenhuma oferta sai (regra da Apple para notificação de propaganda e LGPD para e-mail).
-- 2. Régua depois do teste, para quem ficou sem plano: dias 10, 17, 24, 31, 60 e 90, contados do início do teste.
--    No máximo um contato por semana. Para quando a pessoa assina, retira a autorização ou passa do dia 97.
-- 3. De onde a pessoa chegou à tela de planos e de onde veio a compra, para medir o que funciona.

-- ─── 1. Autorizações ────────────────────────────────────────────────────────

alter table public.profiles
  add column offers_push boolean not null default false,
  add column offers_push_at timestamptz,
  add column offers_email boolean not null default false,
  add column offers_email_at timestamptz,
  -- Código do link "não quero mais receber" do e-mail. Não dá acesso a nada além de desligar as ofertas por e-mail.
  add column offers_token uuid not null default gen_random_uuid();
create unique index profiles_offers_token on public.profiles (offers_token);

-- A data do aceite é a do servidor. Sem e-mail, não há oferta por e-mail.
create or replace function public.guard_offers() returns trigger
language plpgsql as $$
begin
  if new.email is null then new.offers_email := false; end if;
  if new.offers_push and (tg_op = 'INSERT' or not old.offers_push) then new.offers_push_at := now(); end if;
  if not new.offers_push then new.offers_push_at := null; end if;
  if new.offers_email and (tg_op = 'INSERT' or not old.offers_email) then new.offers_email_at := now(); end if;
  if not new.offers_email then new.offers_email_at := null; end if;
  -- O código do descadastro não muda pelo app.
  if tg_op = 'UPDATE' and current_user in ('authenticated', 'anon') then new.offers_token := old.offers_token; end if;
  return new;
end $$;
create trigger guard_offers before insert or update on public.profiles for each row execute function public.guard_offers();

-- Link do e-mail: desliga as ofertas por e-mail de quem tem o código. Chamado pela função descadastrar.
create or replace function public.unsubscribe_offers(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set offers_email = false where offers_token = p_token and offers_email;
  return found;
end $$;
revoke all on function public.unsubscribe_offers from public, anon, authenticated;
grant execute on function public.unsubscribe_offers to service_role;

-- ─── 2. Régua ───────────────────────────────────────────────────────────────

-- O que já foi enviado. channel 'none' marca um passo pulado (sem autorização para aquele canal ou sem uso).
create table public.offer_sends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  step smallint not null,
  channel text not null check (channel in ('push', 'email', 'none')),
  sent_at timestamptz not null default now(),
  primary key (user_id, step, channel)
);
alter table public.offer_sends enable row level security;
revoke all on public.offer_sends from anon, authenticated;

-- E-mails esperando envio. A função send-email envia e confere de novo a autorização na hora.
create table public.email_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  step smallint,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts smallint not null default 0,
  last_error text
);
create index email_outbox_pending on public.email_outbox (created_at) where sent_at is null;
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;

-- Texto dos planos no e-mail. Sem preço: os valores ainda não foram confirmados na App Store.
create or replace function public.offer_plans_text() returns text
language sql immutable as $$
  select E'Essencial: planos de leitura, oração guiada, diário, pedidos, campanhas, igreja, ministérios, cursos, música e chat com 5 perguntas por dia.\n'
      || E'Completo: tudo do Essencial, chat com 10 perguntas por dia, gravar e transcrever 4 cultos por período e curso pela foto do cronograma.\n'
      || E'Líder: tudo do Completo, 8 cultos por período e criar e conduzir célula.\n'
      || E'O plano anual sai mais barato por mês do que o mensal.'
$$;

create or replace function public.offer_cadence(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record; v_day int; v_last timestamptz; v_step int; v_n int := 0;
  v_saturday boolean := extract(dow from (p_now at time zone 'America/Sao_Paulo')) = 6;
  v_reads int; v_sermons int; v_chat boolean; v_created boolean;
  v_title text; v_body text; v_href text; v_subject text; v_mail text; v_push boolean; v_email boolean;
begin
  for r in
    select p.id, p.offers_push, p.offers_email, p.email, s.trial_start
    from public.profiles p join public.subscriptions s on s.user_id = p.id
    where (p.offers_push or p.offers_email) and p.deletion_requested_at is null
      and s.trial_start is not null
      -- Quem já assinou pela loja e cancelou não entra nesta régua.
      and s.plan is null
      and public.plan_of(p.id) = 'free'
  loop
    v_day := (p_now at time zone 'America/Sao_Paulo')::date - (r.trial_start at time zone 'America/Sao_Paulo')::date + 1;
    continue when v_day < 10 or v_day > 97;
    -- No máximo um contato por semana (o passo pulado não conta).
    select max(sent_at) into v_last from public.offer_sends where user_id = r.id and channel <> 'none';
    continue when v_last is not null and v_last > p_now - interval '6 days 12 hours';
    -- O primeiro passo vencido e ainda não feito. Cada passo vale por 7 dias depois do dia dele.
    select st into v_step from (values (10), (17), (24), (31), (60), (90)) v(st)
    where st <= v_day and v_day <= st + 7 and not exists (select 1 from public.offer_sends o where o.user_id = r.id and o.step = st)
    order by st limit 1;
    continue when v_step is null;

    select count(*) into v_reads from public.bible_reads where user_id = r.id;
    select count(*) into v_sermons from public.sermons where user_id = r.id and status = 'ready';
    v_chat := exists (select 1 from public.usage_counters where user_id = r.id and kind = 'chat_day' and count > 0);
    v_title := null; v_subject := null; v_href := '/assinatura?origem=regua-' || v_step;

    if v_step = 10 then
      v_created := exists (select 1 from public.prayer_requests where user_id = r.id)
        or exists (select 1 from public.prayer_diary where user_id = r.id)
        or exists (select 1 from public.reading_plans where user_id = r.id)
        or exists (select 1 from public.notes where user_id = r.id);
      if v_created then
        v_title := 'O que você criou continua guardado';
        v_body := 'Assine um plano para voltar a usar tudo. A Bíblia continua grátis.';
      else
        v_title := 'A Bíblia continua grátis no acasa';
        v_body := 'Para oração guiada, diário, chat e culto, escolha um plano.';
      end if;
    elsif v_step = 17 then
      v_subject := 'O seu teste no acasa';
      v_mail := format(E'Durante o teste, você leu %s %s e transcreveu %s %s.\n\n',
          v_reads, case when v_reads = 1 then 'capítulo' else 'capítulos' end,
          v_sermons, case when v_sermons = 1 then 'culto' else 'cultos' end)
        || E'A Bíblia continua grátis no app. O que você criou no teste continua guardado. Para voltar a usar o resto, escolha um plano:\n\n'
        || public.offer_plans_text()
        || E'\n\nPara assinar, abra o acasa e toque em Eu > Meu plano.';
    elsif v_step = 24 then
      -- Só para quem gravou culto no teste, e no sábado (véspera do culto).
      if v_sermons = 0 then
        insert into public.offer_sends (user_id, step, channel, sent_at) values (r.id, v_step, 'none', p_now);
        continue;
      end if;
      continue when not v_saturday;
      v_title := 'Amanhã tem culto?';
      v_body := 'Grave e receba o resumo com o plano Completo.';
      v_href := '/assinatura?plano=completo&origem=regua-24';
    elsif v_step = 31 then
      v_title := 'Plano anual do acasa';
      v_body := 'No anual, o mês sai mais barato. Veja os planos.';
      v_subject := 'Plano anual do acasa';
      v_mail := E'No plano anual, o mês sai mais barato do que no mensal. Os limites são os mesmos.\n\n'
        || public.offer_plans_text()
        || E'\n\nPara assinar, abra o acasa e toque em Eu > Meu plano.';
    else
      -- Dias 60 e 90: lembrar do que a pessoa usou no teste.
      if v_sermons > 0 then
        v_title := 'Grave o culto com o acasa';
        v_body := 'Transcrição e resumo do culto estão no plano Completo.';
        v_href := '/assinatura?plano=completo&origem=regua-' || v_step;
      elsif v_chat then
        v_title := 'Pergunte sobre a Bíblia no chat';
        v_body := 'O chat responde com o texto bíblico e mostra a fonte. Está nos planos do acasa.';
      else
        v_title := 'Ore com o acasa';
        v_body := 'Oração guiada, diário e pedidos estão nos planos. A Bíblia continua grátis.';
      end if;
    end if;

    v_push := v_title is not null and r.offers_push;
    v_email := v_subject is not null and r.offers_email and r.email is not null;
    if v_push then
      perform public.notify(r.id, null, 'system', v_title, v_body, v_href, null);
      insert into public.offer_sends (user_id, step, channel, sent_at) values (r.id, v_step, 'push', p_now);
    end if;
    if v_email then
      insert into public.email_outbox (user_id, step, subject, body) values (r.id, v_step, v_subject, v_mail);
      insert into public.offer_sends (user_id, step, channel, sent_at) values (r.id, v_step, 'email', p_now);
    end if;
    if v_push or v_email then
      v_n := v_n + 1;
    else
      insert into public.offer_sends (user_id, step, channel, sent_at) values (r.id, v_step, 'none', p_now);
    end if;
  end loop;

  -- Limpeza: e-mails enviados há mais de 30 dias e registros da tela de planos com mais de 12 meses.
  delete from public.email_outbox where sent_at < p_now - interval '30 days';
  delete from public.paywall_events where at < p_now - interval '12 months';
  return v_n;
end $$;

-- ─── 3. Origem ──────────────────────────────────────────────────────────────

create table public.paywall_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('view', 'purchase')),
  source text not null check (char_length(source) <= 40),
  feature text check (char_length(feature) <= 40),
  at timestamptz not null default now()
);
create index paywall_events_user on public.paywall_events (user_id, at desc);
alter table public.paywall_events enable row level security;
revoke all on public.paywall_events from anon, authenticated;

-- O app registra quando a tela de planos abre (e de onde) e quando a compra dá certo. Até 100 por dia por pessoa.
create or replace function public.log_paywall(p_kind text, p_source text, p_feature text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if (select count(*) from public.paywall_events where user_id = auth.uid() and at > now() - interval '1 day') >= 100 then return; end if;
  insert into public.paywall_events (user_id, kind, source, feature)
  values (auth.uid(), p_kind, left(coalesce(nullif(p_source, ''), 'outro'), 40), left(p_feature, 40));
end $$;
revoke all on function public.log_paywall from public, anon;
grant execute on function public.log_paywall to authenticated;

revoke all on function public.offer_cadence(timestamptz), public.offer_plans_text() from public, anon, authenticated;
grant execute on function public.offer_cadence(timestamptz) to service_role;
