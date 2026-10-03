import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native'
import { getItem, setItem } from '../lib/storage'
import { palettes, type Palette, type ThemeMode } from './colors'

/** Escolha da pessoa. "system" segue o modo do celular. */
export type AppearancePreference = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  colors: Palette
  mode: ThemeMode
  isDark: boolean
  highContrast: boolean
  preference: AppearancePreference
  setPreference: (p: AppearancePreference) => void
  /** Liga o alto contraste mesmo quando o celular não pede. */
  setHighContrastOverride: (v: boolean | null) => void
  /** Fonte grande do app, somada ao tamanho de fonte do celular. */
  largeText: boolean
  setLargeText: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function useSystemHighContrast(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let mounted = true
    const check =
      Platform.OS === 'ios'
        ? AccessibilityInfo.isDarkerSystemColorsEnabled
        : Platform.OS === 'android'
          ? AccessibilityInfo.isHighTextContrastEnabled
          : null
    if (!check) return
    check().then((v) => mounted && setEnabled(v)).catch(() => {})
    const event = Platform.OS === 'ios' ? 'darkerSystemColorsChanged' : 'highTextContrastChanged'
    const sub = AccessibilityInfo.addEventListener(event, (v: boolean) => setEnabled(v))
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  return enabled
}

export function resolveMode(isDark: boolean, highContrast: boolean): ThemeMode {
  if (highContrast) return isDark ? 'highContrastDark' : 'highContrastLight'
  return isDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const systemHighContrast = useSystemHighContrast()
  // A escolha da pessoa fica guardada no aparelho.
  const [saved] = useState(() => getItem<{ preference?: AppearancePreference; highContrast?: boolean | null; largeText?: boolean }>('appearance', {}))
  const [preference, setPreference] = useState<AppearancePreference>(saved.preference ?? 'system')
  const [highContrastOverride, setHighContrastOverride] = useState<boolean | null>(saved.highContrast ?? null)
  const [largeText, setLargeText] = useState(saved.largeText ?? false)

  useEffect(() => {
    setItem('appearance', { preference, highContrast: highContrastOverride, largeText })
  }, [preference, highContrastOverride, largeText])

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = preference === 'system' ? scheme === 'dark' : preference === 'dark'
    const highContrast = highContrastOverride ?? systemHighContrast
    const mode = resolveMode(isDark, highContrast)
    return {
      colors: palettes[mode],
      mode,
      isDark,
      highContrast,
      preference,
      setPreference,
      setHighContrastOverride,
      largeText,
      setLargeText,
    }
  }, [scheme, systemHighContrast, preference, highContrastOverride, largeText])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de ThemeProvider')
  return ctx
}
