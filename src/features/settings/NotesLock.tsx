import * as LocalAuthentication from 'expo-local-authentication'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Platform, View } from 'react-native'
import { AppText, Button, Card, TopBar } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { NotesLock } from '../prayer/screens/DiaryLock'
import { useSettings } from './SettingsContext'

// Trava das anotações (Configurações > Biometria). Vale em todo lugar que mostra anotação:
// central de anotações, nota da Bíblia, notas do culto e da aula.

export function useNotesLocked() {
  const s = useSettings()
  return s.notesLock && !s.notesUnlocked
}

/** Tela inteira travada até desbloquear. */
export function NotesGate({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme()
  if (!useNotesLocked()) return <>{children}</>
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={title} onBack={() => router.back()} />
      <NotesLock />
    </View>
  )
}

/** Só a parte das anotações travada, dentro de uma tela maior. */
export function NotesLockedInline() {
  const s = useSettings()
  async function unlock() {
    if (Platform.OS === 'web') return s.setNotesUnlocked(true)
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear as anotações', cancelLabel: 'Cancelar' }).catch(() => ({ success: false }))
    if (res.success) s.setNotesUnlocked(true)
  }
  return (
    <Card style={{ gap: 8 }}>
      <AppText variant="bodyStrong">Anotações protegidas</AppText>
      <AppText variant="small" tone="secondary">
        Desbloqueie com biometria ou com o código do celular para ver.
      </AppText>
      <Button label="Desbloquear" size="sm" variant="soft" onPress={unlock} style={{ alignSelf: 'flex-start' }} />
    </Card>
  )
}
