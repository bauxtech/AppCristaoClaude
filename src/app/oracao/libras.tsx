import { LibrasRecordScreen } from '../../features/prayer/screens/LibrasRecordScreen'
import { FeatureGuard } from '../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="prayer">
      <LibrasRecordScreen />
    </FeatureGuard>
  )
}
