// Limites do plano: conferidos e contados no banco (use_limit), com os números de plan_config.
// O app só mostra. Quem decide se a pessoa pode é sempre o servidor.

export type Usage =
  | { ok: true; remaining: number; limit: number; resetsAt: string | null }
  | { ok: false; reason: 'no_access' }
  | { ok: false; reason: 'limit'; limit: number; resetsAt: string | null }

type Raw = { ok?: boolean; reason?: string; remaining?: number; limit?: number; resets_at?: string | null; counter?: string; period?: string } | null

export function usageFrom(r: Raw): Usage {
  if (r?.ok) return { ok: true, remaining: r.remaining ?? 0, limit: r.limit ?? 0, resetsAt: r.resets_at ?? null }
  if (r?.reason === 'limit') return { ok: false, reason: 'limit', limit: r.limit ?? 0, resetsAt: r.resets_at ?? null }
  return { ok: false, reason: 'no_access' }
}

type Rpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }

/** Conta um uso. Devolve o resultado e como devolver o uso se a resposta falhar. */
export async function useLimit(db: Rpc, uid: string, kind: 'chat' | 'sermon' | 'course_photo' | 'course_read'): Promise<{ usage: Usage; refund: () => Promise<void> }> {
  const { data, error } = await db.rpc('use_limit', { p_user: uid, p_kind: kind })
  if (error) throw new Error('Não foi possível conferir o plano')
  const raw = data as Raw
  const usage = usageFrom(raw)
  const refund = async () => {
    if (usage.ok && raw?.counter && raw.period) await db.rpc('refund_usage', { p_user: uid, p_kind: raw.counter, p_period: raw.period })
  }
  return { usage, refund }
}
