import { Pressable, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { fonts, size } from '../theme/typography'
import { AppText } from './AppText'
import { MIN_TOUCH } from './Button'

interface Props<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  /** Nome do grupo para o leitor de tela, por exemplo "Testamento". */
  label: string
}

/** Alternância entre duas ou três opções (Antigo/Novo Testamento, Sozinho/Com a célula). */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: colors.line, borderRadius: 12, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const selected = o.id === value
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH - 8,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: selected ? colors.card : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.lineStrong,
            }}
          >
            <AppText style={{ fontFamily: fonts.semibold, fontSize: size.small, color: selected ? colors.primary : colors.textSecondary, textAlign: 'center' }}>{o.label}</AppText>
          </Pressable>
        )
      })}
    </View>
  )
}
