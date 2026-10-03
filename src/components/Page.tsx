import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { Button } from './Button'
import { Card } from './Card'
import { TopBar } from './TopBar'

/** Tela interna: barra de topo com voltar e conteúdo rolável. */
export function Page({ title, children, right, onBack }: { title: string; children: ReactNode; right?: ReactNode; onBack?: () => void }) {
  const { colors } = useTheme()
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={title} onBack={onBack ?? (() => router.back())} right={right} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** Confirmação dentro da tela, com o motivo escrito. */
export function ConfirmCard({
  title,
  message = 'Esta ação não pode ser desfeita.',
  confirmLabel = 'Apagar',
  danger = true,
  onCancel,
  onConfirm,
}: {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { colors } = useTheme()
  return (
    <Card style={{ borderColor: danger ? colors.danger : colors.primary, gap: 12 }} accessibilityLiveRegion="polite">
      <View style={{ gap: 4 }}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="small" tone="secondary">
          {message}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Cancelar" variant="outline" size="sm" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} size="sm" onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Card>
  )
}

/** Estado vazio de lista. */
export function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 32, paddingHorizontal: 16 }}>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  )
}

/** Cartão inteiro tocável, com nome para o leitor de tela. */
export function TapCard({ label, onPress, children, hint }: { label: string; onPress: () => void; children: ReactNode; hint?: string }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => ({ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 4, opacity: pressed ? 0.8 : 1 })}
    >
      {children}
    </Pressable>
  )
}
