import { Pressable } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts, size } from '../theme/typography'
import { AppText } from './AppText'
import { Icon } from './Icon'
import { MIN_TOUCH } from './Button'

interface Props {
  label: string
  selected: boolean
  onPress: () => void
}

/** Opção selecionável em formato de pílula, como os humores do Hoje. Selecionada ganha um visto. */
export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.lineStrong,
        backgroundColor: selected ? colors.primarySoft : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {selected ? <Icon name="check" size={14} color={colors.primary} strokeWidth={3} /> : null}
      <AppText style={{ fontFamily: fonts.medium, fontSize: size.small, color: selected ? colors.primary : colors.textSecondary }}>{label}</AppText>
    </Pressable>
  )
}
