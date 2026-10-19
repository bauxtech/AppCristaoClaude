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
--   trial         13:03 UTC = 10:03 em São Paulo: avisos do teste grátis (dia 5 e dia 7). Roda direto no banco.
--   régua         13:11 UTC = 10:11 em São Paulo: ofertas depois do teste, só para quem autorizou. Roda direto no banco.
--   send-email    a cada hora, no minuto 23: envia os e-mails da régua (precisa de RESEND_API_KEY e EMAIL_FROM).

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

select cron.unschedule(jobname) from cron.job where jobname in ('conteudo-do-dia', 'limpeza-diaria', 'enviar-avisos', 'avisos-do-teste', 'promover-visitantes', 'liberar-enderecos', 'limpar-registros', 'regua-de-assinatura', 'enviar-emails');
select cron.schedule('conteudo-do-dia', '7 6 * * *', $$select public.call_routine('daily-content')$$);
select cron.schedule('limpeza-diaria', '13 7 * * *', $$select public.call_routine('purge')$$);
select cron.schedule('enviar-avisos', '* * * * *', $$select public.call_routine('push')$$);
select cron.schedule('avisos-do-teste', '3 13 * * *', $$select public.trial_reminders()$$);
-- Visitante com 3 reuniões ou 30 dias vira membro. 00h09 em Brasília.
select cron.schedule('promover-visitantes', '9 3 * * *', $$select public.promote_visitors()$$);
-- Endereço da página de célula parada há 90 dias fica livre; antigos com mais de 30 dias saem. 00h17 em Brasília.
select cron.schedule('liberar-enderecos', '17 3 * * *', $$select public.release_cell_slugs()$$);
-- Registros de acesso com mais de 6 meses; contatos da página da célula com mais de 12 meses ou de célula encerrada. 00h21 em Brasília.
select cron.schedule('limpar-registros', '21 3 * * *', $$select public.purge_logs_and_web_contacts()$$);
-- Régua de assinatura: ofertas dos dias 10, 17, 24, 31, 60 e 90 para quem autorizou. 10h11 em Brasília.
select cron.schedule('regua-de-assinatura', '11 13 * * *', $$select public.offer_cadence()$$);
-- E-mails da régua na fila. Sem RESEND_API_KEY, a função não envia nada e a fila espera.
select cron.schedule('enviar-emails', '23 * * * *', $$select public.call_routine('send-email')$$);
