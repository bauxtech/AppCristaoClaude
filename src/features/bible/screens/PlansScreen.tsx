import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Page, ProgressBar, SectionLabel, Tag, TapCard } from '../../../components'
import { useBible } from '../BibleContext'
import { planState, type PlanDef } from '../plans'

export function StatusTags({ plan }: { plan: PlanDef }) {
  const { activePlanId, progress } = useBible()
  const s = planState(plan, progress[plan.id])
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {plan.custom ? <Tag label="Meu plano" tone="neutral" /> : null}
      {s.status === 'done' ? <Tag label="Concluído" /> : null}
      {activePlanId === plan.id && s.status !== 'done' ? <Tag label="Em andamento" /> : null}
      {s.status === 'behind' ? <Tag label={`${s.behind} ${s.behind === 1 ? 'dia' : 'dias'} atrasado`} tone="danger" /> : null}
    </View>
  )
}

function PlanCard({ plan }: { plan: PlanDef }) {
  const { progress } = useBible()
  const s = planState(plan, progress[plan.id])
  const started = !!progress[plan.id]
  return (
    <TapCard
      label={`${plan.name}, ${plan.total} dias${started ? `, dia ${s.day} de ${s.total}${s.status === 'behind' ? `, ${s.behind} dias atrasado` : ''}${s.status === 'done' ? ', concluído' : ''}` : ''}`}
      onPress={() => router.push(`/biblia/plano/${plan.id}`)}
    >
      <StatusTags plan={plan} />
      <AppText variant="bodyStrong">{plan.name}</AppText>
      <AppText variant="small" tone="secondary">{`${plan.total} dias`}</AppText>
      {started && s.status !== 'done' ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          <ProgressBar value={s.done} max={s.total} label={`${s.done} de ${s.total} dias lidos`} />
          <AppText variant="small" tone="secondary">{`Dia ${s.day} · ${Math.round((s.done / s.total) * 100)}% concluído`}</AppText>
        </View>
      ) : null}
    </TapCard>
  )
}

export function PlansScreen() {
  const { plans, progress } = useBible()
  const mine = plans.filter((p) => progress[p.id] || p.custom)
  const catalog = plans.filter((p) => !p.custom && !progress[p.id])
  return (
    <Page title="Planos de leitura">
      <Button label="Criar meu plano" icon="plus" onPress={() => router.push('/biblia/plano-novo')} />
      <SectionLabel>Meus planos</SectionLabel>
      {mine.length === 0 ? (
        <AppText variant="body" tone="secondary">
          Você ainda não começou nenhum plano. Escolha um abaixo ou crie o seu.
        </AppText>
      ) : (
        mine.map((p) => <PlanCard key={p.id} plan={p} />)
      )}
      {catalog.length ? <SectionLabel>Planos do app</SectionLabel> : null}
      {catalog.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </Page>
  )
}
