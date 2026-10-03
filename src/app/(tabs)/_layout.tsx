import { router, Tabs } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon, type IconName } from '../../components/Icon'
import { MIN_TOUCH } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'

const TAB_HEIGHT = 64

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Hoje', icon: 'home' },
  { name: 'biblia', title: 'Bíblia', icon: 'book' },
  { name: 'celula', title: 'Célula', icon: 'people' },
  { name: 'igreja', title: 'Igreja', icon: 'church' },
  { name: 'eu', title: 'Eu', icon: 'user' },
]

export default function TabsLayout() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: TAB_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
          tabBarAllowFontScaling: true,
          tabBarItemStyle: { minHeight: MIN_TOUCH },
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarAccessibilityLabel: t.title,
              tabBarIcon: ({ color }) => <Icon name={t.icon} size={22} color={String(color)} />,
            }}
          />
        ))}
      </Tabs>

      {/* Botão do chat, só ícone, no canto inferior esquerdo, como no protótipo. */}
      <Pressable
        onPress={() => router.push('/chat')}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat bíblico"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 16,
          bottom: TAB_HEIGHT + insets.bottom + 12,
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          borderRadius: MIN_TOUCH / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        })}
      >
        <Icon name="chat" size={20} color={colors.primaryText} />
      </Pressable>
    </View>
  )
}
