import { ReflectionScreen } from '../features/home/ReflectionScreen'
import { AccessGuard } from '../features/subscription/AccessGuard'

export default function Reflexao() {
  return (
    <AccessGuard>
      <ReflectionScreen />
    </AccessGuard>
  )
}
