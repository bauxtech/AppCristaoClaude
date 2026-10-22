import { usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { AppText, Button, MIN_TOUCH } from '../../components'
import { getItem, setItem } from '../../lib/storage'
import { useSession } from '../../state/session'
import { useTheme } from '../../theme/ThemeProvider'
import { useCell } from '../cell/CellContext'
import { useSubscription } from '../subscription/SubscriptionContext'
import { CELL_TOURS, TAB_LABEL, TOURS, cellVariant, isNewAccount, tabFromPath, type TourStep } from './tours'

const KEY = 'toursSeen'
/** Marcado ao terminar o cadastro. Quem já usava o app antes do passo a passo não vê. */
export const ELIGIBLE_KEY = 'toursEligible'
const listeners = new Set<(seen: string[]) => void>()

export function toursSeen(): string[] {
  return getItem<string[]>(KEY, [])
}

function save(seen: string[]) {
  setItem(KEY, seen)
  listeners.forEach((l) => l(seen))
}

/** Mostra de novo o passo a passo de todas as abas (pedido pela pessoa, na ajuda do Hoje). */
export function resetTours() {
  setItem(ELIGIBLE_KEY, 'always')
  save([])
}

/**
 * Cartão do passo a passo, preso acima das abas e do botão do chat. Não cobre a tela inteira:
 * o leitor de tela lê o cartão como qualquer outro conteúdo e a pessoa pode seguir usando o app.
 */
export function TabTour({ hidden, bottom }: { hidden: boolean; bottom: number }) {
  const { colors } = useTheme()
  const tab = tabFromPath(usePathname())
  const { cellStatus } = useSession()
  const { cell } = useCell()
  const sub = useSubscription()
  const [seen, setSeen] = useState<string[]>(toursSeen)
  const [step, setStep] = useState(0)
  useEffect(() => {
    listeners.add(setSeen)
    return () => void listeners.delete(setSeen)
  }, [])

  const eligible = getItem<boolean | 'always' | null>(ELIGIBLE_KEY, null)
  const allowed = eligible === 'always' || (eligible === true && isNewAccount(sub.access.trialStart))
  let key: string | null = tab
  let steps: TourStep[] = []
  if (tab === 'celula') {
    const v = cellVariant({
      hasCell: !!cell,
      pending: cellStatus === 'pending',
      isLeader: cell?.myRole === 'lider',
      leadPlan: sub.can('cell_lead'),
      cellActive: cell ? sub.cellActive(cell.id) : true,
    })
    key = v ? `celula:${v}` : null
    steps = v ? CELL_TOURS[v] : []
  } else if (tab) steps = TOURS[tab]
  useEffect(() => setStep(0), [key])

  // Antes da resposta do servidor o plano ainda não é conhecido: espera para não mostrar o passo a passo errado.
  const show = !hidden && sub.ready && allowed && !!key && !!tab && steps.length > 0 && !seen.includes(key)
  useEffect(() => {
    if (show && tab) AccessibilityInfo.announceForAccessibility(`Passo a passo da aba ${TAB_LABEL[tab]}`)
  }, [show, tab])
  if (!show || !tab || !key) return null

  const s = steps[Math.min(step, steps.length - 1)]
  const last = step >= steps.length - 1
  const done = key
  const finish = () => save([...seen, done])
  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: bottom + MIN_TOUCH + 24,
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
    >
      <AppText variant="small" tone="secondary">{`Passo ${step + 1} de ${steps.length}`}</AppText>
      <AppText variant="title" accessibilityRole="header">
        {s.title}
      </AppText>
      <AppText variant="body">{s.text}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
        {last ? <View /> : <Button label="Pular" variant="text" size="sm" onPress={finish} accessibilityHint={`Fecha o passo a passo da aba ${TAB_LABEL[tab]}`} />}
        <Button label={last ? 'Entendi' : 'Próximo'} size="sm" onPress={() => (last ? finish() : setStep(step + 1))} />
      </View>
    </View>
  )
}
