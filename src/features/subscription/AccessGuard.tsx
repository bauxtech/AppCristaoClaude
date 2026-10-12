import { Redirect } from 'expo-router'
import type { ReactNode } from 'react'
import { IS_PREVIEW } from '../../lib/preview'
import { useSession } from '../../state/session'
import { FeatureGuard } from './PlanLock'
import type { Feature } from './plan'

/**
 * Vale para toda pilha fora das abas. Sem login: volta para o início.
 * Com feature: sem a função no plano, mostra a tela de bloqueio, mesmo quando aberta por um link.
 * Sem plano, só a Bíblia continua; o que a pessoa criou continua visível nas telas que não são de criação.
 */
export function AccessGuard({ children, feature }: { children: ReactNode; feature?: Feature }) {
  const { onboarded } = useSession()
  if (!onboarded) return <Redirect href="/bem-vindo" />
  if (feature) return <FeatureGuard feature={feature}>{children}</FeatureGuard>
  return <>{children}</>
}

/** Telas de teste (componentes, gravação longa): só na prévia. */
export function PreviewOnly({ children }: { children: ReactNode }) {
  if (!IS_PREVIEW) return <Redirect href="/" />
  return <>{children}</>
}
