import { View } from 'react-native'
import { AppText, Avatar, Button, Card, EmptyState, Page, useToast } from '../../../components'
import { formatDiaryDate } from '../../prayer/dates'
import { useCell } from '../CellContext'
import { CellGuard } from './Guard'

/** O líder aprova cada pessoa que pediu para entrar (regra decidida). */
export function JoinRequestsScreen() {
  const toast = useToast()
  const { update } = useCell()
  return (
    <CellGuard title="Pedidos de entrada" action="approveJoin">
      {(cell) => (
        <Page title="Pedidos de entrada">
          {cell.pendingJoins.length === 0 ? <EmptyState text="Nenhum pedido de entrada." /> : null}
          {cell.pendingJoins.map((j) => (
            <Card key={j.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Avatar name={j.name} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{j.name}</AppText>
                  <AppText variant="small" tone="secondary">{`Pediu ${formatDiaryDate(j.requestedAt).toLowerCase()}`}</AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Recusar"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    update((c) => ({ ...c, pendingJoins: c.pendingJoins.filter((x) => x.id !== j.id) }))
                    toast(`Pedido de ${j.name} recusado`)
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Aprovar"
                  size="sm"
                  onPress={() => {
                    update((c) => ({
                      ...c,
                      pendingJoins: c.pendingJoins.filter((x) => x.id !== j.id),
                      members: [...c.members, { id: `u${j.id}`, name: j.name, role: 'membro', phone: j.phone, since: new Date().toISOString().slice(0, 10), active: true, lastAttendance: [] }],
                    }))
                    toast(`${j.name} entrou na célula`)
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))}
        </Page>
      )}
    </CellGuard>
  )
}
