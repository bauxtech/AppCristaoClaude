// Rotina diária (agendada no Supabase): escreve o conteúdo do dia seguinte.
// Só roda com o segredo CRON_SECRET. Nasce como rascunho até decidirem quem revisa (DAILY_AUTO_PUBLISH=true publica direto).
import { askJson } from '../_shared/claude.ts'
import { writeDaily } from '../_shared/daily.ts'
import { validWebhookAuth } from '../_shared/revenuecat.ts'
import { admin, brDay, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('CRON_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const db = admin()
  const tomorrow = brDay(new Date(Date.now() + 86400_000))
  const { data: existing } = await db.from('daily_content').select('day').eq('day', tomorrow).maybeSingle()
  if (existing) return json({ status: 'já existe', day: tomorrow })

  const content = await writeDaily(
    {
      verse: async (key) => {
        const { data } = await db.rpc('verses_by_keys', { p_keys: [key] })
        const v = (data ?? [])[0] as { verse_key: string; text: string } | undefined
        return v ? { key: v.verse_key, text: v.text } : null
      },
      askJson,
    },
    tomorrow,
  )
  const published = Deno.env.get('DAILY_AUTO_PUBLISH') === 'true'
  const { error } = await db.from('daily_content').insert({ ...content, published })
  if (error) return json({ error: error.message }, 500)
  return json({ status: published ? 'publicado' : 'rascunho', day: tomorrow })
})
