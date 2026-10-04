import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Chip, SelectCard, Tag } from '../../../components'
import { setItem } from '../../../lib/storage'
import { useSession } from '../../../state/session'
import { fonts } from '../../../theme/typography'
import { TRADITIONS, TRANSLATIONS } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'

export function TraditionScreen() {
  const { profile, updateProfile } = useSession()
  const [trad, setTrad] = useState<string | null>(profile.tradition)
  const [translation, setTranslation] = useState('almeida')

  function next() {
    updateProfile({ tradition: trad })
    setItem('translation', translation)
    router.push('/objetivo')
  }

  return (
    <OnboardingScaffold
      title="Tradição e Bíblia"
      subtitle="Ajuda a personalizar o conteúdo."
      onBack={() => router.back()}
      footer={
        <>
          <Button label="Continuar" onPress={next} />
          <Button label="Pular" variant="text" onPress={() => router.push('/objetivo')} style={{ alignSelf: 'center' }} />
        </>
      }
    >
      <View style={{ gap: 10 }}>
        <AppText variant="body" style={{ fontFamily: fonts.semibold }} accessibilityRole="header">
          Tradução da Bíblia
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRANSLATIONS.filter((t) => t.available).map((t) => (
            <Chip key={t.id} label={t.label} selected={translation === t.id} onPress={() => setTranslation(t.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }} accessible accessibilityLabel={`Em breve: ${TRANSLATIONS.filter((t) => !t.available).map((t) => t.label).join(', ')}`}>
          <AppText variant="small" tone="secondary">
            Em breve:
          </AppText>
          {TRANSLATIONS.filter((t) => !t.available).map((t) => (
            <Tag key={t.id} label={t.label} tone="neutral" />
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <AppText variant="body" style={{ fontFamily: fonts.semibold }} accessibilityRole="header">
          Denominação ou tradição
        </AppText>
        {TRADITIONS.map((t) => (
          <SelectCard key={t} kind="radio" label={t} selected={trad === t} onPress={() => setTrad(t)} />
        ))}
      </View>
    </OnboardingScaffold>
  )
}
