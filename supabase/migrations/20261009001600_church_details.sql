-- Igreja: acessibilidade com "ninguém informou" (nulo), lugar reservado, cultos com intérprete e denominação.
-- Quem edita horários e acessibilidade continua como antes: só quem cadastrou a igreja à mão.
-- Igreja do CNPJ não tem quem edite no servidor até a decisão (CLAUDE.md, EM ABERTO).

alter table public.church_accessibility alter column libras drop not null, alter column libras drop default;
alter table public.church_accessibility alter column ramp drop not null, alter column ramp drop default;
alter table public.church_accessibility alter column audio_description drop not null, alter column audio_description drop default;
alter table public.church_accessibility add column if not exists reserved boolean;
alter table public.church_accessibility add column if not exists libras_services text check (char_length(libras_services) <= 200);

alter table public.churches add column if not exists denomination text check (char_length(denomination) <= 40);

-- Nome de igreja cadastrada à mão tem limite, como no app.
alter table public.churches add constraint churches_name_len check (char_length(name) between 1 and 120) not valid;
