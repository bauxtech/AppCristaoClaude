import { TrimScreen } from '../../features/sermon/screens/TrimScreen'
import { FeatureGuard } from '../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="sermon">
      <TrimScreen />
    </FeatureGuard>
  )
}
