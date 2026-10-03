import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts } from '../theme/typography'
import { AppText } from './AppText'
import { Icon, type IconName } from './Icon'
import { MIN_TOUCH } from './Button'

interface Props {
  label: string
  description?: string
  selected: boolean
  onPress: () => void
  /** "checkbox" marca várias; "radio" escolhe uma entre várias. */
  kind: 'checkbox' | 'radio'
  icon?: IconName
  disabled?: boolean
  /** Etiqueta à direita, por exemplo "Em breve". */
  trailing?: ReactNode
}

/** Cartão selecionável do protótipo (primeiro acesso, objetivos, horários). Marca com visto, não só com cor. */
export function SelectCard({ label, description, selected, onPress, kind, icon, disabled, trailing }: Props) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={kind}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.line,
        backgroundColor: selected ? colors.primarySoft : colors.card,
        opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={22} color={colors.primary} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" style={{ fontFamily: fonts.semibold }}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="small" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {trailing}
      <Mark kind={kind} selected={selected} />
    </Pressable>
  )
}

function Mark({ kind, selected }: { kind: 'checkbox' | 'radio'; selected: boolean }) {
  const { colors } = useTheme()
  const box = {
    width: 24,
    height: 24,
    borderRadius: kind === 'radio' ? 12 : 6,
    borderWidth: 2,
    borderColor: selected ? colors.primary : colors.lineStrong,
    backgroundColor: selected && kind === 'checkbox' ? colors.primary : 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }
  return (
    <View style={box}>
      {selected && kind === 'checkbox' ? <Icon name="check" size={14} color={colors.primaryText} strokeWidth={3} /> : null}
      {selected && kind === 'radio' ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} /> : null}
    </View>
  )
}
