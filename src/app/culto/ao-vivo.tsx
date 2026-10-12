import { LiveScreen } from '../../features/sermon/screens/LiveScreen'
import { FeatureGuard } from '../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="sermon">
      <LiveScreen />
    </FeatureGuard>
  )
}
