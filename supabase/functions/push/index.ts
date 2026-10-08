// Rotina a cada minuto: envia para o celular os avisos que o banco criou e ainda não foram enviados.
// Só roda com o segredo CRON_SECRET. O aviso continua na lista do app mesmo quando não vai para o celular.
import { validWebhookAuth } from '../_shared/revenuecat.ts'
import { admin, json } from '../_shared/http.ts'
import { chunks, decide, type ExpoMessage, type NotifyPrefs } from '../_shared/push.ts'

Deno.serve(async (req) => {
  if (!validWebhookAuth(req.headers.get('Authorization'), Deno.env.get('CRON_SECRET'))) return json({ error: 'Sem permissão' }, 401)
  const db = admin()
  const since = new Date(Date.now() - 86400_000).toISOString()
  const { data: pending, error } = await db
    .from('notifications')
    .select('id, user_id, title, body, href, pref')
    .is('pushed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(300)
  if (error) return json({ error: error.message }, 500)
  if (!pending?.length) return json({ sent: 0 })

  const users = [...new Set(pending.map((n) => n.user_id))]
  const [{ data: profiles }, { data: tokens }] = await Promise.all([
    db.from('profiles').select('id, notify_prefs').in('id', users),
    db.from('push_tokens').select('user_id, token').in('user_id', users),
  ])
  const prefsOf = new Map((profiles ?? []).map((p) => [p.id, p.notify_prefs as NotifyPrefs]))
  const tokensOf = new Map<string, string[]>()
  for (const t of tokens ?? []) tokensOf.set(t.user_id, [...(tokensOf.get(t.user_id) ?? []), t.token])

  const messages: ExpoMessage[] = []
  const done: string[] = []
  for (const n of pending) {
    const d = decide(prefsOf.get(n.user_id) ?? null, n.pref)
    if (d === 'later') continue
    done.push(n.id)
    if (d === 'skip') continue
    for (const to of tokensOf.get(n.user_id) ?? []) messages.push({ to, title: n.title, body: n.body, data: { href: n.href, id: n.id }, sound: 'default' })
  }

  // Marca antes de enviar: se a rotina rodar de novo no meio, ninguém recebe duas vezes.
  if (done.length) await db.from('notifications').update({ pushed_at: new Date().toISOString() }).in('id', done)

  let sent = 0
  const gone: string[] = []
  for (const batch of chunks(messages)) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => null)
    if (!res?.ok) continue
    const tickets = ((await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] }).data ?? []
    tickets.forEach((t, i) => {
      if (t.status === 'ok') sent++
      // Aparelho que desinstalou o app ou trocou de token: sai da lista.
      else if (t.details?.error === 'DeviceNotRegistered') gone.push(batch[i].to)
    })
  }
  if (gone.length) await db.from('push_tokens').delete().in('token', gone)
  return json({ sent, marked: done.length, removed: gone.length })
})
