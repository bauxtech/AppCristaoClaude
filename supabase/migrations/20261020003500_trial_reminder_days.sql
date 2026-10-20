-- Pente fino de 20/10: o aviso do dia 5 conta os dias como o app (dia 5, 6 e 7 = faltam 3 dias).
create or replace function public.trial_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; v_day int; v_n int := 0; v_body text; v_ch int; v_se int;
begin
  for r in
    select s.user_id, s.trial_start, s.trial_reminded
    from public.subscriptions s
    where s.trial_start is not null and s.trial_reminded < 7 and public.plan_of(s.user_id) = 'trial'
  loop
    v_day := (now() at time zone 'America/Sao_Paulo')::date - (r.trial_start at time zone 'America/Sao_Paulo')::date + 1;
    if v_day >= 7 and r.trial_reminded < 7 then
      perform public.notify(r.user_id, null, 'system', 'Seu teste termina hoje à meia-noite', 'Escolha um plano para continuar usando tudo. A Bíblia continua grátis.', '/assinatura', null);
      update public.subscriptions set trial_reminded = 7 where user_id = r.user_id;
      v_n := v_n + 1;
    elsif v_day >= 5 and r.trial_reminded < 5 then
      select count(*) into v_ch from public.bible_reads where user_id = r.user_id;
      select count(*) into v_se from public.sermons where user_id = r.user_id and status = 'ready';
      -- Orações e pedidos ficam fora do aviso: a notificação aparece na tela bloqueada e passa pelo serviço de avisos.
      v_body := format('Até agora: %s %s e %s %s transcrito%s.',
        v_ch, case when v_ch = 1 then 'capítulo lido' else 'capítulos lidos' end,
        v_se, case when v_se = 1 then 'culto' else 'cultos' end, case when v_se = 1 then '' else 's' end);
      perform public.notify(r.user_id, null, 'system', 'Faltam 3 dias do seu teste', v_body, '/assinatura', null);
      update public.subscriptions set trial_reminded = 5 where user_id = r.user_id;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;
