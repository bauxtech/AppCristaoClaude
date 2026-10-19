import { currentUserId } from '../../lib/sync'
import { IS_REMOTE, supabase } from '../../lib/supabase'

/**
 * De onde a pessoa chegou à tela de planos (cadeado, régua, fim do teste) e de onde veio a compra.
 * Serve para saber qual gatilho converte. Falha de rede não atrapalha nada: o registro só se perde.
 */
export function logPaywall(kind: 'view' | 'purchase', source: string, feature?: string | null) {
  if (!IS_REMOTE || !supabase || !currentUserId()) return
  void supabase.rpc('log_paywall', { p_kind: kind, p_source: source.slice(0, 40), p_feature: feature ?? null }).then(
    () => {},
    () => {},
  )
}

/** Origem quando a tela abre sem dizer: o fim do teste, um cadeado ou outro caminho do app. */
export function paywallSource(params: { origem?: string; fim?: string; funcao?: string }) {
  if (params.origem && /^[a-z0-9-]{1,40}$/.test(params.origem)) return params.origem
  if (params.fim === '1') return 'fim-do-teste'
  if (params.funcao) return 'cadeado'
  return 'outro'
}
