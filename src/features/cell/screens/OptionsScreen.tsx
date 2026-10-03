import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Chip, ConfirmCard, Page, SectionLabel, Switch, useToast } from '../../../components'
import { IS_PREVIEW } from '../../../lib/preview'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { ROLE_LABEL, ROLES } from '../permissions'
import { CellGuard } from './Guard'

export function OptionsScreen() {
  return <CellGuard title="Opções da célula">{(cell) => <Options cell={cell} />}</CellGuard>
}

function Options({ cell }: { cell: Cell }) {
  const toast = useToast()
  const { update, leaveCell, setMyRole } = useCell()
  const [confirm, setConfirm] = useState<'leave' | 'archive' | null>(null)
  const [newLeader, setNewLeader] = useState<string | null>(null)
  const isLeader = cell.myRole === 'lider'
  const candidates = cell.members.filter((m) => !m.isMe && m.active && m.role !== 'visitante')

  return (
    <Page title="Opções da célula">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Silenciar avisos</AppText>
          <AppText variant="small" tone="secondary">
            Não receber notificações desta célula
          </AppText>
        </View>
        <Switch
          label="Silenciar avisos"
          value={cell.muted}
          onChange={(v) => {
            update((c) => ({ ...c, muted: v }))
            toast(v ? 'Avisos da célula silenciados' : 'Avisos da célula ligados')
          }}
        />
      </Card>

      {isLeader ? (
        <Card style={{ gap: 10 }}>
          <SectionLabel>Passar a liderança</SectionLabel>
          {candidates.length === 0 ? (
            <AppText variant="body" tone="secondary">
              Ainda não há outra pessoa ativa na célula.
            </AppText>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Novo líder">
                {candidates.map((m) => (
                  <Chip key={m.id} label={m.name} selected={newLeader === m.id} onPress={() => setNewLeader(m.id)} />
                ))}
              </View>
              {newLeader ? (
                <ConfirmCard
                  title={`Passar a liderança para ${cell.members.find((m) => m.id === newLeader)?.name}?`}
                  message="Você continua na célula como membro. Só o novo líder poderá editar a célula e aprovar entradas."
                  confirmLabel="Passar liderança"
                  danger={false}
                  onCancel={() => setNewLeader(null)}
                  onConfirm={() => {
                    update((c) => ({ ...c, myRole: 'membro', members: c.members.map((m) => (m.isMe ? { ...m, role: 'membro' } : m.id === newLeader ? { ...m, role: 'lider' } : m)) }))
                    toast('Liderança passada')
                    router.dismissTo('/celula')
                  }}
                />
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {isLeader ? (
        confirm === 'archive' ? (
          <ConfirmCard
            title={`Arquivar ${cell.name}?`}
            message="As reuniões, a escala e os avisos param. O histórico continua guardado e você pode reativar depois."
            confirmLabel="Arquivar"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              update((c) => ({ ...c, archived: true }))
              toast('Célula arquivada')
              router.dismissTo('/celula')
            }}
          />
        ) : (
          <Button label="Arquivar célula" variant="outline" onPress={() => setConfirm('archive')} />
        )
      ) : confirm === 'leave' ? (
        <ConfirmCard
          title={`Sair de ${cell.name}?`}
          message="Para voltar, você vai precisar de um novo convite e da aprovação do líder."
          confirmLabel="Sair"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            leaveCell()
            toast('Você saiu da célula')
            router.dismissTo('/celula')
          }}
        />
      ) : (
        <Button label="Sair da célula" variant="dangerSoft" onPress={() => setConfirm('leave')} />
      )}

      {IS_PREVIEW ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="small" tone="secondary">
            Só na prévia: ver a célula com outro papel
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => (
              <Chip
                key={r}
                label={ROLE_LABEL[r]}
                selected={cell.myRole === r}
                onPress={() => {
                  setMyRole(r)
                  router.dismissTo('/celula')
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </Page>
  )
}
