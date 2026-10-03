import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button, Card, Icon, Page, SectionLabel, Segmented, Sheet, useToast } from '../../../components'
import { IS_PREVIEW } from '../../../lib/preview'
import { openStoreSubscriptions, simulateStorePurchase, STORE_NAME } from '../../../lib/store'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { longDate } from '../../settings/screens/AccountScreens'
import { FEATURES, nextCharge, PRICES, TRIAL_DAYS, type Billing, type PreviewSub } from '../plan'
import { useSubscription } from '../SubscriptionContext'

function FeatureList() {
  const { colors } = useTheme()
  return (
    <View style={{ gap: 10 }}>
      {FEATURES.map((f) => (
        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={13} color={colors.primary} strokeWidth={3} />
          </View>
          <AppText variant="body" style={{ flex: 1 }}>
            {f}
          </AppText>
        </View>
      ))}
    </View>
  )
}

function BillingPicker({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  return (
    <Segmented<Billing>
      label="Período"
      value={value}
      onChange={onChange}
      options={[
        { id: 'annual', label: 'Anual' },
        { id: 'monthly', label: 'Mensal' },
      ]}
    />
  )
}

function PriceCard({ billing }: { billing: Billing }) {
  const { colors } = useTheme()
  const p = PRICES[billing]
  return (
    <View style={{ borderWidth: 2, borderColor: colors.primary, borderRadius: 20, padding: 20, gap: 4 }} accessible accessibilityLabel={`Plano ${p.label}, ${p.amount} ${p.per}`}>
      <AppText variant="small" tone="secondary" style={{ fontFamily: fonts.semibold }}>
        {`Plano ${p.label}`}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 32, color: colors.text }}>{p.amount}</AppText>
        <AppText variant="body" tone="secondary" style={{ paddingBottom: 4 }}>
          {p.per}
        </AppText>
      </View>
    </View>
  )
}

/** Folha de exemplo. Na loja de verdade, quem desenha esta folha é a Apple ou o Google. */
export function StoreSheet({ billing, visible, onCancel, onConfirm }: { billing: Billing; visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { colors } = useTheme()
  const [busy, setBusy] = useState(false)
  const p = PRICES[billing]
  return (
    <Sheet visible={visible} onClose={onCancel} title="Confirmar assinatura">
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="body">{`Plano ${p.label}`}</AppText>
          <AppText variant="bodyStrong">{p.amount}</AppText>
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <AppText variant="small" tone="secondary">
          {`Cobrado ${p.per} automaticamente. Cancele a qualquer momento nas configurações da sua conta na loja.`}
        </AppText>
      </Card>
      <AppText variant="small" tone="secondary">
        {`Pagamento pela ${STORE_NAME}. Seus dados de pagamento já estão na loja.`}
      </AppText>
      <AppText variant="label" tone="secondary">
        Exemplo da folha da loja. A compra de verdade entra com a integração da loja.
      </AppText>
      {!IS_PREVIEW ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          A compra pela loja ainda não está ligada neste app.
        </AppText>
      ) : null}
      <Button
        label={busy ? 'Processando' : 'Confirmar assinatura'}
        // Fora da prévia, a folha de exemplo não libera o plano sem cobrança.
        disabled={busy || !IS_PREVIEW}
        onPress={() => {
          setBusy(true)
          setTimeout(() => {
            setBusy(false)
            onConfirm()
          }, 800)
        }}
      />
      <Button label="Cancelar" variant="outline" disabled={busy} onPress={onCancel} />
    </Sheet>
  )
}

function useRestore() {
  const toast = useToast()
  const sub = useSubscription()
  return async () => {
    const ok = await sub.restore()
    toast(ok ? 'Compra restaurada' : 'Nenhuma compra encontrada para restaurar')
    if (ok) router.replace('/eu')
  }
}

function LegalLinks() {
  const restore = useRestore()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button label="Restaurar compra" variant="text" size="sm" onPress={restore} />
      <Button label="Termos de Uso" variant="text" size="sm" onPress={() => router.push('/termos-completos')} />
      <Button label="Privacidade" variant="text" size="sm" onPress={() => router.push('/dados-de-fe')} />
    </View>
  )
}

