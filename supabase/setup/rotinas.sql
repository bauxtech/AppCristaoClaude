-- Rotinas diárias do servidor. Não é migração: roda uma vez no projeto do Supabase, depois do CRON_SECRET existir.
--
-- Antes de rodar:
-- 1. Gerar uma senha longa e aleatória, sem mostrar em lugar nenhum.
-- 2. Guardar essa senha em dois lugares, com o mesmo valor:
--    a. Edge Functions > Secrets, com o nome CRON_SECRET (as funções conferem a senha);
--    b. Vault do banco, com o nome cron_secret: select vault.create_secret('<senha>', 'cron_secret');
-- A senha nunca fica escrita neste arquivo nem no repositório: a rotina lê do Vault na hora de chamar.
--
-- Horários em UTC (São Paulo é UTC-3):
--   daily-content 06:07 UTC = 03:07 em São Paulo: escreve o conteúdo do dia seguinte.
--   purge         07:13 UTC = 04:13 em São Paulo: apaga contas marcadas há 30 dias e áudios de culto vencidos.
--   push          a cada minuto: envia para o celular os avisos novos (célula, "Orei por você").

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Chama uma função do servidor com a senha das rotinas.
create or replace function public.call_routine(p_function text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then raise exception 'cron_secret não está no Vault'; end if;
  return net.http_post(
    url := 'https://lrsusnlzfdydxidybzje.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.call_routine from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('conteudo-do-dia', 'limpeza-diaria', 'enviar-avisos');
select cron.schedule('conteudo-do-dia', '7 6 * * *', $$select public.call_routine('daily-content')$$);
select cron.schedule('limpeza-diaria', '13 7 * * *', $$select public.call_routine('purge')$$);
select cron.schedule('enviar-avisos', '* * * * *', $$select public.call_routine('push')$$);
