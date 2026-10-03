import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { Icon, type IconName } from './Icon'
import { MIN_TOUCH } from './Button'
import { fonts } from '../theme/typography'

interface Props {
  icon: IconName
  /** Nome falado pelo leitor de tela. Obrigatório: o botão não tem texto visível. */
  label: string
  onPress: () => void
  color?: string
  badge?: number
  accessibilityHint?: string
}

export function IconButton({ icon, label, onPress, color, badge, accessibilityHint }: Props) {
  const { colors } = useTheme()
  const spoken = badge ? `${label}, ${badge} ${badge === 1 ? 'nova' : 'novas'}` : label
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={22} color={color ?? colors.text} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Tamanho fixo para caber no selo; o número também vai no nome falado. */}
          <BadgeText value={badge} color={colors.dangerText} />
        </View>
      ) : null}
    </Pressable>
  )
}

function BadgeText({ value, color }: { value: number; color: string }) {
  return (
    <Text allowFontScaling={false} style={{ color, fontFamily: fonts.bold, fontSize: 10, lineHeight: 12 }}>
      {value > 9 ? '9+' : value}
    </Text>
  )
}
