import { router } from 'expo-router'
import { IS_REMOTE, sendLoginCode } from '../../../lib/supabase'
import { useRef, useState } from 'react'
import { TextInput, View } from 'react-native'
import { AppText, Button, Chip, TextField } from '../../../components'
import { fonts } from '../../../theme/typography'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingScaffold } from '../OnboardingScaffold'
import { formatPhoneNumber, isValidPhone, onlyDigits } from '../validation'

export function PhoneScreen() {
  const { draft, setDraft } = useOnboarding()
  const [ddd, setDdd] = useState(draft.ddd)
  const [number, setNumber] = useState(formatPhoneNumber(draft.number))
  const [channel, setChannel] = useState(draft.channel)
  const [error, setError] = useState('')
  const numberRef = useRef<TextInput>(null)

  const [sending, setSending] = useState(false)

  async function send() {
    if (!isValidPhone(ddd, number)) {
      setError('Número de celular inválido. Confira o DDD e os 9 dígitos do número.')
      return
    }
    setError('')
    setDraft({ ddd, number: onlyDigits(number), channel })
    if (IS_REMOTE) {
      setSending(true)
      try {
        await sendLoginCode(`+55${onlyDigits(ddd)}${onlyDigits(number)}`, channel === 'whatsapp' ? 'whatsapp' : 'sms')
      } catch {
        setError('Não foi possível enviar o código. Confira a internet e tente de novo.')
        return
      } finally {
        setSending(false)
      }
    }
    router.push('/codigo')
  }

  return (
    <OnboardingScaffold
      title="Seu celular"
      subtitle="Enviamos um código de verificação pelo canal que você escolher."
      step="celular"
      onBack={() => router.back()}
      footer={<Button label={sending ? 'Enviando' : 'Enviar código'} disabled={sending} onPress={send} />}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 96 }}>
          <TextField
            label="DDD"
            value={ddd}
            onChangeText={(v) => {
              const d = onlyDigits(v).slice(0, 2)
              setDdd(d)
              setError('')
              if (d.length === 2) numberRef.current?.focus()
            }}
            keyboardType="number-pad"
            placeholder="11"
            maxLength={2}
            error={error ? ' ' : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            ref={numberRef}
            label="Número"
            value={number}
            onChangeText={(v) => {
              setNumber(formatPhoneNumber(v))
              setError('')
            }}
            keyboardType="number-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="99999-9999"
            error={error ? ' ' : undefined}
          />
        </View>
      </View>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <View style={{ gap: 8 }}>
        <AppText variant="body" style={{ fontFamily: fonts.semibold }}>
          Receber o código por
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="WhatsApp" selected={channel === 'whatsapp'} onPress={() => setChannel('whatsapp')} />
          <Chip label="SMS" selected={channel === 'sms'} onPress={() => setChannel('sms')} />
        </View>
      </View>
    </OnboardingScaffold>
  )
}
