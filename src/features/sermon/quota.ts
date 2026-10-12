import { useSubscription } from '../subscription/SubscriptionContext'
import { usedThisMonth, type Sermon } from './data'

/**
 * Cultos do período, conforme o plano. Com o servidor, o número usado e a renovação vêm dele (período da assinatura).
 * Na prévia, conta os cultos do mês no aparelho.
 */
export function useSermonQuota(sermons: Sermon[]) {
  const sub = useSubscription()
  const q = sub.access.sermon
  const fromServer = q.resetsAt != null
  const used = fromServer ? q.used : usedThisMonth(sermons)
  return { limit: q.limit, used, full: q.limit > 0 && used >= q.limit, resetsAt: q.resetsAt, canRecord: sub.can('sermon') }
}
