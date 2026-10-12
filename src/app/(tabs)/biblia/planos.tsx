import { PlansScreen } from '../../../features/bible/screens/PlansScreen'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="reading_plans">
      <PlansScreen />
    </FeatureGuard>
  )
}
