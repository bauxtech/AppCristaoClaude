import { router } from 'expo-router'
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

  function send() {
    if (!isValidPhone(ddd, number)) {
      setError('Número de celular inválido. Confira o DDD e os 9 dígitos do número.')
      return
    }
    setError('')
    setDraft({ ddd, number: onlyDigits(number), channel })
    router.push('/codigo')
  }

  return (
    <OnboardingScaffold
      title="Seu celular"
      subtitle="Enviamos um código de verificação pelo canal que você escolher."
      step="celular"
      onBack={() => router.back()}
      footer={<Button label="Enviar código" onPress={send} />}
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
