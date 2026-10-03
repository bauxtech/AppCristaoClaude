import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Card, IconButton, TopBar } from '../components'
import { useTheme } from '../theme/ThemeProvider'

/** Painel do chat bíblico. O conteúdo entra no fluxo do chat. */
export default function Chat() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Chat bíblico" right={<IconButton icon="close" label="Fechar chat" onPress={() => router.back()} />} />
      <View style={{ padding: 16 }}>
        <Card>
          <AppText variant="body" tone="secondary">
            O chat entra no fluxo do chat.
          </AppText>
        </Card>
      </View>
    </View>
  )
}
