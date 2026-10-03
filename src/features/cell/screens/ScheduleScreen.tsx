import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Chip, Page, SectionLabel, Tag, TextField, useToast } from '../../../components'
import { memberName, useCell } from '../CellContext'
import type { Cell } from '../data'
import { formatMeeting, nextMeeting } from '../meetings'
import { can } from '../permissions'
import { CellGuard } from './Guard'
import { InfoRow } from './parts'

export function ScheduleScreen() {
  return (
    <CellGuard title="Escala da semana" action="participate">
      {(cell) => {
        const next = nextMeeting(cell)
        const mine = cell.schedule.filter((s) => s.memberId === 'me')
        return (
          <Page title="Escala da semana">
            {mine.length ? (
              <Card style={{ gap: 4 }}>
                <SectionLabel>Sua função</SectionLabel>
                <AppText variant="bodyStrong">{mine.map((s) => s.role).join(', ')}</AppText>
                {next ? (
                  <AppText variant="small" tone="secondary">
                    {formatMeeting(next)}
                  </AppText>
                ) : null}
              </Card>
            ) : null}
            <Card style={{ paddingVertical: 4 }}>
              {next ? <AppText variant="label" tone="secondary" style={{ paddingTop: 12 }}>{formatMeeting(next).toUpperCase()}</AppText> : null}
              {cell.schedule.map((s) => (
                <InfoRow key={s.role} label={s.role} value={memberName(cell, s.memberId) ?? 'Ninguém'} muted={!s.memberId} />
              ))}
            </Card>
            {cell.schedule.every((s) => !s.memberId) ? (
              <AppText variant="body" tone="secondary">
                A escala desta semana ainda não foi montada.
              </AppText>
            ) : null}
            {can(cell.myRole, 'editSchedule') ? <Button label="Editar escala" variant="outline" onPress={() => router.push('/celula/escala-editar')} /> : null}
            {can(cell.myRole, 'approveSwaps') ? <Button label="Pedidos de troca" variant="text" onPress={() => router.push('/celula/trocas')} /> : null}
            {cell.myRole !== 'lider' && can(cell.myRole, 'askSwap') ? <Button label="Pedir troca de escala" variant="outline" onPress={() => router.push('/celula/pedir-troca')} /> : null}
          </Page>
        )
      }}
    </CellGuard>
  )
}

/** Líder e auxiliar editam. Quem não assinou (inativo) não entra na escala. */
export function EditScheduleScreen() {
  return <CellGuard title="Editar escala" action="editSchedule">{(cell) => <EditSchedule cell={cell} />}</CellGuard>
}

function EditSchedule({ cell }: { cell: Cell }) {
  const toast = useToast()
  const { update } = useCell()
  const [rows, setRows] = useState(cell.schedule)
  const [open, setOpen] = useState<string | null>(null)
  const [newRole, setNewRole] = useState('')
  const options = cell.members.filter((m) => m.active && m.role !== 'visitante')
  const inactive = cell.members.filter((m) => !m.active)

  return (
    <Page title="Editar escala">
      {inactive.length ? (
        <AppText variant="small" tone="secondary">{`${inactive.map((m) => m.name).join(', ')} ${inactive.length === 1 ? 'está inativo e não aparece' : 'estão inativos e não aparecem'} na escala.`}</AppText>
      ) : null}
      {rows.map((r) => (
        <Card key={r.role} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" tone="secondary">
                {r.role}
              </AppText>
              <AppText variant="bodyStrong">{memberName(cell, r.memberId) ?? 'Ninguém'}</AppText>
            </View>
            <Button label={open === r.role ? 'Fechar' : 'Trocar'} variant="text" size="sm" onPress={() => setOpen(open === r.role ? null : r.role)} accessibilityHint={`Escolher quem faz ${r.role}`} />
          </View>
          {open === r.role ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={r.role}>
              <Chip label="Ninguém" selected={!r.memberId} onPress={() => setRows((x) => x.map((y) => (y.role === r.role ? { ...y, memberId: null } : y)))} />
              {options.map((m) => (
                <Chip key={m.id} label={m.isMe ? `${m.name} (você)` : m.name} selected={r.memberId === m.id} onPress={() => setRows((x) => x.map((y) => (y.role === r.role ? { ...y, memberId: m.id } : y)))} />
              ))}
            </View>
          ) : null}
        </Card>
      ))}
      <View style={{ gap: 8 }}>
        <TextField label="Nova função" value={newRole} onChangeText={setNewRole} placeholder="Ex.: Recepção" maxLength={40} />
        <Button
          label="Acrescentar função"
          icon="plus"
          variant="soft"
          disabled={!newRole.trim() || rows.some((r) => r.role.toLowerCase() === newRole.trim().toLowerCase())}
          onPress={() => {
            setRows((x) => [...x, { role: newRole.trim(), memberId: null }])
            setNewRole('')
          }}
        />
      </View>
      <Button
        label="Salvar escala"
        onPress={() => {
          update((c) => ({ ...c, schedule: rows }))
          toast('Escala salva')
          router.back()
        }}
      />
    </Page>
  )
}

