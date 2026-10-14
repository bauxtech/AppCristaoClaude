-- Curso pela foto ou PDF: até 2 cursos lidos por mês (só conta leitura que deu certo).
-- O limite de tentativas por dia (course_photo_per_day) continua, para barrar arquivo mandado sem parar.
insert into public.app_settings (key, value) values ('course_read_per_month', '2') on conflict (key) do nothing;
alter table public.usage_counters drop constraint if exists usage_counters_kind_check;
alter table public.usage_counters add constraint usage_counters_kind_check check (kind in ('chat_day', 'sermon_month', 'sermon_period', 'cnpj_day', 'course_photo_day', 'course_read_month'));

create or replace function public.limit_info(p_user uuid, p_kind text)
returns table (feature text, counter text, period text, lim int, resets_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_plan text := public.plan_of(p_user); c public.plan_config; s public.subscriptions; v_day date; v_start timestamptz; v_anchor timestamptz; v_months int;
begin
  select * into c from public.plan_config where plan = v_plan;
  select * into s from public.subscriptions where user_id = p_user;
  if p_kind = 'chat' then
    v_day := (now() at time zone 'America/Sao_Paulo')::date;
    return query select 'chat'::text, 'chat_day'::text, v_day::text, coalesce(c.chat_per_day, 0), ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo');
  elsif p_kind = 'sermon' then
    if v_plan = 'trial' then
      v_start := s.trial_start;
      return query select 'sermon'::text, 'sermon_period'::text, 't' || to_char(v_start at time zone 'UTC', 'YYYYMMDDHH24MISS'), coalesce(c.sermons_per_period, 0), public.trial_end(s.trial_start);
    else
      -- Ciclos de um mês contados do dia da compra, também no anual (4 por mês, não 4 por ano).
      -- Sem início informado pela loja: mês do calendário.
      v_anchor := coalesce(s.period_start, date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
      v_months := greatest(0, (extract(year from age(now(), v_anchor)) * 12 + extract(month from age(now(), v_anchor)))::int);
      v_start := v_anchor + make_interval(months => v_months);
      return query select 'sermon'::text, 'sermon_period'::text, 'p' || to_char(v_start at time zone 'UTC', 'YYYYMMDDHH24MISS'), coalesce(c.sermons_per_period, 0),
        v_anchor + make_interval(months => v_months + 1);
    end if;
  elsif p_kind = 'course_photo' then
    -- Curso pela foto: leituras por dia (Brasília), número em app_settings.course_photo_per_day.
    v_day := (now() at time zone 'America/Sao_Paulo')::date;
    return query select 'course_photo'::text, 'course_photo_day'::text, v_day::text, public.setting_int('course_photo_per_day', 5), ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo');
  elsif p_kind = 'course_read' then
    -- Cursos lidos por foto ou PDF no mês (calendário de Brasília). Número em app_settings.course_read_per_month.
    v_day := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
    return query select 'course_photo'::text, 'course_read_month'::text, to_char(v_day, 'YYYY-MM'), public.setting_int('course_read_per_month', 2),
      ((v_day + interval '1 month')::timestamp at time zone 'America/Sao_Paulo');
  else
    raise exception 'Limite desconhecido';
  end if;
end $$;

revoke all on function public.limit_info(uuid, text) from public, anon, authenticated;
grant execute on function public.limit_info(uuid, text) to service_role;
