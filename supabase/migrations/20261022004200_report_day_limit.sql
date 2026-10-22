-- Reportar um problema: o contador de relatos por dia (report_day) precisa ser aceito pelo banco.
-- Sem ele, consume_usage dava erro e o limite de 5 por dia não valia (achado da sessão do Supabase, 22/10).
alter table public.usage_counters drop constraint if exists usage_counters_kind_check;
alter table public.usage_counters add constraint usage_counters_kind_check
  check (kind in ('chat_day', 'sermon_month', 'sermon_period', 'cnpj_day', 'course_photo_day', 'course_read_month', 'report_day'));
