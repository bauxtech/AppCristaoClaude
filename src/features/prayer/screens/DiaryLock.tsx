import * as LocalAuthentication from 'expo-local-authentication'
import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'
import { AppText, Button } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { usePrayer } from '../PrayerContext'

type Support = 'checking' | 'biometric' | 'codeOnly' | 'none' | 'web'

/** Desbloqueio do diário com biometria ou com o código do celular. */
export function DiaryLock() {
  const { colors } = useTheme()
  const { setDiaryUnlocked } = usePrayer()
  const [support, setSupport] = useState<Support>(Platform.OS === 'web' ? 'web' : 'checking')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (Platform.OS === 'web') return
    ;(async () => {
      const [hardware, enrolled, level] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.getEnrolledLevelAsync(),
      ])
      if (hardware && enrolled) setSupport('biometric')
      else if (level !== LocalAuthentication.SecurityLevel.NONE) setSupport('codeOnly')
      else setSupport('none')
    })().catch(() => setSupport('none'))
  }, [])

  async function unlock(useCode: boolean) {
    if (support === 'web') {
      setDiaryUnlocked(true)
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o diário',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar o código do celular',
        disableDeviceFallback: !useCode,
      })
      if (res.success) setDiaryUnlocked(true)
      else if (res.error !== 'user_cancel' && res.error !== 'system_cancel' && res.error !== 'app_cancel') setMessage('Não foi possível confirmar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 32, gap: 28 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={36} color={colors.primary} />
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <AppText variant="title" accessibilityRole="header">
          Diário protegido
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {support === 'none'
            ? 'Este celular não tem biometria nem código de bloqueio. Ative um deles nos ajustes do celular, ou desligue a proteção do diário.'
            : support === 'codeOnly'
              ? 'Desbloqueie o diário com o código do celular'
              : 'Desbloqueie o diário com biometria'}
        </AppText>
        {support === 'web' ? (
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            Na prévia web, o desbloqueio é simulado.
          </AppText>
        ) : null}
        {message ? (
          <AppText variant="small" tone="danger" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
            {message}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        {support === 'biometric' || support === 'web' ? <Button label={busy ? 'Verificando' : 'Usar biometria'} disabled={busy} onPress={() => unlock(false)} /> : null}
        {support === 'codeOnly' ? <Button label={busy ? 'Verificando' : 'Usar o código do celular'} disabled={busy} onPress={() => unlock(true)} /> : null}
        {support === 'biometric' || support === 'web' ? <Button label="Usar o código do celular" variant="text" disabled={busy} onPress={() => unlock(true)} /> : null}
      </View>
    </View>
  )
}
