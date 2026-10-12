import { BeforeScreen } from '../../features/sermon/screens/BeforeScreen'
import { FeatureGuard } from '../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="sermon">
      <BeforeScreen />
    </FeatureGuard>
  )
}
