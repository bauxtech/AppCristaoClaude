// POST /functions/v1/sermon-process  { sermonId, keepAudio }
// O app sobe o áudio em sermon-audio/<id da pessoa>/... e chama esta função.
// Confere login, assinatura e o limite de 5 cultos por mês. Responde na hora e processa em segundo plano.
import { askJsonFor, SUMMARY_MODEL } from '../_shared/claude.ts'
import { audioExpiry, MAX_AUDIO_BYTES, MAX_PART_BYTES, processSermon, transcribeParts } from '../_shared/sermon.ts'
import { useLimit } from '../_shared/usage.ts'
import { splitAudio, type AudioPart } from '../_shared/audio-split.ts'
import { admin, asUser, cors, json, userId } from '../_shared/http.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

// Decidido pelo Thiago (8/10): metade do preço do whisper-1 e acertou mais palavras no teste.
const OPENAI_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe'

async function transcribe(part: AudioPart) {
  const form = new FormData()
  form.append('file', new Blob([part.bytes as Uint8Array<ArrayBuffer>], { type: part.type }), part.name)
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
  const db = admin()
  // Plano e limite conferidos antes de começar, para o app mostrar o aviso na hora (tela 7.8, com a renovação).
  // Depois de começar, nada interrompe a transcrição.
  const { usage, refund } = await useLimit(db, uid, 'sermon')
  if (!usage.ok) {
    // Não vai processar: o áudio não fica no servidor (o padrão é guardar só o texto).
    await db.storage.from('sermon-audio').remove([sermon.audio_path])
    await db.from('sermons').update({ status: 'failed', audio_path: null, summary: { reason: usage.reason } }).eq('id', sermon.id)
    return json(usage.reason === 'limit' ? { status: 'limit', limit: usage.limit, resets_at: usage.resetsAt } : { status: 'no_access' })
  }
  // Um processamento por vez: outra chamada no meio (ex.: "Tentar de novo" depois de um tempo esgotado) não gasta outro culto.
  const { data: claimed } = await asUser(req).rpc('claim_sermon', { p_id: sermon.id })
  if (claimed !== true) {
    await refund()
    return json({ status: 'processing' }, 409)
  }

  const work = (async () => {
    let started = false
    try {
      const { data: file, error } = await db.storage.from('sermon-audio').download(sermon.audio_path)
      if (error || !file) throw new Error('Áudio não encontrado')
      if (file.size > MAX_AUDIO_BYTES) throw new Error('Áudio maior que 50 MB')
      // A transcrição recusa áudio longo (mais de uns 23 minutos): vai em partes de até 10 minutos.
      const parts = splitAudio(new Uint8Array(await file.arrayBuffer()))
      if (parts.length === 1 && parts[0].bytes.length > MAX_PART_BYTES) throw new Error('Formato de áudio sem divisão e maior que 25 MB')

      started = true
      const result = await processSermon({
        use: async () => usage,
        refund,
        transcribe: () => transcribeParts(parts, transcribe),
        versesByKeys: async (keys) => (keys.length ? ((await db.rpc('verses_by_keys', { p_keys: keys })).data ?? []) : []).map((v: { verse_key: string; text: string }) => ({ key: v.verse_key, text: v.text })),
        askJson: askJsonFor(SUMMARY_MODEL),
      })

      if (result.kind !== 'ready') {
        if (!keepAudio) await db.storage.from('sermon-audio').remove([sermon.audio_path])
        await db.from('sermons').update({ status: 'failed', summary: { reason: result.kind }, ...(keepAudio ? { audio_expires_at: audioExpiry() } : { audio_path: null }) }).eq('id', sermon.id)
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
      // Falhou antes de transcrever (áudio não encontrado, grande demais): a pessoa não perde o culto do mês.
      if (!started) await refund()
      // Guarda só a etapa que falhou (sem texto do culto), para o app e o suporte saberem o motivo.
      const reason = e instanceof Error ? e.message.slice(0, 120) : 'erro'
      // O áudio fica até 30 dias só se a pessoa escolheu guardar (permite tentar de novo); senão sai do servidor.
      if (!keepAudio) await db.storage.from('sermon-audio').remove([sermon.audio_path])
      await db.from('sermons').update({ status: 'failed', summary: { reason }, ...(keepAudio ? { audio_expires_at: audioExpiry() } : { audio_path: null }) }).eq('id', sermon.id)
    }
  })()

  EdgeRuntime.waitUntil(work)
  return json({ status: 'processing' }, 202)
})
