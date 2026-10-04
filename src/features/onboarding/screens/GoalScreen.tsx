import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, SelectCard } from '../../../components'
import { useSession } from '../../../state/session'
import { GOALS } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'

export function GoalScreen() {
  const { profile, updateProfile } = useSession()
  const [goal, setGoal] = useState<string | null>(profile.goal)

  return (
    <OnboardingScaffold
      title="Qual é o seu objetivo principal?"
      subtitle="Você pode ter mais de um, mas escolha o mais importante agora."
      step="objetivo"
      onBack={() => router.back()}
      footer={
        <Button
          label="Continuar"
          disabled={!goal}
          accessibilityHint={goal ? undefined : 'Escolha um objetivo para continuar'}
          onPress={() => {
            updateProfile({ goal })
            router.push('/horario')
          }}
        />
      }
    >
      <View style={{ gap: 12 }}>
        {GOALS.map((g) => (
          <SelectCard key={g.id} kind="radio" label={g.label} description={g.desc} selected={goal === g.id} onPress={() => setGoal(g.id)} />
        ))}
      </View>
    </OnboardingScaffold>
  )
}
