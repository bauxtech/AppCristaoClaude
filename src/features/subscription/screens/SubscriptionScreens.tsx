import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { AlertCard, AppText, Button, Card, Icon, MIN_TOUCH, Page, Segmented, Sheet, TextField, useToast } from '../../../components'
import { IS_PREVIEW } from '../../../lib/preview'
import { openStoreSubscriptions, purchase, simulateStorePurchase, STORE_ENABLED, STORE_NAME, syncSubscription } from '../../../lib/store'
import { phoneCodeProblem, sendPhoneChangeCode, supabase, verifyPhoneChange, type PhoneCodeProblem } from '../../../lib/supabase'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { longDate } from '../../settings/screens/AccountScreens'
import { PLAN_NAME, PLANS, planInfo, RECOMMENDED_PLAN, TRIAL_DAYS, type Billing, type PlanId, type PreviewSub } from '../plan'
import { useSubscription } from '../SubscriptionContext'
import { FEATURE_ACTION, isFeature } from '../PlanLock'
import { logPaywall, paywallSource } from '../paywallLog'
import { openLegal } from '../../../lib/legal'

function Check({ text }: { text: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Icon name="check" size={13} color={colors.primary} strokeWidth={3} />
      </View>
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  )
}

function BillingPicker({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  return (
    <Segmented<Billing>
      label="Período"
      value={value}
      onChange={onChange}
      // Mensal primeiro e marcado, como no site (21/10).
      options={[
        { id: 'monthly', label: 'Mensal' },
        { id: 'annual', label: 'Anual, mais barato' },
      ]}
    />
  )
}

/** Um plano na lista. O escolhido fica com borda forte e o estado é anunciado pelo leitor de tela. */
function PlanCard({ id, billing, selected, current, onSelect }: { id: PlanId; billing: Billing; selected: boolean; current: boolean; onSelect: () => void }) {
  const { colors } = useTheme()
  const p = planInfo(id)
  const price = p.prices[billing]
  const saving = billing === 'annual' ? `Economize ${p.annualSaving} no anual` : null
  // No mensal, lembra o valor do anual; no anual, mostra quanto dá por mês. Igual ao site.
  const other = billing === 'monthly' ? `Ou ${p.prices.annual.amount} por ano no plano anual` : `Equivale a ${p.annualPerMonth} por mês`
  const recommended = id === RECOMMENDED_PLAN
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Plano ${p.name}${recommended ? ', recomendado' : ''}, ${price.amount} ${price.per}. ${other}${saving ? `. ${saving}` : ''}${current ? '. Seu plano atual' : ''}`}
      style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.lineStrong, borderRadius: 20, padding: 18, paddingTop: recommended ? 24 : 18, gap: 10, backgroundColor: colors.card, marginTop: recommended ? 12 : 0 }}
    >
      {recommended ? (
        <View style={{ position: 'absolute', top: -13, left: 18, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.primary }}>
          <AppText variant="small" style={{ color: colors.primaryText, fontFamily: fonts.semibold }}>
            Recomendado
          </AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
            {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
          </View>
          <AppText variant="title">{p.name}</AppText>
        </View>
        {current ? (
          <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.primarySoft }}>
            <AppText variant="label" style={{ color: colors.primary, fontFamily: fonts.bold }}>
              Seu plano
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="body" tone="secondary">
        {p.who}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.text }}>{price.amount}</AppText>
        <AppText variant="body" tone="secondary" style={{ paddingBottom: 3 }}>
          {price.per}
        </AppText>
      </View>
      <AppText variant="small" tone="secondary">
        {other}
      </AppText>
      {saving ? (
        <AppText variant="small" style={{ color: colors.primary, fontFamily: fonts.semibold }}>
          {saving}
        </AppText>
      ) : null}
      <View style={{ gap: 6 }}>
        {p.items.map((t) => (
          <Check key={t} text={t} />
        ))}
      </View>
    </Pressable>
  )
}

/** Folha de exemplo. Na loja de verdade, quem desenha esta folha é a Apple ou o Google. */
export function StoreSheet({ plan, billing, visible, onCancel, onConfirm }: { plan: PlanId; billing: Billing; visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { colors } = useTheme()
  const [busy, setBusy] = useState(false)
  const p = planInfo(plan)
  const price = p.prices[billing]
  return (
    <Sheet visible={visible} onClose={onCancel} title="Confirmar assinatura">
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="body">{`${p.name}, ${billing === 'annual' ? 'anual' : 'mensal'}`}</AppText>
          <AppText variant="bodyStrong">{price.amount}</AppText>
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <AppText variant="small" tone="secondary">
          {`Cobrado ${price.per} automaticamente. Cancele a qualquer momento nas configurações da sua conta na loja.`}
        </AppText>
      </Card>
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

/**
 * Assinar: com a loja ligada, abre a folha de compra da própria Apple ou Google e pede ao servidor para conferir.
 * Sem a loja, abre a folha de exemplo. Cancelar volta para a tela, sem mensagem de erro.
 */
function useBuy(onSample: () => void, from?: { source: string; feature?: string }) {
  const toast = useToast()
  const sub = useSubscription()
  // Um toque de cada vez: dois toques seguidos não abrem duas compras.
  const busy = useRef(false)
  return async (plan: PlanId, billing: Billing) => {
    if (!STORE_ENABLED) return onSample()
    if (busy.current) return
    busy.current = true
    try {
      const r = await purchase(plan, billing)
      if (r === 'ok') {
        if (from) logPaywall('purchase', from.source, from.feature)
        await syncSubscription()
        await sub.refresh()
        router.replace('/assinatura/confirmada')
      } else if (r === 'pending') toast('Pagamento pendente. O plano é liberado quando a loja confirmar.')
      else if (r === 'unavailable') toast('A loja não está disponível agora. Tente de novo.')
    } catch {
      toast('A compra não foi concluída. Tente de novo.')
    } finally {
      busy.current = false
    }
  }
}

function useRestore() {
  const toast = useToast()
  const sub = useSubscription()
  return async () => {
    try {
      const ok = await sub.restore()
      toast(ok ? 'Compra restaurada' : 'Nenhuma compra encontrada para restaurar')
      if (ok) router.replace('/eu')
    } catch {
      toast('Não foi possível falar com a loja. Confira a internet e tente de novo.')
    }
  }
}

function LegalLinks() {
  const restore = useRestore()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button label="Restaurar compra" variant="text" size="sm" onPress={restore} />
      <Button label="Termos de Uso" variant="text" size="sm" onPress={() => openLegal('terms')} accessibilityHint="Abre o site do acasa" />
      <Button label="Privacidade" variant="text" size="sm" onPress={() => openLegal('privacy')} accessibilityHint="Abre o site do acasa" />
    </View>
  )
}

const isPlanId = (p: unknown): p is PlanId => p === 'essencial' || p === 'completo' || p === 'lider'

/**
 * Tela de planos: os três planos, mensal ou anual (o anual vem marcado).
 * Aberta por um cadeado, já vem no plano que libera a função. No dia 8, aparece uma vez com o botão para seguir só com a Bíblia.
 */
export function PlansScreen() {
  const sub = useSubscription()
  const params = useLocalSearchParams<{ plano?: string; fim?: string; funcao?: string; origem?: string }>()
  const endOfTrial = params.fim === '1'
  const feature = isFeature(params.funcao) ? params.funcao : null
  const source = paywallSource(params)
  const current = sub.status !== 'free' && sub.status !== 'trial' ? (sub.plan as PlanId) : null
  const currentBilling = sub.access.billing
  const [plan, setPlan] = useState<PlanId>(isPlanId(params.plano) ? params.plano : (current ?? RECOMMENDED_PLAN))
  // Abre no mensal (site, 21/10); quem já assina vê o período que já tem.
  const [billing, setBilling] = useState<Billing>(currentBilling ?? 'monthly')
  const [sheet, setSheet] = useState(false)
  const buy = useBuy(() => setSheet(true), { source, feature: feature ?? undefined })
  useEffect(() => {
    logPaywall('view', source, feature)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // A tela do fim do teste conta como vista assim que aparece.
  useEffect(() => {
    if (endOfTrial && sub.showEndOfTrial) sub.markPaywallSeen()
  }, [endOfTrial]) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => router.replace('/')
  const p = planInfo(plan)
  return (
    <Page title="Planos e preços" onBack={endOfTrial ? close : undefined}>
      {endOfTrial ? (
        <View style={{ gap: 6 }}>
          <AppText variant="title" accessibilityRole="header">
            Seu teste terminou
          </AppText>
          <AppText variant="body" tone="secondary">
            A Bíblia continua grátis: ler, ouvir, buscar, grifar e anotar. Para o resto, escolha um plano. Nada do que você criou foi apagado.
          </AppText>
        </View>
      ) : feature && isPlanId(params.plano) ? (
        <AppText variant="bodyStrong" accessibilityRole="header">
          {`Para ${FEATURE_ACTION[feature]}, escolha o plano ${PLAN_NAME[params.plano]}.`}
        </AppText>
      ) : sub.status === 'trial' ? (
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          {sub.daysLeft <= 1 ? 'Seu teste termina hoje à meia-noite.' : `Faltam ${sub.daysLeft} dias do seu teste.`}
        </AppText>
      ) : null}
      <BillingPicker value={billing} onChange={setBilling} />
      <View style={{ gap: 12 }} accessibilityRole="radiogroup" accessibilityLabel="Planos">
        {PLANS.map((x) => (
          <PlanCard key={x.id} id={x.id} billing={billing} selected={plan === x.id} current={current === x.id && currentBilling === billing} onSelect={() => setPlan(x.id)} />
        ))}
      </View>
      {current === plan && currentBilling === billing ? (
        <Button label="Este é o seu plano" disabled onPress={() => {}} />
      ) : (
        <Button
          label={current === plan ? `Trocar para o ${billing === 'annual' ? 'anual' : 'mensal'}` : `Assinar ${p.name} ${billing === 'annual' ? 'anual' : 'mensal'}`}
          onPress={() => buy(plan, billing)}
        />
      )}
      {endOfTrial ? <Button label="Agora não, seguir só com a Bíblia" variant="outline" onPress={close} /> : null}
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {`Pagamento pela ${STORE_NAME}. Renova sozinho e você cancela quando quiser nas configurações da loja.`}
      </AppText>
      <LegalLinks />
      <StoreSheet
        plan={plan}
        billing={billing}
        visible={sheet}
        onCancel={() => setSheet(false)}
        onConfirm={() => {
          setSheet(false)
          sub.subscribe(plan, billing)
          router.replace('/assinatura/confirmada')
        }}
      />
      {IS_PREVIEW ? <PreviewSubTools /> : null}
    </Page>
  )
}

export function ConfirmedScreen() {
  const { colors } = useTheme()
  const sub = useSubscription()
  const plan = isPlanId(sub.plan) ? planInfo(sub.plan) : null
  const billing = sub.access.billing ?? 'monthly'
  const rows: [string, string][] = plan
    ? [
        ['Plano', `${plan.name}, ${billing === 'annual' ? 'anual' : 'mensal'}`],
        ['Valor', `${plan.prices[billing].amount} ${plan.prices[billing].per}`],
        ...(sub.access.renewsAt ? ([['Próxima cobrança', longDate(sub.access.renewsAt)]] as [string, string][]) : []),
        ['Gerenciar', 'Configurações da loja'],
      ]
    : [['Situação', 'A loja está confirmando a compra. Pode levar alguns minutos.']]
  return (
    <Page title="Assinatura confirmada" onBack={() => router.replace('/')}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="checkCircle" size={36} color={colors.primary} />
        </View>
        <AppText variant="screenTitle" accessibilityRole="header">
          Assinatura confirmada
        </AppText>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {rows.map(([k, v], i) => (
          <View
            key={k}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            accessible
            accessibilityLabel={`${k}: ${v}`}
          >
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

/** Plano pago sem assinatura da loja por trás: é cortesia (só existe com o servidor). */
const remoteCourtesy = (sub: ReturnType<typeof useSubscription>) => isPlanId(sub.plan) && !sub.access.storePlan && sub.access.storeStatus == null

const STATUS_LABEL = { trial: 'Teste grátis', active: 'Ativa', canceledActive: 'Cancelada, ativa até o fim do período', paymentFailed: 'Pagamento falhou', free: 'Grátis, só a Bíblia' } as const

export function MyPlanScreen() {
  const { colors } = useTheme()
  const sub = useSubscription()
  const a = sub.access
  const plan = isPlanId(sub.plan) ? planInfo(sub.plan) : null

  if (!plan) {
    return (
      <Page title="Meu plano">
        <Card style={{ gap: 6 }}>
          <AppText variant="label" tone="secondary">
            Plano atual
          </AppText>
          <AppText variant="bodyStrong">{STATUS_LABEL[sub.status]}</AppText>
          <AppText variant="body" tone="secondary">
            {sub.status === 'trial'
              ? sub.daysLeft <= 1
                ? 'Seu teste termina hoje à meia-noite.'
                : // O fim é a meia-noite depois do último dia: o último dia de uso é o anterior.
                  `Faltam ${sub.daysLeft} dias. O teste vale até ${longDate(new Date(new Date(sub.trialEndsAt!).getTime() - 1).toISOString())}.`
              : 'A Bíblia continua grátis. O que você criou continua guardado, só para leitura.'}
          </AppText>
        </Card>
        {sub.needsPhoneForTrial ? <ConfirmPhoneCard /> : null}
        <Button label="Ver planos" onPress={() => router.push('/assinatura')} />
        <LegalLinks />
      </Page>
    )
  }

  // Plano sem compra na loja: cortesia da equipe, liberada pelo servidor.
  if (remoteCourtesy(sub)) {
    return (
      <Page title="Meu plano">
        <Card style={{ gap: 6 }}>
          <AppText variant="label" tone="secondary">
            Plano atual
          </AppText>
          <AppText variant="title">{plan.name}</AppText>
          <AppText variant="body" tone="secondary">
            Cortesia da equipe. Não há cobrança na loja.
          </AppText>
        </Card>
        <LegalLinks />
      </Page>
    )
  }

  const billing = a.billing ?? 'monthly'
  const price = plan.prices[billing]
  return (
    <Page title="Meu plano">
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingBottom: 8 }}>
          <View>
            <AppText variant="label" tone="secondary">
              Plano atual
            </AppText>
            <AppText variant="title">{`${plan.name}, ${billing === 'annual' ? 'anual' : 'mensal'}`}</AppText>
          </View>
          <View style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: sub.status === 'paymentFailed' ? colors.dangerSoft : colors.primarySoft, flexShrink: 1 }}>
            <AppText variant="label" style={{ color: sub.status === 'paymentFailed' ? colors.danger : colors.primary, fontFamily: fonts.bold }}>
              {STATUS_LABEL[sub.status]}
            </AppText>
          </View>
        </View>
        {(
          [
            ['Valor', `${price.amount} ${price.per}`],
            ...(a.renewsAt ? [[sub.status === 'canceledActive' ? 'Acesso até' : 'Próxima cobrança', longDate(a.renewsAt)]] : []),
            ['Chat bíblico', `${a.chat.limit} perguntas por dia`],
            ...(a.sermon.limit > 0 ? [['Cultos', `${a.sermon.used} de ${a.sermon.limit} neste período`]] : []),
          ] as [string, string][]
        ).map(([k, v]) => (
          <View
            key={k}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}
            accessible
            accessibilityLabel={`${k}: ${v}`}
          >
            <AppText variant="body" tone="secondary">
              {k}
            </AppText>
            <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
              {v}
            </AppText>
          </View>
        ))}
      </Card>

      {sub.status === 'paymentFailed' && a.graceUntil ? (
        <AlertCard tone="danger" title="Pagamento não aprovado" action={{ label: 'Atualizar pagamento na loja', onPress: openStoreSubscriptions }}>
          {`A loja não conseguiu renovar sua assinatura. Atualize a forma de pagamento até ${longDate(a.graceUntil)} para continuar com tudo liberado.`}
        </AlertCard>
      ) : null}
      {sub.status === 'canceledActive' ? (
        <AlertCard tone="info" title="Assinatura cancelada">
          Ela continua ativa até o fim do período pago. Se mudar de ideia, é só assinar de novo.
        </AlertCard>
      ) : null}

      <Button label="Trocar de plano" variant="soft" onPress={() => router.push('/assinatura')} />
      <Button label="Gerenciar assinatura" onPress={openStoreSubscriptions} accessibilityHint={`Abre as assinaturas na ${STORE_NAME}`} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        O cancelamento e a troca de forma de pagamento são feitos nas configurações da sua conta na loja.
      </AppText>
    </Page>
  )
}

/** Linha discreta no topo do Hoje e do Eu. Tocar abre a tela de planos. */
export function TrialBanner() {
  const { colors } = useTheme()
  const sub = useSubscription()
  if (sub.status !== 'trial') return null
  const last = sub.daysLeft <= 1
  const text = last ? 'Seu teste termina hoje à meia-noite' : `Faltam ${sub.daysLeft} dias do seu teste`
  return (
    <Pressable
      onPress={() => router.push('/assinatura')}
      accessibilityRole="button"
      accessibilityLabel={`${text}. Ver planos`}
      style={{
        minHeight: MIN_TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: last ? colors.dangerSoft : colors.primarySoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {last ? <Icon name="alert" size={14} color={colors.danger} /> : <Icon name="clock" size={14} color={colors.primary} />}
        <AppText variant="small" style={{ fontFamily: fonts.semibold, color: last ? colors.danger : colors.primary }}>
          {text}
        </AppText>
      </View>
      <AppText variant="small" style={{ fontFamily: fonts.bold, color: last ? colors.danger : colors.primary }}>
        Ver planos
      </AppText>
    </Pressable>
  )
}

/** Cartão no Hoje no fim do teste. */
export function LastDayCard() {
  const sub = useSubscription()
  if (sub.status !== 'trial' || sub.daysLeft > 1) return null
  return (
    <AlertCard tone="attention" icon="clock" title="Seu teste termina hoje à meia-noite" action={{ label: 'Ver planos', onPress: () => router.push('/assinatura') }}>
      Para seguir com tudo, escolha um plano. Se preferir, a Bíblia continua grátis e nada do que você criou é apagado.
    </AlertCard>
  )
}

/** Aviso no Hoje quando a renovação falha. */
export function PaymentFailedCard() {
  const sub = useSubscription()
  if (sub.status !== 'paymentFailed' || !sub.access.graceUntil) return null
  return (
    <AlertCard tone="danger" title="Pagamento falhou na renovação" action={{ label: 'Abrir a loja', onPress: openStoreSubscriptions }}>
      {`Regularize na loja até ${longDate(sub.access.graceUntil)} para não perder o acesso.`}
    </AlertCard>
  )
}

/** No Hoje: só aparece para quem entrou pelo Google e ainda não confirmou o celular. */
export function TrialPhoneCard() {
  const sub = useSubscription()
  return sub.needsPhoneForTrial ? <ConfirmPhoneCard /> : null
}

/** Quem entrou pelo Google ainda não tem celular confirmado: o teste começa depois disso. */
export function ConfirmPhoneCard() {
  return (
    <AlertCard tone="info" icon="gift" title={`Comece sua jornada com ${TRIAL_DAYS} dias grátis`} action={{ label: 'Confirmar celular', onPress: () => router.push('/assinatura/celular') }}>
      Confirme seu número de celular para liberar tudo por 7 dias, sem cartão. É um teste por número.
    </AlertCard>
  )
}

// QA de 21/10: com o número de uma conta que já existe, o servidor não manda o código e a pessoa ficava sem saída.
const PHONE_CODE_MESSAGE: Record<PhoneCodeProblem, string> = {
  exists: 'Este número já tem uma conta no acasa. Para usar essa conta, saia e entre pelo celular, com este número.',
  wait: 'Muitos pedidos de código em pouco tempo. Espere alguns minutos e tente de novo.',
  failed: 'Não foi possível enviar o código agora. Confira o número e a internet e tente de novo.',
}

/** Confirma o celular de quem entrou pelo Google e começa o teste. */
export function ConfirmPhoneScreen() {
  const toast = useToast()
  const sub = useSubscription()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<PhoneCodeProblem | null>(null)
  const digits = phone.replace(/\D/g, '')
  const e164 = `+55${digits}`
  return (
    <Page title="Confirmar celular">
      <AppText variant="body" tone="secondary">
        {`Mandamos um código por SMS. Depois de confirmar, seu teste de ${TRIAL_DAYS} dias começa. Cada número tem um teste só.`}
      </AppText>
      <TextField label="Celular com DDD" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))} keyboardType="phone-pad" placeholder="11 99999-9999" editable={!sent} />
      {sent ? <TextField label="Código recebido por SMS" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" /> : null}
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      {problem === 'exists' ? <Button label="Sair e entrar pelo celular" variant="outline" onPress={() => router.push('/configuracoes/sair')} /> : null}
      {!sent ? (
        <Button
          label={busy ? 'Enviando' : 'Enviar código'}
          busy={busy}
          disabled={digits.length < 10}
          onPress={async () => {
            setBusy(true)
            setError(null)
            setProblem(null)
            try {
              await sendPhoneChangeCode(e164)
              setSent(true)
            } catch (e) {
              const p = phoneCodeProblem(e)
              setProblem(p)
              setError(PHONE_CODE_MESSAGE[p])
            }
            setBusy(false)
          }}
        />
      ) : (
        <Button
          label={busy ? 'Confirmando' : 'Confirmar'}
          busy={busy}
          disabled={code.length < 6}
          onPress={async () => {
            setBusy(true)
            setError(null)
            try {
              await verifyPhoneChange(e164, code)
              const { data } = supabase ? await supabase.rpc('start_my_trial') : { data: false }
              await sub.refresh()
              toast(data ? `Seu teste de ${TRIAL_DAYS} dias começou` : 'Celular confirmado. Este número já usou o teste.')
              router.replace('/')
            } catch {
              setError('Código errado ou vencido. Tente de novo.')
            }
            setBusy(false)
          }}
        />
      )}
    </Page>
  )
}

/** Aparece uma vez, no fim do primeiro acesso. */
export function TrialIntroSheet() {
  const sub = useSubscription()
  const visible = sub.status === 'trial' && !sub.introSeen && !!sub.trialEndsAt
  return (
    <Sheet visible={visible} onClose={sub.seeIntro} title={`${TRIAL_DAYS} dias grátis`}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12 }}>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {sub.trialEndsAt ? `Use tudo do app até ${longDate(new Date(new Date(sub.trialEndsAt).getTime() - 1).toISOString())}. Sem cartão ou pagamento agora.` : ''}
        </AppText>
        <Check text="Chat bíblico, oração, culto, igreja e célula" />
        <Check text="Depois do teste, a Bíblia continua grátis para sempre" />
        <Check text="Nada do que você criar é apagado" />
      </ScrollView>
      <Button label="Começar" onPress={sub.seeIntro} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {`Depois, planos a partir de ${PLANS[0].prices.monthly.amount} por mês`}
      </AppText>
    </Sheet>
  )
}

/** Só na prévia: estados da assinatura. */
export function PreviewSubTools() {
  const toast = useToast()
  const sub = useSubscription()
  const items: { k: PreviewSub; label: string }[] = [
    { k: 'trialDay2', label: 'Teste no dia 2' },
    { k: 'lastDay', label: 'Teste no último dia' },
    { k: 'free', label: 'Dia 8, sem plano' },
    { k: 'essencial', label: 'Essencial' },
    { k: 'completo', label: 'Completo' },
    { k: 'lider', label: 'Líder' },
    { k: 'paymentFailed', label: 'Pagamento falhou' },
    { k: 'canceledActive', label: 'Cancelada e ainda ativa' },
  ]
  return (
    <Card style={{ gap: 8 }}>
      <AppText variant="bodyStrong">Assinatura na prévia</AppText>
      <AppText variant="small" tone="secondary">{`Agora: ${PLAN_NAME[sub.plan]}${sub.status === 'trial' ? `, faltam ${sub.daysLeft} dias` : ''}.`}</AppText>
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
          simulateStorePurchase({ plan: 'completo', billing: 'monthly' })
          toast('Agora Restaurar compra encontra uma assinatura')
        }}
      />
    </Card>
  )
}