export function SwapRequestsScreen() {
  const toast = useToast()
  const { update } = useCell()
  return (
    <CellGuard title="Pedidos de troca" action="approveSwaps">
      {(cell) => (
        <Page title="Pedidos de troca">
          {cell.swaps.length === 0 ? <AppText variant="body" tone="secondary">Nenhum pedido de troca.</AppText> : null}
          {cell.swaps.map((s) => (
            <Card key={s.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{`${memberName(cell, s.fromId)} para ${memberName(cell, s.toId)}`}</AppText>
                  <AppText variant="small" tone="secondary">{`${s.role} · ${s.date}`}</AppText>
                  {s.reason ? <AppText variant="small">{s.reason}</AppText> : null}
                </View>
                {s.status === 'approved' ? <Tag label="Aprovada" /> : s.status === 'declined' ? <Tag label="Recusada" tone="danger" /> : null}
              </View>
              {s.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="Recusar"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      update((c) => ({ ...c, swaps: c.swaps.map((x) => (x.id === s.id ? { ...x, status: 'declined' } : x)) }))
                      toast('Troca recusada')
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Aprovar"
                    size="sm"
                    onPress={() => {
                      update((c) => ({
                        ...c,
                        swaps: c.swaps.map((x) => (x.id === s.id ? { ...x, status: 'approved' } : x)),
                        schedule: c.schedule.map((r) => (r.role === s.role && r.memberId === s.fromId ? { ...r, memberId: s.toId } : r)),
                      }))
                      toast('Troca aprovada. A escala foi atualizada')
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </Page>
      )}
    </CellGuard>
  )
}

export function AskSwapScreen() {
  const toast = useToast()
  const { update } = useCell()
  const [role, setRole] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  return (
    <CellGuard title="Pedir troca" action="askSwap">
      {(cell) => {
        const mine = cell.schedule.filter((s) => s.memberId === 'me')
        const others = cell.members.filter((m) => !m.isMe && m.active && m.role !== 'visitante')
        const next = nextMeeting(cell)
        if (mine.length === 0) {
          return (
            <Page title="Pedir troca">
              <AppText variant="body">Você não tem função na escala desta semana.</AppText>
            </Page>
          )
        }
        return (
          <Page title="Pedir troca">
            <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Função">
              <AppText variant="bodyStrong">Função</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {mine.map((s) => (
                  <Chip key={s.role} label={s.role} selected={role === s.role} onPress={() => setRole(s.role)} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Trocar com">
              <AppText variant="bodyStrong">Trocar com</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {others.map((m) => (
                  <Chip key={m.id} label={m.name} selected={to === m.id} onPress={() => setTo(m.id)} />
                ))}
              </View>
            </View>
            <TextField label="Motivo (opcional)" value={reason} onChangeText={setReason} multiline maxLength={200} />
            <Button
              label="Enviar pedido"
              disabled={!role || !to}
              onPress={() => {
                update((c) => ({ ...c, swaps: [...c.swaps, { id: `s${Date.now()}`, fromId: 'me', toId: to!, role: role!, date: next ? formatMeeting(next) : '', reason: reason.trim() || undefined, status: 'pending' }] }))
                toast('Pedido enviado ao líder')
                router.back()
              }}
            />
          </Page>
        )
      }}
    </CellGuard>
  )
}
