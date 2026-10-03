import { useLocalSearchParams } from 'expo-router'
import { SetTimeScreen } from '../../features/settings/screens/NoticeScreens'

export default function Horario() {
  const { qual } = useLocalSearchParams<{ qual?: string }>()
  return <SetTimeScreen which={(qual as 'leitura') ?? 'leitura'} />
}
