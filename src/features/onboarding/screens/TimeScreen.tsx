import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, SelectCard } from '../../../components'
import { useSession } from '../../../state/session'
import { TIMES } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'

/** Horário dos lembretes. A permissão de avisos só é pedida no primeiro lembrete, não aqui. */
export function TimeScreen() {
  const { profile, updateProfile } = useSession()
  const [time, setTime] = useState<string | null>(profile.time)

  return (
    <OnboardingScaffold
      title="Quando você prefere ler e orar?"
      subtitle="Usamos isso para enviar lembretes no momento certo."
      onBack={() => router.back()}
      footer={
        <>
          <Button
            label="Continuar"
            onPress={() => {
              updateProfile({ time })
              router.push('/sua-igreja')
            }}
          />
          <Button label="Pular" variant="text" onPress={() => router.push('/sua-igreja')} style={{ alignSelf: 'center' }} />
        </>
      }
    >
      <View style={{ gap: 8 }}>
        {TIMES.map((t) => (
          <SelectCard key={t.id} kind="radio" label={t.label} description={t.desc} selected={time === t.id} onPress={() => setTime(t.id)} />
        ))}
      </View>
    </OnboardingScaffold>
  )
}
