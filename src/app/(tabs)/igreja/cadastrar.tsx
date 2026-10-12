import { ManualChurchScreen } from '../../../features/church/screens/SearchScreens'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="church">
      <ManualChurchScreen />
    </FeatureGuard>
  )
}
