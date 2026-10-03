import type { ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Painel que sobe do rodapé (escolher foto, confirmar, opções). Fecha tocando fora ou no botão voltar do Android. */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
            gap: 12,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 4 }} />
          <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {title}
          </AppText>
          {children}
        </View>
      </View>
    </Modal>
  )
}
