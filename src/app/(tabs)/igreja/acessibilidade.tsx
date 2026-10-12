import { EditAccessibilityScreen } from '../../../features/church/screens/EditScreens'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="church">
      <EditAccessibilityScreen />
    </FeatureGuard>
  )
}
