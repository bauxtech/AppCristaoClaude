import { View } from 'react-native'
import { AppText, Avatar, Button, Card, EmptyState, Page, useToast } from '../../../components'
import { formatDiaryDate } from '../../prayer/dates'
import { useCell } from '../CellContext'
import { CellGuard } from './Guard'
import { formatPhone } from './PeopleScreens'
import { useTheme } from '../../../theme/ThemeProvider'

/** O líder aprova cada pessoa que pediu para entrar (regra decidida), como membro ou como visitante. */
export function JoinRequestsScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()

  // Membro sem plano pega uma vaga livre na hora. Visitante não ocupa vaga e vira membro depois de algumas reuniões.
  function approve(j: { id: string; name: string; phone: string }, role: 'membro' | 'visitante') {
    update((c) => ({
      ...c,
      pendingJoins: c.pendingJoins.filter((x) => x.id !== j.id),
      members: [...c.members, { id: j.id, name: j.name, role, phone: j.phone, since: new Date().toISOString().slice(0, 10), active: true, lastAttendance: [] }],
    }))
    toast(role === 'visitante' ? `${j.name} entrou como visitante` : `${j.name} entrou na célula`)
  }

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
                  {j.requestedAt ? <AppText variant="small" tone="secondary">{`Pediu ${formatDiaryDate(j.requestedAt).toLowerCase()}`}</AppText> : null}
                </View>
              </View>
              {/* O que ajuda o líder a reconhecer quem pede (QA de 20/10). Telefone só o líder vê. */}
              {j.church || j.phone ? (
                <View style={{ gap: 2 }}>
                  {j.church ? <AppText variant="small">{`Igreja: ${j.church}`}</AppText> : null}
                  {j.phone ? <AppText variant="small">{`Celular: ${formatPhone(j.phone)}`}</AppText> : null}
                </View>
              ) : null}
              {j.message ? (
                <View style={{ borderRadius: 12, padding: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line }}>
                  <AppText variant="small" tone="secondary">
                    Mensagem
                  </AppText>
                  <AppText variant="body">{j.message}</AppText>
                </View>
              ) : null}
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
                <Button label="Aprovar" size="sm" onPress={() => approve(j, 'membro')} style={{ flex: 1 }} />
              </View>
              <Button label="Aprovar como visitante" variant="text" size="sm" onPress={() => approve(j, 'visitante')} />
            </Card>
          ))}
        </Page>
      )}
    </CellGuard>
  )
}
