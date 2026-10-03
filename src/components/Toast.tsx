import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { fonts } from '../theme/typography'

/** Confirmação curta no rodapé ("Abrindo o Spotify", "Salvo"). Também é falada pelo leitor de tela. */

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const show = useCallback((m: string) => {
    setMsg(m)
    AccessibilityInfo.announceForAccessibility(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2500)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 140, alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.darkSurface, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, maxWidth: '90%' }}>
            <AppText variant="small" style={{ color: '#FFFFFF', fontFamily: fonts.semibold }}>
              {msg}
            </AppText>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
