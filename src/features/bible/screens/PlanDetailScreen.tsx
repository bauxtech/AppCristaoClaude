import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, ConfirmCard, CoverArt, coverStyle, Page, ProgressBar, Segmented, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useSession } from '../../../state/session'
import { useBible } from '../BibleContext'
import { slugify } from '../books'
import { planState, readingLabel } from '../plans'
import { NotFound } from './NotFound'
import { StatusTags } from './PlansScreen'

export function PlanDetailScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()
  const bible = useBible()
  const { cellStatus } = useSession()
  const [mode, setMode] = useState<'solo' | 'cell'>('solo')
  const [confirm, setConfirm] = useState<'stop' | 'delete' | null>(null)
  const plan = bible.planDef(String(id))
  if (!plan) return <NotFound />
  const started = !!bible.progress[plan.id]
  const s = planState(plan, bible.progress[plan.id])
  const pct = Math.round((s.done / s.total) * 100)
  const hasCell = cellStatus === 'member' || cellStatus === 'leader'

  return (
    <Page title={plan.name}>
      <CoverArt title={plan.name} large {...coverStyle(plan.id)} />
      <StatusTags plan={plan} />
      <AppText variant="small" tone="secondary">{`${plan.total} dias · ${plan.books.length === 1 ? plan.books[0] : `${plan.books[0]} a ${plan.books[plan.books.length - 1]}`}`}</AppText>
      {started ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="bodyStrong">Progresso</AppText>
            <AppText variant="bodyStrong" tone="brand">{`${pct}%`}</AppText>
          </View>
          <ProgressBar value={s.done} max={s.total} label={`${s.done} de ${s.total} dias lidos`} />
          <AppText variant="small" tone="secondary">{`${s.done} de ${s.total} dias lidos`}</AppText>
        </Card>
      ) : null}
      {s.status !== 'done' ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 8 }}>
          <AppText variant="label" tone="brand">
            {started ? `LEITURA DO DIA ${s.day}` : 'PRIMEIRO DIA'}
          </AppText>
          <AppText variant="bodyStrong">{s.todayLabel}</AppText>
          {started ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {s.today.map((r) => (
                <Button key={r.book + r.from} label={`Abrir ${r.book} ${r.from}`} variant="outline" size="sm" onPress={() => router.push(`/biblia/${slugify(r.book)}/${r.from}`)} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : (
        <Card style={{ gap: 4 }}>
          <AppText variant="bodyStrong">Plano concluído</AppText>
          <AppText variant="body" tone="secondary">
            Você leu todos os dias deste plano.
          </AppText>
        </Card>
      )}

      {!started ? (
        <>
          <Segmented label="Como ler" value={mode} onChange={setMode} options={[{ id: 'solo', label: 'Sozinho' }, { id: 'cell', label: 'Com a célula' }]} />
          {mode === 'cell' ? (
            <AppText variant="small" tone="secondary">
              {hasCell ? 'O líder escolhe o plano da célula em Célula, Plano de leitura.' : 'Para ler com a célula, entre numa célula primeiro.'}
            </AppText>
          ) : null}
          <Button
            label="Começar plano"
            disabled={mode === 'cell'}
            onPress={() => {
              bible.startPlan(plan.id)
              toast('Plano iniciado')
            }}
          />
        </>
      ) : s.status !== 'done' ? (
        <>
          {s.status === 'behind' ? (
            <Button
              label="Retomar de onde parei"
              onPress={() => {
                bible.resumePlan(plan.id)
                toast('Plano ajustado a partir de hoje')
              }}
            />
          ) : null}
          <Button
            label={`Marcar dia ${s.day} como lido`}
            icon="check"
            variant={s.status === 'behind' ? 'outline' : 'primary'}
            onPress={() => {
              bible.markPlanDay(plan.id)
              toast(`Dia ${s.day} lido: ${readingLabel(s.today)}`)
            }}
          />
          {bible.activePlanId !== plan.id ? <Button label="Mostrar este plano no Hoje" variant="text" onPress={() => bible.setActivePlan(plan.id)} /> : null}
        </>
      ) : null}

      {started && confirm !== 'stop' ? <Button label="Parar este plano" variant="text" onPress={() => setConfirm('stop')} /> : null}
      {confirm === 'stop' ? (
        <ConfirmCard
          title="Parar este plano?"
          message="O progresso do plano é apagado. Os capítulos que você leu continuam marcados na Bíblia."
          confirmLabel="Parar"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            bible.stopPlan(plan.id)
            setConfirm(null)
            toast('Plano parado')
          }}
        />
      ) : null}
      {plan.custom && confirm !== 'delete' ? <Button label="Apagar meu plano" variant="dangerSoft" onPress={() => setConfirm('delete')} /> : null}
      {confirm === 'delete' ? (
        <ConfirmCard
          title={`Apagar ${plan.name}?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            bible.deletePlan(plan.id)
            toast('Plano apagado')
            router.back()
          }}
        />
      ) : null}
    </Page>
  )
}