/** Tela de planos: o que inclui, mensal ou anual e um botão só. */
export function PlansScreen() {
  const { colors } = useTheme()
  const sub = useSubscription()
  const [billing, setBilling] = useState<Billing>('annual')
  const [sheet, setSheet] = useState(false)
  return (
    <Page title="Assinar">
      <View style={{ backgroundColor: colors.primarySoft, borderRadius: 20, padding: 20, alignItems: 'center', gap: 4 }}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.primary }}>App Cristão</AppText>
        <AppText variant="body" style={{ textAlign: 'center' }}>
          Um plano, acesso completo a tudo
        </AppText>
      </View>
      {sub.status === 'trial' ? (
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          {sub.daysLeft === 1 ? 'Hoje é o último dia do seu teste.' : `Faltam ${sub.daysLeft} dias do seu teste.`}
        </AppText>
      ) : null}
      <BillingPicker value={billing} onChange={setBilling} />
      <PriceCard billing={billing} />
      <SectionLabel>O que está incluído</SectionLabel>
      <FeatureList />
      <Button label="Assinar" onPress={() => setSheet(true)} />
      <LegalLinks />
      <StoreSheet
        billing={billing}
        visible={sheet}
        onCancel={() => setSheet(false)}
        onConfirm={() => {
          setSheet(false)
          sub.subscribe(billing)
          router.replace('/assinatura/confirmada')
        }}
      />
    </Page>
  )
}

export function ConfirmedScreen() {
  const { colors } = useTheme()
  const sub = useSubscription()
  const billing = sub.plan?.billing ?? 'monthly'
  const p = PRICES[billing]
  const rows: [string, string][] = [
    ['Plano', p.label],
    ['Valor', `${p.amount} ${p.per}`],
    ['Próxima cobrança', longDate(sub.plan?.renewsAt ?? nextCharge(billing))],
    ['Gerenciar', 'Configurações da loja'],
  ]
  return (
    <Page title="Assinatura confirmada" onBack={() => router.replace('/')}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="checkCircle" size={36} color={colors.primary} />
        </View>
        <AppText variant="screenTitle" accessibilityRole="header">
          Assinatura confirmada
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          Você tem acesso completo a todos os recursos.
        </AppText>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {rows.map(([k, v], i) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.line }} accessible accessibilityLabel={`${k}: ${v}`}>
            <AppText variant="body" tone="secondary">
              {k}
            </AppText>
            <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
              {v}
            </AppText>
          </View>
        ))}
      </Card>
      <Button label="Continuar" onPress={() => router.replace('/')} />
    </Page>
  )
}

const STATUS_LABEL = { trial: 'Teste grátis', active: 'Ativa', canceledActive: 'Cancelada, ativa até o fim do período', paymentFailed: 'Pagamento falhou', blocked: 'Encerrada' } as const

