import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Icon, MIN_TOUCH, Page } from '../../components'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'
import { PLAN_NAME, planInfo, type Feature } from './plan'
import { useSubscription } from './SubscriptionContext'

const FEATURE_NAME: Record<Feature, string> = {
  reading_plans: 'Planos de leitura',
  prayer: 'Oração guiada, diário, pedidos e campanhas',
  church: 'Igreja, ministérios e cursos',
  music: 'Música',
  chat: 'Chat bíblico',
  sermon: 'Gravar e transcrever culto',
  cell: 'Célula',
  cell_lead: 'Criar e conduzir célula',
  course_photo: 'Curso pela foto do cronograma',
}

/** Abre a tela de planos já no plano que libera a função. */
export function openPlans(feature?: Feature, minPlan?: string) {
  router.push(minPlan ? (`/assinatura?plano=${minPlan}` as '/assinatura') : '/assinatura')
  void feature
}

/** "No plano Completo": a linha que acompanha o cadeado. */
export function usePlanLine(feature: Feature) {
  const sub = useSubscription()
  return `No plano ${PLAN_NAME[sub.minPlan(feature)]}`
}

/**
 * Cadeado no lugar de um botão ou linha de função bloqueada. Tocar abre a tela de planos.
 * O leitor de tela ouve o nome da função, que está bloqueada e em que plano está.
 */
export function PlanLockRow({ feature, label }: { feature: Feature; label: string }) {
  const { colors } = useTheme()
  const sub = useSubscription()
  const plan = sub.minPlan(feature)
  const line = `No plano ${PLAN_NAME[plan]}`
  return (
    <Pressable
      onPress={() => openPlans(feature, plan)}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Bloqueado. ${line}`}
      accessibilityHint="Abre a tela de planos"
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        backgroundColor: colors.card,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name="lock" size={18} color={colors.textSecondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" style={{ fontFamily: fonts.semibold }}>
          {label}
        </AppText>
        <AppText variant="small" tone="secondary">
          {line}
        </AppText>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textSecondary} />
    </Pressable>
  )
}

/** Botão que vira cadeado quando a função não está no plano. */
export function PlanButton({ feature, label, onPress, variant, icon }: { feature: Feature; label: string; onPress: () => void } & Pick<Parameters<typeof Button>[0], 'variant' | 'icon'>) {
  const sub = useSubscription()
  if (sub.can(feature)) return <Button label={label} onPress={onPress} variant={variant} icon={icon} />
  return <PlanLockRow feature={feature} label={label} />
}

/** Tela inteira de função bloqueada. O que a pessoa criou antes continua guardado. */
export function LockedScreen({ feature, title }: { feature: Feature; title?: string }) {
  const { colors } = useTheme()
  const sub = useSubscription()
  const plan = sub.minPlan(feature)
  const info = planInfo(plan)
  return (
    <Page title={title ?? FEATURE_NAME[feature]} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={30} color={colors.primary} />
        </View>
        <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {FEATURE_NAME[feature]}
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {`No plano ${info.name}, a partir de ${info.prices.monthly.amount} por mês.`}
        </AppText>
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          O que você já criou continua guardado. A Bíblia continua grátis.
        </AppText>
      </View>
      <Button label="Ver planos" onPress={() => openPlans(feature, plan)} />
      <Button label="Voltar" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Page>
  )
}

/** Protege uma tela inteira: sem a função no plano, mostra a tela de bloqueio. */
export function FeatureGuard({ feature, children, title }: { feature: Feature; children: ReactNode; title?: string }) {
  const sub = useSubscription()
  if (!sub.can(feature)) return <LockedScreen feature={feature} title={title} />
  return <>{children}</>
}
