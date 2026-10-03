import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Card, IconButton, TopBar } from '../components'
import { useTheme } from '../theme/ThemeProvider'

/** Painel de oração, por cima das abas. O conteúdo entra no fluxo de oração. */
export default function Oracao() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Oração" right={<IconButton icon="close" label="Fechar oração" onPress={() => router.back()} />} />
      <View style={{ padding: 16 }}>
        <Card>
          <AppText variant="body" tone="secondary">
            A oração entra no fluxo de oração.
          </AppText>
        </Card>
      </View>
    </View>
  )
}
