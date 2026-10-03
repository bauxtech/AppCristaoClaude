import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular'
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium'
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold'
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold'
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular'
import { Literata_400Regular_Italic } from '@expo-google-fonts/literata/400Regular_Italic'
import { Literata_500Medium } from '@expo-google-fonts/literata/500Medium'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConnectionFrame, ToastProvider } from '../components'
import { ConnectionProvider } from '../state/connection'
import { watchSession } from '../lib/supabase'
import { configureStore } from '../lib/store'
import { AudioProvider } from '../features/audio/AudioContext'
import { BibleProvider } from '../features/bible/BibleContext'
import { CellProvider } from '../features/cell/CellContext'
import { ChurchProvider } from '../features/church/ChurchContext'
import { PrayerProvider } from '../features/prayer/PrayerContext'
import { SermonProvider } from '../features/sermon/SermonContext'
import { ChatProvider } from '../features/chat/ChatContext'
import { ProfileProvider } from '../features/profile/ProfileContext'
import { SettingsProvider } from '../features/settings/SettingsContext'
import { SubscriptionProvider } from '../features/subscription/SubscriptionContext'
import { SessionProvider } from '../state/session'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootStack() {
  const { colors, isDark } = useTheme()
  // Com o servidor ligado, a loja (RevenueCat) usa o id da pessoa logada.
  useEffect(() => watchSession(configureStore), [])
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ConnectionFrame>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
          <Stack.Screen name="oracao" options={{ presentation: 'modal' }} />
          <Stack.Screen name="culto" />
          <Stack.Screen name="avisos" />
          <Stack.Screen name="configuracoes" />
          <Stack.Screen name="assinatura" />
          <Stack.Screen name="componentes" />
          <Stack.Screen name="teste-gravacao" />
        </Stack>
      </ConnectionFrame>
    </>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
  })

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {})
  }, [loaded, error])

  if (!loaded && !error) return null

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectionProvider>
          <SessionProvider>
            <SettingsProvider>
              <SubscriptionProvider>
                <BibleProvider>
                  <PrayerProvider>
                    <CellProvider>
                      <ChurchProvider>
                        <SermonProvider>
                          <ChatProvider>
                            <ProfileProvider>
                              <AudioProvider>
                                <ToastProvider>
                                  <RootStack />
                                </ToastProvider>
                              </AudioProvider>
                            </ProfileProvider>
                          </ChatProvider>
                        </SermonProvider>
                      </ChurchProvider>
                    </CellProvider>
                  </PrayerProvider>
                </BibleProvider>
              </SubscriptionProvider>
            </SettingsProvider>
          </SessionProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
