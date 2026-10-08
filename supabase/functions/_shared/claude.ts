// Chamada ao Claude dentro das Edge Functions (Deno). A chave fica no segredo ANTHROPIC_API_KEY do Supabase.
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0'
import type { AskJson } from './claude-types.ts'

// Modelo padrão. Trocar de modelo muda custo e qualidade: decisão do Thiago.
// CHAT_MODEL e SUMMARY_MODEL trocam só o chat ou só o resumo do culto.
export const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5'
export const CHAT_MODEL = Deno.env.get('CHAT_MODEL') ?? MODEL
export const SUMMARY_MODEL = Deno.env.get('SUMMARY_MODEL') ?? MODEL

const client = new Anthropic()

/** Modelos em que a API tenta de novo noutro modelo quando o filtro de segurança recusa. O Haiku não tem. */
const hasFallback = (model: string) => /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model)

export function askJsonFor(model: string): AskJson {
  return async ({ system, prompt, schema, effort = 'medium', maxTokens = 4000 }) => {
    const params = {
      model,
      max_tokens: maxTokens,
      // O texto do sistema não muda entre pedidos: fica em cache e sai mais barato.
      system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: prompt }],
      output_config: { effort, format: { type: 'json_schema' as const, schema } },
    }
    const response = hasFallback(model)
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(params)
    if (response.stop_reason === 'refusal') throw new Error('O modelo recusou o pedido')
    if (response.stop_reason === 'max_tokens') throw new Error('A resposta ficou longa demais')
    const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    return JSON.parse(text)
  }
}

export const askJson: AskJson = askJsonFor(MODEL)
