import { router } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, CoverGrid, Page, SectionLabel, Tag, useGridItemWidth } from '../../../components'
import { PlanCover } from '../../home/HomeSections'
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

export function PlansScreen() {
  const { plans, progress } = useBible()
  const width = useGridItemWidth()
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
        <CoverGrid>
          {mine.map((p) => (
            <PlanCover key={p.id} plan={p} width={width} mine />
          ))}
        </CoverGrid>
      )}
      {catalog.length ? <SectionLabel>Planos do app</SectionLabel> : null}
      <CoverGrid>
        {catalog.map((p) => (
          <PlanCover key={p.id} plan={p} width={width} />
        ))}
      </CoverGrid>
    </Page>
  )
}
