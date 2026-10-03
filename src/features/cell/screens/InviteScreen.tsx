import * as Clipboard from 'expo-clipboard'
import { router, useLocalSearchParams } from 'expo-router'
import { Linking, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { AppText, Button, Card, Page, SectionLabel, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useCell } from '../CellContext'
import { can } from '../permissions'

export function formatCode(code: string) {
  return `${code.slice(0, 3)}-${code.slice(3)}`
}

export function InviteScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { cell } = useCell()
  const { nova } = useLocalSearchParams<{ nova?: string }>()
  if (!cell || !can(cell.myRole, 'invite')) {
    return (
      <Page title="Convidar pessoas">
        <AppText variant="body">Só o líder convida pessoas para a célula.</AppText>
      </Page>
    )
  }
  const code = formatCode(cell.code)
  const message = `Entre na célula ${cell.name} pelo App Cristão. Abra o app, toque em Célula, Entrar com convite e digite o código ${code}.`

  return (
    <Page title="Convidar pessoas">
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12 }} accessible accessibilityRole="image" accessibilityLabel={`QR code da célula ${cell.name}, com o código ${code}`}>
          <QRCode value={`appcristao://celula/entrar?codigo=${cell.code}`} size={176} color="#000000" backgroundColor="#FFFFFF" />
        </View>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          Mostre este QR code para a pessoa escanear no app
        </AppText>
      </Card>
      <Card style={{ gap: 8 }}>
        <SectionLabel>Código curto</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <AppText accessibilityLabel={`Código ${code.split('').join(' ')}`} style={{ fontFamily: fonts.semibold, fontSize: 28, letterSpacing: 4, color: colors.primary }}>
            {code}
          </AppText>
          <Button
            label="Copiar"
            icon="copy"
            variant="soft"
            size="sm"
            onPress={async () => {
              await Clipboard.setStringAsync(code)
              toast('Código copiado')
            }}
          />
        </View>
        <AppText variant="small" tone="secondary">
          Quem entrar pelo código ou QR code espera a sua aprovação.
        </AppText>
      </Card>
      <Button
        label="Enviar pelo WhatsApp"
        icon="chat"
        onPress={() => {
          toast('Abrindo o WhatsApp')
          Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => toast('Não foi possível abrir o WhatsApp'))
        }}
      />
      {nova ? <Button label="Ir para minha célula" variant="outline" onPress={() => router.dismissTo('/celula')} /> : null}
    </Page>
  )
}
