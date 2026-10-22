import { Redirect, router, Tabs } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon, type IconName } from '../../components/Icon'
import { MIN_TOUCH } from '../../components'
import { useAudio } from '../../features/audio/AudioContext'
import { MiniPlayer } from '../../features/audio/MiniPlayer'
import { useSession } from '../../state/session'
import { useSubscription } from '../../features/subscription/SubscriptionContext'
import { TrialIntroSheet } from '../../features/subscription/screens/SubscriptionScreens'
import { useTheme } from '../../theme/ThemeProvider'
import { scrollTabToTop } from '../../lib/tabScroll'
import { fonts } from '../../theme/typography'
import { TabTour } from '../../features/tour/TabTour'

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
  const { onboarded } = useSession()
  const { track } = useAudio()
  const sub = useSubscription()
  const playerHeight = track ? 60 : 0

  if (!onboarded) return <Redirect href="/bem-vindo" />
  // Dia 8 sem plano: a tela de planos aparece uma vez, com o botão para seguir só com a Bíblia.
  if (sub.showEndOfTrial) return <Redirect href={'/assinatura?fim=1' as '/assinatura'} />

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
          // Ao sair de uma aba, ela volta para a tela inicial: tocar de novo na aba nunca reabre uma tela interna antiga.
          popToTopOnBlur: true,
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            // Tocar numa aba abre a tela dela no início; a Bíblia guarda onde a pessoa estava.
            listeners={{ tabPress: () => (t.name === 'biblia' ? undefined : scrollTabToTop(t.name)) }}
            options={{
              title: t.title,
              tabBarAccessibilityLabel: t.title,
              // Aba ativa bem marcada (QA de 20/10): fundo verde claro atrás do ícone e nome em negrito, além da cor.
              tabBarIcon: ({ color, focused }) => (
                <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.primarySoft : 'transparent' }}>
                  <Icon name={t.icon} size={22} color={String(color)} strokeWidth={focused ? 2.4 : 2} />
                </View>
              ),
              tabBarLabel: ({ color, focused }) => (
                <Text style={{ color: String(color), fontSize: 12, fontFamily: focused ? fonts.bold : fonts.medium }} maxFontSizeMultiplier={1.4}>
                  {t.title}
                </Text>
              ),
            }}
          />
        ))}
      </Tabs>

      {/* Faixa da barra de status: ao rolar, o título da aba passa por baixo dela e não por cima do relógio (QA de 21/10). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top, backgroundColor: colors.bg }} />

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: TAB_HEIGHT + insets.bottom }}>
        <MiniPlayer />
      </View>

      {/* Botão do chat, só ícone, no canto inferior esquerdo, como no protótipo. */}
      <Pressable
        onPress={() => router.push('/chat')}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat bíblico"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 16,
          bottom: TAB_HEIGHT + insets.bottom + playerHeight + 12,
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
      <TrialIntroSheet />
      {/* Passo a passo da aba, na primeira vez. Espera o aviso dos 7 dias grátis ser fechado. */}
      <TabTour hidden={sub.status === 'trial' && !sub.introSeen && !!sub.trialEndsAt} bottom={TAB_HEIGHT + insets.bottom + playerHeight} />
    </View>
  )
}
