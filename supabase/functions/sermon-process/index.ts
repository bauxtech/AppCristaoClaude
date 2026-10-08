// POST /functions/v1/sermon-process  { sermonId, keepAudio }
// O app sobe o áudio em sermon-audio/<id da pessoa>/... e chama esta função.
// Confere login, assinatura e o limite de 5 cultos por mês. Responde na hora e processa em segundo plano.
import { askJsonFor, SUMMARY_MODEL } from '../_shared/claude.ts'
import { audioExpiry, MAX_AUDIO_BYTES, MONTHLY_LIMIT, processSermon } from '../_shared/sermon.ts'
import { admin, asUser, brMonth, cors, json, userId } from '../_shared/http.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

// Decidido pelo Thiago (8/10): metade do preço do whisper-1 e acertou mais palavras no teste.
const OPENAI_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe'

async function transcribe(audio: Blob, name: string) {
  const form = new FormData()
  form.append('file', audio, name)
  form.append('model', OPENAI_MODEL)
  form.append('language', 'pt')
  form.append('response_format', 'text')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Transcrição falhou: ${res.status}`)
  return res.text()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const uid = await userId(req)
  if (!uid) return json({ error: 'Precisa entrar na conta' }, 401)
  const { sermonId, keepAudio } = await req.json().catch(() => ({}))

  // Lê como a pessoa: só encontra o culto se for dela.
  const { data: sermon } = await asUser(req).from('sermons').select('id, audio_path').eq('id', sermonId).single()
  if (!sermon?.audio_path) return json({ error: 'Culto não encontrado' }, 404)
  if (!sermon.audio_path.startsWith(`${uid}/`)) return json({ error: 'Sem permissão' }, 403)
  // Um processamento por vez: outra chamada no meio (ex.: "Tentar de novo" depois de um tempo esgotado) não gasta outro culto.
  const { data: claimed } = await asUser(req).rpc('claim_sermon', { p_id: sermon.id })
  if (claimed !== true) return json({ status: 'processing' }, 409)

  const db = admin()
  const month = brMonth()
  const work = (async () => {
    try {
      const { data: file, error } = await db.storage.from('sermon-audio').download(sermon.audio_path)
      if (error || !file) throw new Error('Áudio não encontrado')
      if (file.size > MAX_AUDIO_BYTES) throw new Error('Áudio maior que 25 MB')

      const result = await processSermon({
        hasAccess: async () => (await db.rpc('has_access', { p_user: uid })).data === true,
        consume: async () => (await db.rpc('consume_usage', { p_user: uid, p_kind: 'sermon_month', p_period: month, p_limit: MONTHLY_LIMIT })).data as number,
        refund: async () => void (await db.rpc('refund_usage', { p_user: uid, p_kind: 'sermon_month', p_period: month })),
        transcribe: () => transcribe(file, sermon.audio_path.split('/').pop() ?? 'culto.m4a'),
        versesByKeys: async (keys) => (keys.length ? ((await db.rpc('verses_by_keys', { p_keys: keys })).data ?? []) : []).map((v: { verse_key: string; text: string }) => ({ key: v.verse_key, text: v.text })),
        askJson: askJsonFor(SUMMARY_MODEL),
      })

      if (result.kind !== 'ready') {
        await db.from('sermons').update({ status: 'failed', summary: { reason: result.kind } }).eq('id', sermon.id)
        return
      }
      // Padrão: fica só o texto. O áudio só fica quando a pessoa escolheu, por 30 dias.
      if (!keepAudio) await db.storage.from('sermon-audio').remove([sermon.audio_path])
      await db
        .from('sermons')
        .update({
          status: 'ready',
          title: result.summary.title,
          transcript: result.transcript,
          summary: result.summary,
          audio_path: keepAudio ? sermon.audio_path : null,
          audio_expires_at: keepAudio ? audioExpiry() : null,
        })
        .eq('id', sermon.id)
    } catch (e) {
      console.error('sermon', e)
      // Guarda só a etapa que falhou (sem texto do culto), para o app e o suporte saberem o motivo.
      const reason = e instanceof Error ? e.message.slice(0, 120) : 'erro'
      await db.from('sermons').update({ status: 'failed', summary: { reason } }).eq('id', sermon.id)
    }
  })()

  EdgeRuntime.waitUntil(work)
  return json({ status: 'processing' }, 202)
})