export function MyPlanScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const sub = useSubscription()
  const [billing, setBilling] = useState<Billing>(sub.plan?.billing ?? 'annual')
  const [sheet, setSheet] = useState(false)

  if (!sub.plan) {
    return (
      <Page title="Meu plano">
        <Card style={{ gap: 6 }}>
          <AppText variant="label" tone="secondary">
            Plano atual
          </AppText>
          <AppText variant="bodyStrong">{STATUS_LABEL[sub.status]}</AppText>
          <AppText variant="body" tone="secondary">
            {sub.status === 'trial'
              ? sub.daysLeft === 1
                ? 'Hoje é o último dia do seu teste.'
                : `Faltam ${sub.daysLeft} dias. O teste termina em ${longDate(sub.trialEndsAt!)}.`
              : 'Seu teste terminou. Assine para continuar.'}
          </AppText>
        </Card>
        <Button label="Ver plano" onPress={() => router.push('/assinatura')} />
        <LegalLinks />
      </Page>
    )
  }

  const p = PRICES[sub.plan.billing]
  return (
    <Page title="Meu plano">
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingBottom: 8 }}>
          <View>
            <AppText variant="label" tone="secondary">
              Plano atual
            </AppText>
            <AppText variant="title">{p.label}</AppText>
          </View>
          <View style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: sub.status === 'paymentFailed' ? colors.dangerSoft : colors.primarySoft, flexShrink: 1 }}>
            <AppText variant="label" style={{ color: sub.status === 'paymentFailed' ? colors.danger : colors.primary, fontFamily: fonts.bold }}>
              {STATUS_LABEL[sub.status]}
            </AppText>
          </View>
        </View>
        {[
          ['Valor', `${p.amount} ${p.per}`],
          [sub.status === 'canceledActive' ? 'Acesso até' : 'Próxima cobrança', longDate(sub.plan.renewsAt)],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }} accessible accessibilityLabel={`${k}: ${v}`}>
            <AppText variant="body" tone="secondary">
              {k}
            </AppText>
            <AppText variant="bodyStrong">{v}</AppText>
          </View>
        ))}
      </Card>

      {sub.status === 'paymentFailed' ? (
        <Card style={{ gap: 4, borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
          <AppText variant="bodyStrong" style={{ color: colors.danger }}>
            Pagamento falhou
          </AppText>
          <AppText variant="small" style={{ color: colors.text }}>
            {`Regularize na loja até ${longDate(sub.plan.graceUntil!)} para não perder o acesso.`}
          </AppText>
        </Card>
      ) : null}
      {sub.status === 'canceledActive' ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
          <AppText variant="small">Sua assinatura foi cancelada, mas continua ativa até o fim do período pago.</AppText>
        </Card>
      ) : null}

      <SectionLabel>Trocar período</SectionLabel>
      <BillingPicker value={billing} onChange={setBilling} />
      {billing !== sub.plan.billing ? <Button label={`Trocar para ${PRICES[billing].label.toLowerCase()}`} variant="soft" onPress={() => setSheet(true)} /> : null}

      <Button label="Gerenciar assinatura" onPress={openStoreSubscriptions} accessibilityHint={`Abre as assinaturas na ${STORE_NAME}`} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        O cancelamento e a troca de forma de pagamento são feitos nas configurações da sua conta na loja.
      </AppText>
      <StoreSheet
        billing={billing}
        visible={sheet}
        onCancel={() => setSheet(false)}
        onConfirm={() => {
          setSheet(false)
          sub.changeBilling(billing)
          toast('Período trocado. Vale a partir da próxima cobrança.')
        }}
      />
    </Page>
  )
}

/** Linha discreta no topo do Hoje e do Eu. Tocar abre a tela de planos. */
export function TrialBanner() {
  const { colors } = useTheme()
  const sub = useSubscription()
  if (sub.status !== 'trial') return null
  const last = sub.daysLeft <= 1
  // Último dia: o bloqueio vem amanhã (texto do documento).
  const text = last ? 'Seu teste termina amanhã' : `Faltam ${sub.daysLeft} dias do seu teste`
  return (
    <Pressable
      onPress={() => router.push('/assinatura')}
      accessibilityRole="button"
      accessibilityLabel={`${text}. Ver plano`}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: last ? colors.dangerSoft : colors.primarySoft }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {last ? <Icon name="alert" size={14} color={colors.danger} /> : <Icon name="clock" size={14} color={colors.primary} />}
        <AppText variant="small" style={{ fontFamily: fonts.semibold, color: last ? colors.danger : colors.primary }}>
          {text}
        </AppText>
      </View>
      <AppText variant="small" style={{ fontFamily: fonts.bold, color: last ? colors.danger : colors.primary }}>
        Ver plano
      </AppText>
    </Pressable>
  )
}

/** Cartão no Hoje no fim do teste. */
export function LastDayCard() {
  const { colors } = useTheme()
  const sub = useSubscription()
  if (sub.status !== 'trial' || sub.daysLeft > 1) return null
  return (
    <Card style={{ gap: 8, borderColor: colors.accent }}>
      <AppText variant="bodyStrong">Seu teste termina amanhã</AppText>
      <AppText variant="small" tone="secondary">
        Assine para continuar sem interrupções. Seu progresso fica salvo.
      </AppText>
      <Button label="Ver plano" size="sm" onPress={() => router.push('/assinatura')} style={{ alignSelf: 'flex-start' }} />
    </Card>
  )
}

/** Aviso no Hoje quando a renovação falha. */
export function PaymentFailedCard() {
  const { colors } = useTheme()
  const sub = useSubscription()
  if (sub.status !== 'paymentFailed' || !sub.plan?.graceUntil) return null
  return (
    <Card style={{ gap: 8, borderColor: colors.danger }}>
      <AppText variant="bodyStrong">Pagamento falhou na renovação</AppText>
      <AppText variant="small" tone="secondary">
        {`Regularize na loja até ${longDate(sub.plan.graceUntil)} para não perder o acesso.`}
      </AppText>
      <Button label="Abrir a loja" size="sm" variant="soft" onPress={openStoreSubscriptions} style={{ alignSelf: 'flex-start' }} />
    </Card>
  )
}

