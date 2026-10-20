import { Stack } from 'expo-router'
import { useTheme } from '../../../theme/ThemeProvider'

// A tela inicial da aba fica sempre embaixo: quem abre uma tela interna vindo de outra aba (ex.: "Ler capítulo" na Hoje)
// volta para o início da aba, e não para a aba de onde veio.
export const unstable_settings = { initialRouteName: 'index' }

export default function EuLayout() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
