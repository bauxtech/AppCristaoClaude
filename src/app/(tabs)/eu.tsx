import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Card, ListRow } from '../../components'
import { useSession } from '../../state/session'
import { useTheme } from '../../theme/ThemeProvider'

export default function Eu() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { signOut } = useSession()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 96, gap: 12 }}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
        <AppText variant="screenTitle" accessibilityRole="header">
          Eu
        </AppText>
        <AppText variant="small" tone="secondary">
          O perfil entra no fluxo música e perfil.
        </AppText>
      </View>
      <Card style={{ paddingVertical: 8 }}>
        <ListRow label="Componentes" sub="Ver todos no claro, escuro e alto contraste" onPress={() => router.push('/componentes')} divider />
        <ListRow label="Teste de gravação" sub="Gravar 60 minutos com a tela bloqueada" onPress={() => router.push('/teste-gravacao')} divider />
        <ListRow
          label="Refazer o primeiro acesso"
          sub="Só na prévia: volta para a tela de boas-vindas"
          onPress={() => {
            signOut()
            router.replace('/bem-vindo')
          }}
        />
      </Card>
    </ScrollView>
  )
}
