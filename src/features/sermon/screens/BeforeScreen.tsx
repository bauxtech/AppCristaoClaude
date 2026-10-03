import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, View } from 'react-native'
import { AppText, Button, Card, Page, Switch, TextField } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { useChurch } from '../../church/ChurchContext'
import { AUDIO_DAYS, MONTHLY_LIMIT, usedThisMonth } from '../data'
import { useSermons } from '../SermonContext'
import { UsageCard } from './ListScreen'

/** Antes de gravar: aviso de uso pessoal, igreja, limite do mês, guardar áudio e permissão do microfone. */
export function BeforeScreen() {
  const { colors } = useTheme()
  const { main } = useChurch()
  const { sermons, setDraft } = useSermons()
  const [church, setChurch] = useState(main?.name ?? '')
  const [keepAudio, setKeepAudio] = useState(false)
  const [perm, setPerm] = useState<'ask' | 'explain' | 'denied'>('ask')
  const full = usedThisMonth(sermons) >= MONTHLY_LIMIT

  async function start() {
    const current = await getRecordingPermissionsAsync()
    if (!current.granted && perm === 'ask') return setPerm(current.canAskAgain ? 'explain' : 'denied')
    const res = current.granted ? current : await requestRecordingPermissionsAsync()
    if (!res.granted) return setPerm('denied')
    setDraft({ uri: null, durationSec: 0, notes: [], moments: [], keepAudio, source: 'gravado', church: church.trim() })
    router.replace('/culto/ao-vivo')
  }

  if (perm === 'explain' || perm === 'denied') {
    return (
      <Page title={perm === 'denied' ? 'Microfone negado' : 'Acesso ao microfone'} onBack={() => setPerm('ask')}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: perm === 'denied' ? colors.dangerSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mic" size={28} color={perm === 'denied' ? colors.danger : colors.primary} />
          </View>
          <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {perm === 'denied' ? 'O microfone está desligado para o app' : 'O app precisa do microfone'}
          </AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            {perm === 'denied'
              ? 'Para gravar, ligue o microfone nos ajustes do celular, em Privacidade, Microfone.'
              : 'O microfone grava a pregação para transformar em texto. A gravação continua com a tela bloqueada.'}
          </AppText>
        </View>
        {perm === 'denied' ? <Button label="Abrir ajustes do celular" onPress={() => Linking.openSettings()} /> : <Button label="Permitir microfone" onPress={start} />}
        <Button label="Agora não" variant="text" onPress={() => setPerm('ask')} />
      </Page>
    )
  }

  return (
    <Page title="Gravar culto">
      <Card style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
        <Icon name="info" size={18} color={colors.primary} />
        <AppText variant="body" style={{ flex: 1 }}>
          A gravação é para uso pessoal. Respeite as orientações da sua igreja sobre gravar o culto.
        </AppText>
      </Card>
      <UsageCard />
      <TextField label="Igreja" value={church} onChangeText={setChurch} placeholder="Ex.: Igreja Batista Central" maxLength={100} hint={main ? undefined : 'Você ainda não vinculou uma igreja. Pode escrever o nome aqui.'} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Guardar o áudio</AppText>
          <AppText variant="small" tone="secondary">
            {keepAudio ? `O áudio fica ${AUDIO_DAYS} dias. O texto fica para sempre.` : 'Desligado: fica só o texto, e o áudio é apagado depois da transcrição.'}
          </AppText>
        </View>
        <Switch label="Guardar o áudio por 30 dias" value={keepAudio} onChange={setKeepAudio} />
      </Card>
      <Button label="Começar a gravar" icon="mic" disabled={full} onPress={start} />
      {full ? <AppText variant="small" tone="danger">Você já usou os 5 cultos deste mês.</AppText> : null}
    </Page>
  )
}
