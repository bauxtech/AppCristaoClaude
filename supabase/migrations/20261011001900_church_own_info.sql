-- Horários de culto e acessibilidade: cada pessoa edita os da própria igreja, só para ela (decisão do Thiago, 11/10).
-- Ficam no vínculo da pessoa com a igreja (user_churches), que só o dono lê e grava (regra owner_all).
-- Igreja cadastrada à mão continua com os dados de quem cadastrou como padrão para os outros.

alter table public.user_churches add column if not exists services jsonb
  check (services is null or (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 30));
alter table public.user_churches add column if not exists accessibility jsonb
  check (accessibility is null or (jsonb_typeof(accessibility) = 'object' and pg_column_size(accessibility) <= 2000));
