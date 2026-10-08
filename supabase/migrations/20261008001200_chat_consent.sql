-- Histórico do chat é dado de fé (LGPD). Só fica guardado com o consentimento de fé,
-- e retirar o consentimento apaga as conversas do servidor, junto com diário, pedidos e tradição.

create policy faith_consent_chat_conv_insert on public.chat_conversations as restrictive for insert to authenticated with check (public.has_faith_consent());
create policy faith_consent_chat_conv_update on public.chat_conversations as restrictive for update to authenticated using (true) with check (public.has_faith_consent());
create policy faith_consent_chat_msg_insert on public.chat_messages as restrictive for insert to authenticated with check (public.has_faith_consent());

create or replace function public.withdraw_faith_consent()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Precisa entrar na conta'; end if;
  update public.profiles set faith_consent = false, faith_consent_at = null, tradition = null where id = auth.uid();
  -- Pedidos apagados levam junto quem orou (cascade) e saem da célula. Conversas levam as mensagens.
  delete from public.prayer_requests where user_id = auth.uid();
  delete from public.prayer_diary where user_id = auth.uid();
  delete from public.chat_conversations where user_id = auth.uid();
end $$;
revoke all on function public.withdraw_faith_consent from public, anon;
grant execute on function public.withdraw_faith_consent to authenticated;
