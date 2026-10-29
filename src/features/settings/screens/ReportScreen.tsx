import Constants from 'expo-constants'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Linking, Platform } from 'react-native'
import { AppText, Button, Page, TextField, useToast } from '../../../components'
import { IS_REMOTE, callFunction } from '../../../lib/supabase'

/** Para onde vão os relatos (pedido do Thiago, 22/10). Sem servidor (prévia), abre o e-mail. */
export const REPORT_EMAIL = 'oi@acasa.app.br'
const APP_VERSION = Constants.expoConfig?.version ?? ''

/** Abre a tela de reportar, levando a tela onde a pessoa estava. */
export function openReport(screen?: string) {
  router.push({ pathname: '/configuracoes/reportar', params: screen ? { tela: screen } : {} })
}

function deviceLabel() {
  const c = Platform.constants as { Model?: string; Manufacturer?: string } | undefined
  const model = [c?.Manufacturer, c?.Model].filter(Boolean).join(' ')
  return `${model ? `${model}, ` : ''}${Platform.OS} ${String(Platform.Version)}`
}

/** Manda um relato pronto, sem passar pela tela (ex.: os detalhes técnicos de uma compra que não terminou). */
export async function sendReport(message: string, screen: string) {
  if (!IS_REMOTE) return false
  try {
    const r = await callFunction<{ kind: string }>('report-problem', { message: message.slice(0, 2000), screen, appVersion: APP_VERSION, platform: Platform.OS, device: deviceLabel() })
    return r?.kind === 'ok'
  } catch {
    return false
  }
}

/**
 * Reportar um problema: a pessoa escreve, o servidor guarda e avisa a equipe por e-mail.
 * A versão do app, o celular e a tela vão junto, para achar o erro.
 */
export function ReportScreen() {
  const toast = useToast()
  const { tela } = useLocalSearchParams<{ tela?: string }>()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    setError('')
    if (!IS_REMOTE) {
      const url = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent('Problema no app')}&body=${encodeURIComponent(`${text.trim()}\n\nacasa ${APP_VERSION}, ${deviceLabel()}`)}`
      await Linking.openURL(url).catch(() => setError(`Não achamos um app de e-mail neste celular. Escreva para ${REPORT_EMAIL}.`))
      return
    }
    setBusy(true)
    const r = await callFunction<{ kind: string }>('report-problem', {
      message: text.trim(),
      screen: tela ?? null,
      appVersion: APP_VERSION,
      platform: Platform.OS,
      device: deviceLabel(),
    }).catch(() => null)
    setBusy(false)
    if (r?.kind === 'ok') {
      toast('Recebemos. Obrigado por avisar.')
      router.back()
    } else if (r?.kind === 'limit') setError(`Você já mandou 5 relatos hoje. Tente amanhã ou escreva para ${REPORT_EMAIL}.`)
    else setError(`Não foi possível enviar. Confira a internet e tente de novo, ou escreva para ${REPORT_EMAIL}.`)
  }

  return (
    <Page title="Reportar um problema">
      <AppText variant="body" tone="secondary">
        Conte o que aconteceu e o que você estava fazendo. A equipe do acasa lê cada relato.
      </AppText>
      <TextField
        label="O que aconteceu?"
        value={text}
        onChangeText={(v) => setText(v.slice(0, 2000))}
        multiline
        placeholder="Ex.: Toquei em Ouvir e o áudio não começou."
        hint="Não precisa colocar pedidos de oração nem outros dados pessoais."
      />
      <AppText variant="small" tone="secondary">
        Junto vão a versão do app, o modelo do celular e a tela onde você estava.
      </AppText>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button label={busy ? 'Enviando' : 'Enviar'} busy={busy} disabled={!text.trim() || busy} onPress={() => void send()} />
    </Page>
  )
}
