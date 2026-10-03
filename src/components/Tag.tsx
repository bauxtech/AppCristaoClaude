import { View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts } from '../theme/typography'
import { AppText } from './AppText'

export type TagTone = 'primary' | 'accent' | 'danger' | 'neutral' | 'solid'

interface Props {
  label: string
  tone?: TagTone
}

/** Etiqueta curta de estado, como "Em andamento", "Célula", "Inativo". Só leitura. */
export function Tag({ label, tone = 'primary' }: Props) {
  const { colors } = useTheme()
  const look = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    accent: { bg: colors.primarySoft, fg: colors.accent },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.bg, fg: colors.textSecondary },
    solid: { bg: colors.primary, fg: colors.primaryText },
  }[tone]
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: look.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: tone === 'neutral' ? 1 : 0,
        borderColor: colors.line,
      }}
    >
      <AppText style={{ color: look.fg, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>{label}</AppText>
    </View>
  )
}
