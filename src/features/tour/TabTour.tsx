import { usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { AppText, Button, MIN_TOUCH } from '../../components'
import { getItem, setItem } from '../../lib/storage'
import { useTheme } from '../../theme/ThemeProvider'
import { TAB_LABEL, TOURS, tabFromPath, type TabName } from './tours'

const KEY = 'toursSeen'
const listeners = new Set<(seen: TabName[]) => void>()

export function toursSeen(): TabName[] {
  return getItem<TabName[]>(KEY, [])
}

function save(seen: TabName[]) {
  setItem(KEY, seen)
  listeners.forEach((l) => l(seen))
}

/** Mostra de novo o passo a passo de todas as abas. */
export function resetTours() {
  save([])
}

/**
 * Cartão do passo a passo, preso acima das abas e do botão do chat. Não cobre a tela inteira:
 * o leitor de tela lê o cartão como qualquer outro conteúdo e a pessoa pode seguir usando o app.
 */
export function TabTour({ hidden, bottom }: { hidden: boolean; bottom: number }) {
  const { colors } = useTheme()
  const tab = tabFromPath(usePathname())
  const [seen, setSeen] = useState<TabName[]>(toursSeen)
  const [step, setStep] = useState(0)
  useEffect(() => {
    listeners.add(setSeen)
    return () => void listeners.delete(setSeen)
  }, [])
  useEffect(() => setStep(0), [tab])

  const show = !hidden && !!tab && !seen.includes(tab)
  useEffect(() => {
    if (show && tab) AccessibilityInfo.announceForAccessibility(`Passo a passo da aba ${TAB_LABEL[tab]}`)
  }, [show, tab])
  if (!show || !tab) return null

  const steps = TOURS[tab]
  const s = steps[Math.min(step, steps.length - 1)]
  const last = step >= steps.length - 1
  const finish = () => save([...seen, tab])
  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: bottom + MIN_TOUCH + 24,
        maxHeight: 360,
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
