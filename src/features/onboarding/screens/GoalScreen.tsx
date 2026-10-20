import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, SelectCard } from '../../../components'
import { useSession } from '../../../state/session'
import { GOALS, goalList } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'

/** Objetivos: a pessoa marca quantos quiser (QA de 20/10). Ajudam a montar o Hoje e a última tela do cadastro. */
export function GoalScreen() {
  const { profile, updateProfile } = useSession()
  const [goals, setGoals] = useState<string[]>(goalList(profile.goal))
  const toggle = (id: string) => setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))

  return (
    <OnboardingScaffold
      title="O que você quer fazer no acasa?"
      subtitle="Marque quantos quiser."
      step="objetivo"
      onBack={() => router.back()}
      footer={
        <>
          <Button
            label="Continuar"
            disabled={!goals.length}
            accessibilityHint={goals.length ? undefined : 'Marque pelo menos um objetivo para continuar'}
            onPress={() => {
              updateProfile({ goal: goals.join(',') })
              router.push('/celula-inicio')
            }}
          />
          <Button label="Pular" variant="text" onPress={() => router.push('/celula-inicio')} style={{ alignSelf: 'center' }} />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        {GOALS.map((g) => (
          <SelectCard key={g.id} kind="checkbox" label={g.label} description={g.desc} selected={goals.includes(g.id)} onPress={() => toggle(g.id)} />
        ))}
      </View>
    </OnboardingScaffold>
  )
}
