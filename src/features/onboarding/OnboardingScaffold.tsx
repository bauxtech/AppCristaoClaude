import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, IconButton, ProgressBar } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { PROGRESS_STEPS, type ProgressStep } from './data'

interface Props {
  title: string
  subtitle?: string
  /** Passo na barra de progresso. Sem passo, a barra não aparece. */
  step?: ProgressStep
  onBack?: () => void
  children: ReactNode
  /** Botões fixos no rodapé. */
  footer?: ReactNode
  /** Ícone grande acima do título, usado nas telas de boas-vindas e convite. */
  hero?: ReactNode
}

/** Estrutura comum das telas do primeiro acesso, no desenho do protótipo. */
export function OnboardingScaffold({ title, subtitle, step, onBack, children, footer, hero }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const index = step ? PROGRESS_STEPS.indexOf(step) + 1 : 0

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8 }}>
        {step ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <ProgressBar value={index} max={PROGRESS_STEPS.length} label={`Passo ${index} de ${PROGRESS_STEPS.length}`} />
          </View>
        ) : null}
        <View style={{ height: 48, paddingHorizontal: 8, justifyContent: 'center' }}>
          {onBack ? <IconButton icon="chevronLeft" label="Voltar" onPress={onBack} /> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        {hero}
        <View style={{ gap: 8 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, gap: 4 }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  )
}

/** Ícone grande em caixa azul clara, usado no topo das telas de boas-vindas. */
export function HeroIcon({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )
}
