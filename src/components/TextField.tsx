import { forwardRef, useState } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts, maxFontScale, size } from '../theme/typography'
import { AppText } from './AppText'

interface Props extends Omit<TextInputProps, 'style'> {
  /** Rótulo visível acima do campo. Também é o nome falado pelo leitor de tela. */
  label: string
  /** Mensagem de erro abaixo do campo. Vem com texto, não só com a borda vermelha. */
  error?: string
  hint?: string
  multiline?: boolean
}

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, multiline, ...rest }, ref) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="small" style={{ fontFamily: fonts.semibold, color: colors.text }}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textSecondary}
        maxFontSizeMultiplier={maxFontScale}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          rest.onBlur?.(e)
        }}
        style={{
          minHeight: multiline ? 120 : 52,
          borderRadius: 16,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.lineStrong,
          backgroundColor: colors.card,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 14 : 0,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: size.body,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  )
})
