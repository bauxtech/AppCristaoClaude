import { Redirect, useSegments } from 'expo-router'
import type { ReactNode } from 'react'
import { IS_PREVIEW } from '../../lib/preview'
import { useSession } from '../../state/session'
import { BlockedScreen } from './screens/SubscriptionScreens'
import { useSubscription } from './SubscriptionContext'

/** Telas que continuam abertas para quem está bloqueado (regra da tela de bloqueio). */
export const OPEN_WHEN_BLOCKED = ['dados', 'dados-guardados', 'consentimento', 'conta', 'sair', 'excluir', 'exclusao', 'lideranca', 'ajuda', 'suporte']

/**
 * Vale para toda pilha fora das abas (chat, oração, culto, avisos, configurações).
 * Sem login: volta para o início. Teste vencido sem assinatura: mostra o bloqueio,
 * mesmo quando a tela é aberta por um link.
 */
export function AccessGuard({ children, openWhenBlocked = OPEN_WHEN_BLOCKED }: { children: ReactNode; openWhenBlocked?: string[] | 'all' }) {
  const { onboarded } = useSession()
  const sub = useSubscription()
  const segments = useSegments() as string[]
  if (!onboarded) return <Redirect href="/bem-vindo" />
  if (sub.status === 'blocked') {
    const last = segments[segments.length - 1] ?? ''
    if (openWhenBlocked !== 'all' && !openWhenBlocked.includes(last)) return <BlockedScreen />
  }
  return <>{children}</>
}

/** Telas de teste (componentes, gravação longa): só na prévia. */
export function PreviewOnly({ children }: { children: ReactNode }) {
  if (!IS_PREVIEW) return <Redirect href="/" />
  return <>{children}</>
}