/** Aparece uma vez, no fim do primeiro acesso. */
export function TrialIntroSheet() {
  const sub = useSubscription()
  const visible = sub.status === 'trial' && !sub.introSeen && !!sub.trialEndsAt
  return (
    <Sheet visible={visible} onClose={sub.seeIntro} title={`${TRIAL_DAYS} dias grátis`}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 16 }}>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {sub.trialEndsAt ? `Explore tudo sem restrições. Seu teste termina em ${longDate(sub.trialEndsAt)}. Sem cartão ou pagamento agora.` : ''}
        </AppText>
        <FeatureList />
      </ScrollView>
      <Button label="Começar teste grátis" onPress={sub.seeIntro} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {`Depois do teste, ${PRICES.monthly.amount} por mês`}
      </AppText>
    </Sheet>
  )
}

/** Tela única para quem terminou o teste sem assinar ou está com a assinatura vencida. Nenhuma aba abre. */
export function BlockedScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const sub = useSubscription()
  const restore = useRestore()
  const [billing, setBilling] = useState<Billing>('annual')
  const [sheet, setSheet] = useState(false)
  const expired = !!sub.plan
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.primary} />
        </View>
        <AppText variant="screenTitle" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {expired ? 'Sua assinatura terminou' : 'Seu teste terminou'}
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          Para continuar usando o App Cristão, assine um plano. Seu progresso está salvo.
        </AppText>
      </View>
      <BillingPicker value={billing} onChange={setBilling} />
      <PriceCard billing={billing} />
      <Button label="Assinar" onPress={() => setSheet(true)} />
      <Button label="Restaurar compra" variant="text" onPress={restore} />
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, gap: 4 }}>
        <SectionLabel>Acesso permitido</SectionLabel>
        <Card style={{ paddingVertical: 4 }}>
          {[
            { label: 'Baixar meus dados', go: '/configuracoes/dados' },
            { label: 'Sair da conta', go: '/configuracoes/sair' },
            { label: 'Excluir conta', go: '/configuracoes/excluir' },
            { label: 'Ajuda', go: '/configuracoes/ajuda' },
          ].map((r, i, all) => (
            <Pressable
              key={r.label}
              onPress={() => router.push(r.go as '/configuracoes/dados')}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: i < all.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            >
              <AppText variant="body" style={{ flex: 1, fontFamily: fonts.medium, color: r.label === 'Excluir conta' ? colors.danger : colors.text }}>
                {r.label}
              </AppText>
              <Icon name="chevronRight" size={18} color={colors.lineStrong} />
            </Pressable>
          ))}
        </Card>
      </View>
      {IS_PREVIEW ? <PreviewSubTools /> : null}
      <StoreSheet
        billing={billing}
        visible={sheet}
        onCancel={() => setSheet(false)}
        onConfirm={() => {
          setSheet(false)
          sub.subscribe(billing)
          router.push('/assinatura/confirmada')
        }}
      />
    </ScrollView>
  )
}

/** Só na prévia: estados da assinatura pedidos no documento. */
export function PreviewSubTools() {
  const toast = useToast()
  const sub = useSubscription()
  const items: { k: PreviewSub; label: string }[] = [
    { k: 'trialDay2', label: 'Teste no dia 2' },
    { k: 'lastDay', label: 'Teste no último dia' },
    { k: 'blocked', label: 'Bloqueado' },
    { k: 'active', label: 'Assinante' },
    { k: 'paymentFailed', label: 'Pagamento falhou' },
    { k: 'canceledActive', label: 'Cancelada e ainda ativa' },
  ]
  return (
    <Card style={{ gap: 8 }}>
      <AppText variant="bodyStrong">Assinatura na prévia</AppText>
      <AppText variant="small" tone="secondary">{`Agora: ${STATUS_LABEL[sub.status]}${sub.status === 'trial' ? `, faltam ${sub.daysLeft} dias` : ''}.`}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((it) => (
          <Button key={it.k} label={it.label} variant="outline" size="sm" onPress={() => (sub.setPreview(it.k), toast(it.label))} />
        ))}
      </View>
      <Button
        label="Simular compra em outro aparelho"
        variant="text"
        size="sm"
        onPress={() => {
          simulateStorePurchase('monthly')
          toast('Agora Restaurar compra encontra uma assinatura')
        }}
      />
    </Card>
  )
}

