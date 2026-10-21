import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular'
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium'
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold'
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold'
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular'
import { Literata_400Regular_Italic } from '@expo-google-fonts/literata/400Regular_Italic'
import { Literata_500Medium } from '@expo-google-fonts/literata/500Medium'
import { useFonts } from 'expo-font'
import { router, Stack, usePathname } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import { BackHandler } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConnectionFrame, ToastProvider, UpdateBanner } from '../components'
import { ConnectionProvider } from '../state/connection'
import { watchSession } from '../lib/supabase'
import { startSync } from '../lib/sync'
import { configureStore } from '../lib/store'
import { Splash } from '../features/onboarding/Splash'
import { AudioProvider } from '../features/audio/AudioContext'
import { BibleProvider } from '../features/bible/BibleContext'
import { CellProvider } from '../features/cell/CellContext'
import { ChurchProvider } from '../features/church/ChurchContext'
import { PrayerProvider } from '../features/prayer/PrayerContext'
import { SermonProvider } from '../features/sermon/SermonContext'
import { ChatProvider } from '../features/chat/ChatContext'
import { ProfileProvider } from '../features/profile/ProfileContext'
import { SettingsProvider, useSettings } from '../features/settings/SettingsContext'
import { SubscriptionProvider } from '../features/subscription/SubscriptionContext'
import { SessionProvider } from '../state/session'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'
import { isInternalRoute } from '../lib/links'
import { watchPushes } from '../lib/push'
import { backFromJump, jumpTo, setCurrentRoute } from '../lib/nav'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootStack() {
  const { colors, isDark } = useTheme()
  // Com o servidor ligado, a loja (RevenueCat) usa o id da pessoa logada.
  useEffect(() => watchSession(configureStore), [])
  // Fila de sincronização com o banco: acompanha o login e a volta da internet.
  useEffect(() => startSync(), [])
  // Avisos do servidor: atualizam a central e, ao tocar, abrem a tela do aviso.
  const { refreshNotices } = useSettings()
  useEffect(() => watchPushes(() => void refreshNotices(), (href) => isInternalRoute(href) && jumpTo(href as '/avisos')), [refreshNotices])
  // Voltar depois de um salto para outra aba: a tela atual vai para o registro, e o voltar do Android também desfaz o salto.
  const pathname = usePathname()
  useEffect(() => setCurrentRoute(pathname), [pathname])
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', backFromJump)
    return () => sub.remove()
  }, [])
  // Splash de 2 segundos ao abrir. Logado cai no Hoje; sem login, na apresentação.
  const [splash, setSplash] = useState(true)
  const endSplash = useCallback(() => setSplash(false), [])
  return (
    <>
      <StatusBar style={splash ? (isDark ? 'dark' : 'light') : isDark ? 'light' : 'dark'} />
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
      {splash ? <Splash onDone={endSplash} /> : <UpdateBanner />}
    </>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
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
