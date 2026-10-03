// Contrato da chamada ao Claude, usado pela lógica e pelos testes (sem depender do SDK).

export interface AskJsonRequest {
  system: string
  prompt: string
  /** JSON Schema da resposta (saída estruturada). */
  schema: Record<string, unknown>
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
}

/** Faz a pergunta e devolve o objeto já lido do JSON. Lança erro quando o modelo recusa ou a resposta vem cortada. */
export type AskJson = (req: AskJsonRequest) => Promise<unknown>
