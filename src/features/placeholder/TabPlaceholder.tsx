import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Card } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'

/** Aba ainda sem tela. Cada uma ganha a sua no fluxo correspondente. */
export function TabPlaceholder({ title, flow }: { title: string; flow: string }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 96 }}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 16 }}>
        <AppText variant="screenTitle" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      <Card>
        <AppText variant="body" tone="secondary">
          Esta aba entra no fluxo {flow}.
        </AppText>
      </Card>
    </ScrollView>
  )
}
