import { useEffect, useRef, useState } from 'react'
import { AppState, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { applyNewVersion, fetchNewVersion } from '../lib/appUpdate'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { Button } from './Button'

/** Faixa no topo quando há uma versão nova baixada: tocar reinicia o app na versão nova. */
export function UpdateBanner({ check = fetchNewVersion }: { check?: () => Promise<boolean> }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [ready, setReady] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    const run = () => {
      if (busy.current) return
      busy.current = true
      void check().then((r) => {
        busy.current = false
        if (r) setReady(true)
      })
    }
    run()
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run())
    return () => sub.remove()
  }, [check])

  if (!ready) return null
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 12, right: 12, top: insets.top + 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingLeft: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }}
    >
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        Nova versão do acasa pronta
      </AppText>
      <Button label="Atualizar agora" size="sm" onPress={() => void applyNewVersion()} />
    </View>
  )
}
