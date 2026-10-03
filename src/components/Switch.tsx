import { Pressable, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { Icon } from './Icon'
import { MIN_TOUCH } from './Button'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  /** Nome falado pelo leitor de tela, por exemplo "Compartilhar com a célula". */
  label: string
  disabled?: boolean
}

/**
 * Chave liga/desliga no desenho do protótipo (trilho 48x28).
 * Ligada mostra um visto dentro da bolinha, para não depender só da cor.
 */
export function Switch({ value, onChange, label, disabled }: Props) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          backgroundColor: value ? colors.primary : colors.lineStrong,
          padding: 3,
          alignItems: value ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.darkSurface, alignItems: 'center', justifyContent: 'center' }}>
          {value ? <Icon name="check" size={14} color={colors.darkSurface} strokeWidth={3} /> : null}
        </View>
      </View>
    </Pressable>
  )
}
