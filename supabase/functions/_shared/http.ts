// Ajudantes das Edge Functions (Deno): resposta JSON, CORS e quem está chamando.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/** Cliente com poder de servidor (ignora RLS). Usar só depois de conferir quem chamou. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

/** Cliente como a pessoa que chamou: as regras de acesso do banco valem. */
export function asUser(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

/** Confere o login. Devolve o id da pessoa ou nulo. */
export async function userId(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  return error || !data.user ? null : data.user.id
}

/** Dia e mês no horário de Brasília, para os limites do plano. */
export function brDay(now = new Date()) {
  return new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10)
}
export function brMonth(now = new Date()) {
  return brDay(now).slice(0, 7)
}
