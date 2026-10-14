// Contrato da chamada ao Claude, usado pela lógica e pelos testes (sem depender do SDK).

export type FileType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

export interface AskJsonRequest {
  system: string
  prompt: string
  /** JSON Schema da resposta (saída estruturada). */
  schema: Record<string, unknown>
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  /** Foto ou PDF enviado junto, antes do texto (base64, sem o prefixo data:). */
  image?: { data: string; mediaType: FileType }
}

/** Faz a pergunta e devolve o objeto já lido do JSON. Lança erro quando o modelo recusa ou a resposta vem cortada. */
export type AskJson = (req: AskJsonRequest) => Promise<unknown>
