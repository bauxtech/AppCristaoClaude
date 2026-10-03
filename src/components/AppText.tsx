import { Text, type TextProps, type TextStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts, maxFontScale, size } from '../theme/typography'

type Variant = 'screenTitle' | 'title' | 'body' | 'bodyStrong' | 'small' | 'label' | 'bible' | 'bibleRef'
type Tone = 'primary' | 'secondary' | 'accent' | 'danger' | 'brand' | 'onPrimary'

interface Props extends TextProps {
  variant?: Variant
  tone?: Tone
}

const variants: Record<Variant, TextStyle> = {
  screenTitle: { fontFamily: fonts.semibold, fontSize: size.screenTitle, lineHeight: 32 },
  title: { fontFamily: fonts.semibold, fontSize: size.title, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: size.body, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: size.body, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: size.small, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: size.label, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  bible: { fontFamily: fonts.bibleItalic, fontSize: size.bible, lineHeight: 31 },
  bibleRef: { fontFamily: fonts.bible, fontSize: size.small, lineHeight: 20 },
}

export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const { colors } = useTheme()
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    accent: colors.accent,
    danger: colors.danger,
    brand: colors.primary,
    onPrimary: colors.primaryText,
  }[tone]
  return <Text maxFontSizeMultiplier={maxFontScale} style={[variants[variant], { color }, style]} {...rest} />
}
