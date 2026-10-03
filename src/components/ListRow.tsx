import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { Icon, type IconName } from './Icon'
import { MIN_TOUCH } from './Button'
import { fonts } from '../theme/typography'

interface Props {
  label: string
  sub?: string
  onPress?: () => void
  /** Ícone em caixa azul clara à esquerda, como nos compromissos do Hoje. */
  icon?: IconName
  /** Substitui a seta da direita (por exemplo, uma chave ou uma etiqueta). */
  right?: ReactNode
  danger?: boolean
  /** Mostra a linha divisória embaixo. */
  divider?: boolean
  accessibilityHint?: string
}

export function ListRow({ label, sub, onPress, icon, right, danger, divider, accessibilityHint }: Props) {
  const { colors } = useTheme()
  const content = (
    <>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ color: danger ? colors.danger : colors.text, fontFamily: fonts.medium }}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="small" tone="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={colors.lineStrong} /> : null)}
    </>
  )

  const rowStyle = {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: divider ? 1 : 0,
    borderBottomColor: colors.line,
  }

  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={sub ? `${label}, ${sub}` : label}>
        {content}
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  )
}
