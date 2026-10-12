import { MusicScreen } from '../../../../features/music/screens/MusicScreens'
import { FeatureGuard } from '../../../../features/subscription/PlanLock'

// Função do plano: sem ela, mostra o cadeado e a tela de planos.
export default function Route() {
  return (
    <FeatureGuard feature="music">
      <MusicScreen />
    </FeatureGuard>
  )
}
