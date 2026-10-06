-- O Supabase dá todos os privilégios nas tabelas novas para anon e authenticated.
-- bible_verses foi criada depois do revoke da 200 e herdou esses privilégios.
-- TRUNCATE não passa pelo RLS, então ninguém além do servidor fica com ele.

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.bible_verses from authenticated;
