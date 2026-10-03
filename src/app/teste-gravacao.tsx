import { RecordingTestScreen } from '../features/recording-test/RecordingTestScreen'
import { PreviewOnly } from '../features/subscription/AccessGuard'

export default function TesteGravacao() {
  return (
    <PreviewOnly>
      <RecordingTestScreen />
    </PreviewOnly>
  )
}
