import { NewRequestScreen } from '../../../features/prayer/screens/NewRequestScreen'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="prayer">
      <NewRequestScreen />
    </FeatureGuard>
  )
}
