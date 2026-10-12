import { CreateCellScreen } from '../../../features/cell/screens/CreateCellScreen'
import { FeatureGuard } from '../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="cell_lead">
      <CreateCellScreen />
    </FeatureGuard>
  )
}
