import { router } from 'expo-router'
import { hasProfileName, IS_REMOTE, sendLoginCode, verifyLoginCode } from '../../../lib/supabase'
import { configureStore } from '../../../lib/store'
import { useEffect, useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { AppText, Button, Card, useToast } from '../../../components'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { DEMO_CODES, DEMO_EXISTING_PHONE } from '../data'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { checkCode, CODE_MESSAGES, formatPhoneNumber, onlyDigits } from '../validation'

const RESEND_SECONDS = 30

export function CodeScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { draft, setDraft } = useOnboarding()
  const { updateProfile, finishOnboarding } = useSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [noAccount, setNoAccount] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const phoneLabel = `+55 (${draft.ddd}) ${formatPhoneNumber(draft.number)}`
  const channel = draft.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'
  const e164 = `+55${draft.ddd}${draft.number}`

  async function verifyRemote() {
    if (onlyDigits(code).length < 6) return setError('Digite os 6 números do código.')
    try {
      const uid = await verifyLoginCode(e164, onlyDigits(code))
      if (!uid) throw new Error('sem usuário')
      setError('')
      configureStore(uid)
      updateProfile({ phone: phoneLabel })
      afterCode(await hasProfileName(uid))
    } catch {
      // O servidor limita as tentativas. A mensagem não diz se o número existe.
      setError(CODE_MESSAGES.wrong)
    }
  }

  function verify() {
    if (IS_REMOTE) return void verifyRemote()
    const result = checkCode(code, DEMO_CODES)
    if (result === 'incomplete') {
      setError('Digite os 6 números do código.')
      return
    }
    if (result !== 'ok') {
      setError(CODE_MESSAGES[result])
      return
    }
    setError('')
    updateProfile({ phone: phoneLabel })
    const existing = draft.ddd === DEMO_EXISTING_PHONE.ddd && draft.number === DEMO_EXISTING_PHONE.number
    if (existing && !IS_REMOTE) updateProfile({ name: DEMO_EXISTING_PHONE.name })
    afterCode(existing)
  }

  /** Entrar: quem tem conta vai direto para o Hoje. Criar conta: segue o cadastro. */
  function afterCode(existing: boolean) {
    if (draft.mode === 'login') {
      if (existing) {
        finishOnboarding()
        router.replace('/')
      } else setNoAccount(true)
      return
    }
    router.push(existing ? '/bem-vindo-de-volta' : '/termos')
  }

  function resend() {
    setCountdown(RESEND_SECONDS)
    setError('')
    if (IS_REMOTE) sendLoginCode(e164, draft.channel === 'whatsapp' ? 'whatsapp' : 'sms').catch(() => setError('Não foi possível reenviar. Tente de novo.'))
    toast('Código reenviado')
  }

  const digits = onlyDigits(code).padEnd(6, ' ').split('')

  return (
    <OnboardingScaffold
      title="Código enviado"
      subtitle={`Enviamos um código de 6 números para ${phoneLabel} pelo ${channel}.`}
      onBack={() => router.back()}
      footer={<Button label="Verificar" onPress={verify} />}
    >
      {noAccount ? (
        <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">Não há conta com este número</AppText>
          <AppText variant="small" tone="secondary">
            Confira o número ou crie uma conta nova com ele.
          </AppText>
          <Button
            label="Criar conta com este número"
            size="sm"
            onPress={() => {
              setDraft({ mode: 'create' })
              router.push('/termos')
            }}
          />
          <Button label="Corrigir o número" variant="text" size="sm" onPress={() => router.back()} />
        </Card>
      ) : null}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {digits.map((d, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: 52,
                height: 56,
                borderRadius: 12,
                borderWidth: d.trim() || error ? 2 : 1,
                borderColor: error ? colors.danger : d.trim() ? colors.primary : colors.lineStrong,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 }}>{d.trim()}</AppText>
            </View>
          ))}
        </View>
        {/* Campo real, transparente por cima dos quadrados: aceita colar e o preenchimento automático do SMS. */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(v) => {
            setCode(onlyDigits(v).slice(0, 6))
            setError('')
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          autoFocus
          caretHidden
          accessibilityLabel="Código de 6 números"
          accessibilityHint={error || undefined}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' }}
        />
      </View>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Button label={countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar código'} variant="text" onPress={resend} disabled={countdown > 0} />
        {IS_REMOTE ? null : (
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            {`Na prévia, use ${DEMO_CODES.ok} para entrar.`}
          </AppText>
        )}
      </View>
    </OnboardingScaffold>
  )
}
