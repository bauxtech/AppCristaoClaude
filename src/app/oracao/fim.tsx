import { GuidedEndScreen } from '../../features/prayer/screens/GuidedEndScreen'
import { FeatureGuard } from '../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="prayer">
      <GuidedEndScreen />
    </FeatureGuard>
  )
}
