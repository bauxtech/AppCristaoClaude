import { BeforeGuidedScreen } from '../../../features/prayer/screens/BeforeGuidedScreen'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="prayer">
      <BeforeGuidedScreen />
    </FeatureGuard>
  )
}
