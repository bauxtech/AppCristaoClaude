import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { IconButton } from './IconButton'
import { backFromJump } from '../lib/nav'

interface Props {
  title: string
  onBack?: () => void
  right?: ReactNode
}

/** Barra de topo das telas internas: voltar, título e ações à direita. */
export function TopBar({ title, onBack, right }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        paddingTop: insets.top + 4,
        paddingBottom: 4,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: colors.bg,
      }}
    >
      {/* Depois de um salto de outra aba, o Voltar leva de volta para a tela de origem. */}
      {onBack ? <IconButton icon="chevronLeft" label="Voltar" onPress={() => backFromJump() || onBack()} /> : <View style={{ width: 12 }} />}
      <AppText variant="title" accessibilityRole="header" style={{ flex: 1, paddingHorizontal: 4 }} numberOfLines={2}>
        {title}
      </AppText>
      {right}
    </View>
  )
}
