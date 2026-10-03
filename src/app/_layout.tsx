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
import { ToastProvider } from '../components'
import { AudioProvider } from '../features/audio/AudioContext'
import { BibleProvider } from '../features/bible/BibleContext'
import { CellProvider } from '../features/cell/CellContext'
import { ChurchProvider } from '../features/church/ChurchContext'
import { PrayerProvider } from '../features/prayer/PrayerContext'
import { SermonProvider } from '../features/sermon/SermonContext'
import { SessionProvider } from '../state/session'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootStack() {
  const { colors, isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="oracao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="culto" />
        <Stack.Screen name="componentes" />
        <Stack.Screen name="teste-gravacao" />
      </Stack>
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
        <SessionProvider>
          <BibleProvider>
            <PrayerProvider>
              <CellProvider>
                <ChurchProvider>
                  <SermonProvider>
                    <AudioProvider>
                      <ToastProvider>
                        <RootStack />
                      </ToastProvider>
                    </AudioProvider>
                  </SermonProvider>
                </ChurchProvider>
              </CellProvider>
            </PrayerProvider>
          </BibleProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
