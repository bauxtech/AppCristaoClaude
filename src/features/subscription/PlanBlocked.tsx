import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppText, Button, Sheet } from '../../components'
import { planInfo, type PlanId } from './plan'

// Aviso de plano (pedido do Thiago, 24/10): quando o plano venceu, o teste acabou ou a célula está parada,
// o app não mostra erro. Diz o que aconteceu e já oferece o plano que libera a função.

export interface PlanBlock {
  title: string
  text: string
  plan: PlanId
  /** De onde veio, guardado em paywall_events ao abrir a tela de planos. */
  origin: string
}

let current: PlanBlock | null = null
const listeners = new Set<(b: PlanBlock | null) => void>()

export function showPlanBlocked(b: PlanBlock) {
  current = b
  listeners.forEach((l) => l(b))
}

function close() {
  current = null
  listeners.forEach((l) => l(null))
}

/** Painel único do app, montado na raiz. */
export function PlanBlockedSheet() {
  const [b, setB] = useState<PlanBlock | null>(current)
  useEffect(() => {
    listeners.add(setB)
    return () => void listeners.delete(setB)
  }, [])
  return (
    <Sheet visible={!!b} onClose={close} title={b?.title ?? ''}>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
        {b?.text ?? ''}
      </AppText>
      {b ? (
        <Button
          label={`Ver plano ${planInfo(b.plan).name}`}
          onPress={() => {
            close()
            router.push(`/assinatura?plano=${b.plan}&origem=${b.origin}` as '/assinatura')
          }}
        />
      ) : null}
      <Button label="Agora não" variant="text" onPress={close} />
    </Sheet>
  )
}

/** Célula parada: o líder vê a oferta do plano Líder; o membro, o motivo. */
export function cellPausedBlock(leader: boolean): PlanBlock {
  return leader
    ? {
        title: 'Célula parada',
        text: 'Sem o plano Líder, a célula fica só para leitura: reunião, escala, presença, avisos e site ficam parados. Nada foi apagado. Assine o plano Líder e tudo volta como estava.',
        plan: 'lider',
        origin: 'celula-parada',
      }
    : {
        title: 'Célula parada',
        text: 'O líder da célula está sem o plano Líder, e a célula fica só para leitura até ele voltar a assinar. Nada foi apagado.',
        plan: 'lider',
        origin: 'celula-parada-membro',
      }
}
