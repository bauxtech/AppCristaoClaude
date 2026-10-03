import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppText, Button, Card, ProgressBar, Segmented, TopBar, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useSession } from '../../../state/session'
import { useBible } from '../BibleContext'
import { slugify } from '../books'
import { planById, planStatus } from '../plans'
import { NotFound } from './NotFound'
import { StatusTags } from './PlansScreen'

export function PlanDetailScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activePlanId, setActivePlan } = useBible()
  const { cellStatus } = useSession()
  const [mode, setMode] = useState<'solo' | 'cell'>('solo')
  const plan = planById(String(id))
  if (!plan) return <NotFound />
  const status = planStatus(plan)
  const pct = Math.round((plan.day / plan.total) * 100)
  const openToday = () => router.push(`/biblia/${slugify(plan.todayRef.book)}/${plan.todayRef.chapter}`)
  const hasCell = cellStatus === 'member' || cellStatus === 'leader'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={plan.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        <StatusTags id={plan.id} />
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="bodyStrong">Progresso</AppText>
            <AppText variant="bodyStrong" tone="brand">{`${pct}%`}</AppText>
          </View>
          <ProgressBar value={plan.day} max={plan.total} label={`Dia ${plan.day} de ${plan.total}`} />
          <AppText variant="small" tone="secondary">{`Dia ${plan.day} de ${plan.total}`}</AppText>
        </Card>
        {status !== 'done' ? (
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 4 }}>
            <AppText variant="label" tone="brand">
              Leitura de hoje
            </AppText>
            <AppText variant="bodyStrong">{plan.todayReading}</AppText>
          </Card>
        ) : (
          <Card style={{ gap: 4 }}>
            <AppText variant="bodyStrong">Plano concluído</AppText>
            <AppText variant="body" tone="secondary">
              Você leu todos os dias deste plano.
            </AppText>
          </Card>
        )}
        {status !== 'done' ? (
          <>
            <AppText variant="label" tone="secondary">
              Como ler
            </AppText>
            <Segmented
              label="Como ler"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'solo', label: 'Sozinho' },
                { id: 'cell', label: 'Com a célula' },
              ]}
            />
            {mode === 'cell' && !hasCell ? (
              <AppText variant="small" tone="secondary">
                Para ler com a célula, entre numa célula primeiro.
              </AppText>
            ) : null}
            {status === 'behind' ? (
              <Button
                label="Retomar de onde parei"
                onPress={() => {
                  toast('Plano ajustado a partir de hoje')
                  openToday()
                }}
              />
            ) : null}
            <Button
              label={activePlanId === plan.id ? 'Continuar leitura' : 'Começar plano'}
              variant={status === 'behind' ? 'outline' : 'primary'}
              onPress={() => {
                if (activePlanId !== plan.id) {
                  setActivePlan(plan.id)
                  toast('Plano iniciado')
                }
                openToday()
              }}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
