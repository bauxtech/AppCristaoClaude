-- Limite de buscas por CNPJ na Receita: 30 por dia por pessoa, para ninguém usar o app como consulta de CNPJ em massa.
alter table public.usage_counters drop constraint if exists usage_counters_kind_check;
alter table public.usage_counters add constraint usage_counters_kind_check check (kind in ('chat_day', 'sermon_month', 'cnpj_day'));
