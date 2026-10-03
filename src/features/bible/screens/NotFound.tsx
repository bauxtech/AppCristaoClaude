import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'

export function NotFound() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Não encontrado" onBack={() => router.back()} />
      <View style={{ padding: 20, gap: 12 }}>
        <AppText variant="body">Não encontramos esse livro ou capítulo.</AppText>
        <Button label="Voltar para a Bíblia" variant="outline" onPress={() => router.replace('/biblia')} />
      </View>
    </View>
  )
}
