import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { AppText, Button, Card, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'

/** Tela interna da oração: barra de topo com voltar e conteúdo rolável. */
export function PrayerPage({ title, children, right, onBack }: { title: string; children: ReactNode; right?: ReactNode; onBack?: () => void }) {
  const { colors } = useTheme()
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={title} onBack={onBack ?? (() => router.back())} right={right} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** Confirmação de apagar, dentro da tela, com o motivo escrito. */
export function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  const { colors } = useTheme()
  return (
    <Card style={{ borderColor: colors.danger, gap: 12 }} accessibilityLiveRegion="polite">
      <View style={{ gap: 4 }}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="small" tone="secondary">
          Esta ação não pode ser desfeita.
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Cancelar" variant="outline" size="sm" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Apagar" variant="danger" size="sm" onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Card>
  )
}

/** Estado vazio de lista. */
export function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 16 }}>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  )
}
