import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { AppText, ProgressBar, Tag, TopBar } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useBible } from '../BibleContext'
import { PLANS, planStatus } from '../plans'

export function StatusTags({ id }: { id: string }) {
  const plan = PLANS.find((p) => p.id === id)!
  const { activePlanId } = useBible()
  const s = planStatus(plan)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {s === 'done' ? <Tag label="Concluído" /> : null}
      {activePlanId === id && s !== 'done' ? <Tag label="Em andamento" /> : null}
      {s === 'behind' ? <Tag label={`${plan.behind} dias atrasado`} tone="danger" /> : null}
    </View>
  )
}

export function PlansScreen() {
  const { colors } = useTheme()
  const { activePlanId } = useBible()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Planos de leitura" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        {PLANS.map((p) => {
          const active = activePlanId === p.id
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/biblia/plano/${p.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.total} dias${active ? `, em andamento, dia ${p.day}` : ''}`}
              style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: 16, borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.line, padding: 18, gap: 8, opacity: pressed ? 0.85 : 1 })}
            >
              <StatusTags id={p.id} />
              <AppText variant="bodyStrong">{p.name}</AppText>
              <AppText variant="small" tone="secondary">{`${p.total} dias`}</AppText>
              {active && p.day < p.total ? (
                <>
                  <ProgressBar value={p.day} max={p.total} label={`Dia ${p.day} de ${p.total}`} />
                  <AppText variant="small" tone="secondary">{`Dia ${p.day} · ${Math.round((p.day / p.total) * 100)}% concluído`}</AppText>
                </>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
