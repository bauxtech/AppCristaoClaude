import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts, size } from '../theme/typography'
import { AppText } from './AppText'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'text' | 'danger' | 'dangerSoft'

interface Props {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  /** "sm" para botões dentro de cartões e linhas. */
  size?: 'md' | 'sm'
  icon?: IconName
  disabled?: boolean
  /** Esperando o servidor. O leitor de tela anuncia "ocupado" e o botão não aceita outro toque. */
  busy?: boolean
  /** Explica o que acontece ao tocar, quando o rótulo sozinho não basta. */
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Área mínima de toque de 48, que cobre 44 pt no iPhone e 48 dp no Android. */
export const MIN_TOUCH = 48

export function Button({ label, onPress, variant = 'primary', size: sz = 'md', icon, disabled: disabledProp, busy, accessibilityHint, style, testID }: Props) {
  const disabled = disabledProp || busy
  const { colors } = useTheme()

  const look = {
    primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    outline: { bg: 'transparent', fg: colors.primary, border: colors.lineStrong },
    text: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.dangerText, border: colors.danger },
    dangerSoft: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant]

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      hitSlop={variant === 'text' ? 8 : undefined}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingHorizontal: variant === 'text' ? 4 : sz === 'sm' ? 14 : 18,
          borderRadius: 12,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: look.border,
          backgroundColor: look.bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} size={sz === 'sm' ? 16 : 18} color={look.fg} /> : null}
        <AppText
          style={{
            color: look.fg,
            fontFamily: variant === 'text' ? fonts.medium : fonts.semibold,
            fontSize: sz === 'sm' ? size.small : size.body,
            textDecorationLine: variant === 'text' ? 'underline' : 'none',
          }}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  )
}
