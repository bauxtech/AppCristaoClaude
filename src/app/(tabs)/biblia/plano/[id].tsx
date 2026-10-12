import { PlanDetailScreen } from '../../../../features/bible/screens/PlanDetailScreen'
import { FeatureGuard } from '../../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="reading_plans">
      <PlanDetailScreen />
    </FeatureGuard>
  )
}
