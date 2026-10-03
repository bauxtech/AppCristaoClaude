// Chamada ao Claude dentro das Edge Functions (Deno). A chave fica no segredo ANTHROPIC_API_KEY do Supabase.
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0'
import type { AskJson } from './claude-types.ts'

// Modelo padrão. Trocar de modelo muda custo e qualidade: decisão do Thiago.
export const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5'

const client = new Anthropic()

export const askJson: AskJson = async ({ system, prompt, schema, effort = 'medium', maxTokens = 4000 }) => {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    // O texto do sistema não muda entre pedidos: fica em cache e sai mais barato.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort, format: { type: 'json_schema', schema } },
    // Se o filtro de segurança recusar, a API tenta de novo no modelo recomendado.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })
  if (response.stop_reason === 'refusal') throw new Error('O modelo recusou o pedido')
  if (response.stop_reason === 'max_tokens') throw new Error('A resposta ficou longa demais')
  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  return JSON.parse(text)
}
