// Rotina diária (agendada no Supabase): apaga contas marcadas há 30 dias e áudios de culto vencidos.
// Só roda com o segredo CRON_SECRET.
import { validWebhookAuth } from '../_shared/revenuecat.ts'
import { admin, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('CRON_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const db = admin()

  // 1. Arquivos de quem vai ser apagado (o banco apaga as linhas; os arquivos precisam sair do Storage).
  const { data: leaving } = await db.from('profiles').select('id').not('deletion_requested_at', 'is', null).lt('deletion_requested_at', new Date(Date.now() - 30 * 86400_000).toISOString())
  for (const p of leaving ?? []) {
    for (const bucket of ['avatars', 'sermon-audio', 'prayer-videos']) {
      const { data: files } = await db.storage.from(bucket).list(p.id, { limit: 1000 })
      if (files?.length) await db.storage.from(bucket).remove(files.map((f) => `${p.id}/${f.name}`))
    }
  }

  // 2. Áudios vencidos.
  const { data: expired } = await db.from('sermons').select('audio_path').not('audio_path', 'is', null).lt('audio_expires_at', new Date().toISOString())
  const paths = (expired ?? []).map((s) => s.audio_path as string)
  if (paths.length) await db.storage.from('sermon-audio').remove(paths)

  // 3. Linhas do banco.
  const { data, error } = await db.rpc('purge_expired')
  if (error) return json({ error: error.message }, 500)
  return json({ status: 'ok', result: data })
})
