import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Image, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Avatar, Button, Card, IconButton, SectionLabel, Tag, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { IS_PREVIEW } from '../../../lib/preview'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { memberName, useCell } from '../CellContext'
import { useBlockedIds } from '../../settings/SettingsContext'
import { WEEKDAYS_PLURAL, type Cell } from '../data'
import { formatMeeting, formatTime, missedTwoWeeks, nextMeeting } from '../meetings'
import { can, ROLE_LABEL } from '../permissions'
import { TileGrid } from './parts'

export function CellHubScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { cellStatus } = useSession()
  const { cell, refresh } = useCell()
  // Com servidor, a célula vem do banco de novo cada vez que a aba abre.
  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}>
      {cellStatus === 'pending' && !cell ? <Awaiting /> : !cell ? <Empty /> : cell.archived ? <Archived cell={cell} /> : cell.myRole === 'lider' ? <LeaderView cell={cell} /> : <MemberView cell={cell} />}
    </ScrollView>
  )
}

function Header({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 4 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="screenTitle" accessibilityRole="header">
          {title}
        </AppText>
        {sub ? (
          <AppText variant="small" tone="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  )
}

function Empty() {
  const { colors } = useTheme()
  return (
    <>
      <Header title="Célula" />
      <View style={{ alignItems: 'center', paddingVertical: 24, gap: 16 }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="people" size={36} color={colors.primary} />
        </View>
        <AppText variant="title" style={{ textAlign: 'center' }}>
          Você ainda não tem uma célula
        </AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          A célula é o pequeno grupo que se reúne toda semana. Você pode entrar no grupo de alguém ou criar o seu.
        </AppText>
      </View>
      <Button label="Entrar com convite" onPress={() => router.push('/celula/entrar')} />
      <Button label="Criar uma célula" variant="outline" onPress={() => router.push('/celula/criar')} />
      <Button label="Fazer isso depois" variant="text" onPress={() => router.navigate('/')} />
    </>
  )
}

function Awaiting() {
  const { colors } = useTheme()
  const { simulateApproval } = useCell()
  return (
    <>
      <Header title="Célula" />
      <Card style={{ gap: 10, alignItems: 'flex-start' }}>
        <Icon name="clock" size={28} color={colors.primary} />
        <AppText variant="title">Aguardando aprovação do líder</AppText>
        <AppText variant="body" tone="secondary">
          Seu pedido para entrar em Jovens da Central foi enviado para João Silva. Avisamos quando ele aprovar.
        </AppText>
      </Card>
      {IS_PREVIEW ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="small" tone="secondary">
            Só na prévia
          </AppText>
          <Button label="Simular aprovação como membro" variant="soft" onPress={() => simulateApproval('membro')} />
          <Button label="Simular aprovação como visitante" variant="outline" onPress={() => simulateApproval('visitante')} />
        </Card>
      ) : null}
    </>
  )
}

function Archived({ cell }: { cell: Cell }) {
  const { leaveCell, update } = useCell()
  return (
    <>
      <Header title="Célula" sub={cell.name} />
      <Card style={{ gap: 8 }}>
        <Tag label="Arquivada" tone="neutral" />
        <AppText variant="title">Esta célula foi arquivada</AppText>
        <AppText variant="body" tone="secondary">
          As reuniões, a escala e os avisos pararam. O histórico continua guardado.
        </AppText>
      </Card>
      {cell.myRole === 'lider' ? <Button label="Reativar a célula" onPress={() => update((c) => ({ ...c, archived: false }))} /> : null}
      <Button label="Sair da célula" variant="dangerSoft" onPress={leaveCell} />
    </>
  )
}

function MeetingCard({ cell, children }: { cell: Cell; children?: React.ReactNode }) {
  const { colors } = useTheme()
  const next = nextMeeting(cell)
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, overflow: 'hidden' }}>
      {cell.coverUri ? <Image source={{ uri: cell.coverUri }} style={{ width: '100%', height: 120 }} accessibilityIgnoresInvertColors accessible={false} /> : null}
      <View style={{ padding: 20, gap: 4 }}>
        <SectionLabel>Próxima reunião</SectionLabel>
        <AppText variant="bodyStrong">{next ? formatMeeting(next) : 'Nenhuma reunião marcada'}</AppText>
        <AppText variant="body" tone="secondary">
          {cell.address || cell.neighborhood}
        </AppText>
        {cell.reference ? (
          <AppText variant="small" tone="secondary">
            {cell.reference}
          </AppText>
        ) : null}
        {children ? <View style={{ marginTop: 12, gap: 8 }}>{children}</View> : null}
      </View>
    </View>
  )
}

function PlanCard({ cell }: { cell: Cell }) {
  return (
    <Card style={{ gap: 6 }}>
      <SectionLabel>Roteiro desta semana</SectionLabel>
      {cell.plan.length ? (
        <>
          <AppText variant="bodyStrong">{cell.planTitle || 'Roteiro da reunião'}</AppText>
          {cell.planRef ? (
            <AppText variant="small" tone="secondary">
              {cell.planRef}
            </AppText>
          ) : null}
          <Button label="Ver roteiro completo" variant="text" onPress={() => router.push('/celula/roteiro')} style={{ alignSelf: 'flex-start' }} />
        </>
      ) : (
        <AppText variant="body" tone="secondary">
          O líder ainda não montou o roteiro desta semana.
        </AppText>
      )}
    </Card>
  )
}

function LeaderView({ cell }: { cell: Cell }) {
  const blockedIds = useBlockedIds()
  const { colors } = useTheme()
  const active = cell.members.filter((m) => m.active)
  const absent = cell.members.filter((m) => !m.isMe && m.active && missedTwoWeeks(m.lastAttendance))
  const pendingSwaps = cell.swaps.filter((s) => s.status === 'pending')
  const prayers = cell.prayers.filter((p) => !cell.hidden.includes(p.id) && !blockedIds.has(p.memberId))
  const isNew = cell.members.length === 1
  const scheduleEmpty = cell.schedule.every((s) => !s.memberId)
  const birthdaysThisMonth = cell.members.filter((m) => m.birthday && Number(m.birthday.slice(0, 2)) === new Date().getMonth() + 1).length

  return (
    <>
      <Header
        title="Célula"
        sub={`${cell.name} · ${cell.members.length} ${cell.members.length === 1 ? 'pessoa' : 'pessoas'}`}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="edit" label="Editar célula" onPress={() => router.push('/celula/editar')} />
            <Button label="Convidar" variant="soft" size="sm" onPress={() => router.push('/celula/convidar')} />
          </View>
        }
      />

      {isNew ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Sua célula foi criada</AppText>
          <AppText variant="body" tone="secondary">
            Por enquanto só você está nela. Convide as pessoas pelo WhatsApp, QR code ou código.
          </AppText>
          <Button label="Convidar pessoas" onPress={() => router.push('/celula/convidar')} />
        </Card>
      ) : null}

      {cell.pendingJoins.length > 0 ? (
        <Card style={{ gap: 8, borderColor: colors.accent }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="bodyStrong">Pedidos de entrada</AppText>
            <Tag label={`${cell.pendingJoins.length} ${cell.pendingJoins.length === 1 ? 'novo' : 'novos'}`} tone="accent" />
          </View>
          <AppText variant="small" tone="secondary">
            Cada pessoa só entra depois que você aprovar.
          </AppText>
          <Button label="Ver pedidos de entrada" variant="outline" size="sm" onPress={() => router.push('/celula/entradas')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      <MeetingCard cell={cell}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Montar roteiro" size="sm" onPress={() => router.push('/celula/roteiro-editar')} style={{ flex: 1 }} />
          <Button label="Presença" variant="outline" size="sm" onPress={() => router.push('/celula/presenca')} style={{ flex: 1 }} />
        </View>
      </MeetingCard>

      {!isNew && (cell.plan.length === 0 || scheduleEmpty) ? (
        <Card style={{ gap: 6 }}>
          <AppText variant="bodyStrong">Falta preparar a semana</AppText>
          <AppText variant="body" tone="secondary">
            {[cell.plan.length === 0 ? 'o roteiro' : '', scheduleEmpty ? 'a escala' : ''].filter(Boolean).join(' e ').replace(/^./, (x) => x.toUpperCase())} desta semana ainda não foi montado.
          </AppText>
        </Card>
      ) : null}

      {absent.map((m) => (
        <Card key={m.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="alert" size={18} color={colors.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyStrong">{`${m.name} faltou nas últimas 2 semanas`}</AppText>
            <Button label={`Ver ${m.name.split(' ')[0]}`} variant="text" size="sm" onPress={() => router.push({ pathname: '/celula/membro/[id]', params: { id: m.id } })} style={{ alignSelf: 'flex-start' }} />
          </View>
        </Card>
      ))}

      {!isNew ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel>Pedidos de oração</SectionLabel>
            {prayers.length ? <Tag label={`${prayers.length}`} tone="accent" /> : null}
          </View>
          {prayers.length === 0 ? (
            <AppText variant="body" tone="secondary">
              Nenhum pedido na célula.
            </AppText>
          ) : (
            prayers.slice(0, 2).map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={memberName(cell, p.memberId) ?? '?'} size={32} />
                <View style={{ flex: 1 }}>
                  <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                    {memberName(cell, p.memberId)}
                  </AppText>
                  <AppText variant="body" tone="secondary">
                    {p.text}
                  </AppText>
                </View>
              </View>
            ))
          )}
          <Button label="Ver pedidos" variant="outline" size="sm" onPress={() => router.push('/celula/pedidos')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      {pendingSwaps.length > 0 ? (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="bodyStrong">Pedidos de troca de escala</AppText>
            <Tag label={`${pendingSwaps.length} ${pendingSwaps.length === 1 ? 'novo' : 'novos'}`} tone="accent" />
          </View>
          <AppText variant="small" tone="secondary">{`${memberName(cell, pendingSwaps[0].fromId)} para ${memberName(cell, pendingSwaps[0].toId)}, ${pendingSwaps[0].role}, ${pendingSwaps[0].date}`}</AppText>
          <Button label="Ver pedidos de troca" variant="outline" size="sm" onPress={() => router.push('/celula/trocas')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      <TileGrid
        items={[
          { label: 'Escala', sub: 'Esta semana', icon: 'calendarCheck', onPress: () => router.push('/celula/escala') },
          { label: 'Membros', sub: `${cell.members.length} ${cell.members.length === 1 ? 'pessoa' : 'pessoas'}`, icon: 'people', onPress: () => router.push('/celula/membros') },
          { label: 'Agenda', sub: 'Próximas reuniões', icon: 'calendar', onPress: () => router.push('/celula/agenda') },
          { label: 'Mural', sub: `${cell.board.length} ${cell.board.length === 1 ? 'aviso' : 'avisos'}`, icon: 'flag', onPress: () => router.push('/celula/mural') },
          { label: 'Materiais', sub: `${cell.materials.length} ${cell.materials.length === 1 ? 'arquivo' : 'arquivos'}`, icon: 'file', onPress: () => router.push('/celula/materiais') },
          { label: 'Playlist', sub: `${cell.playlist.length} ${cell.playlist.length === 1 ? 'música' : 'músicas'}`, icon: 'music', onPress: () => router.push('/celula/playlist') },
          { label: 'Aniversários', sub: birthdaysThisMonth ? `${birthdaysThisMonth} este mês` : 'Este mês', icon: 'gift', onPress: () => router.push('/celula/aniversarios') },
          { label: 'Histórico', sub: `${cell.history.meetings} reuniões`, icon: 'clock', onPress: () => router.push('/celula/historico') },
          { label: 'Plano de leitura', sub: 'Em grupo', icon: 'book', onPress: () => router.push('/celula/leitura') },
          { label: 'Minhas células', sub: 'Trocar ou adicionar', icon: 'users', onPress: () => router.push('/celula/minhas') },
        ]}
      />

      {active.length > cell.maxSize ? (
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="info" size={18} color={colors.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyStrong">Hora de multiplicar?</AppText>
            <AppText variant="small" tone="secondary">{`Sua célula tem ${active.length} pessoas ativas, acima do tamanho que você definiu (${cell.maxSize}). Considere dividir o grupo.`}</AppText>
            <Button label="Ver sugestão de multiplicação" variant="text" size="sm" onPress={() => router.push('/celula/multiplicar')} style={{ alignSelf: 'flex-start' }} />
          </View>
        </Card>
      ) : null}

      <Button label="Opções da célula" variant="outline" icon="more" onPress={() => router.push('/celula/opcoes')} />
    </>
  )
}

function MemberView({ cell }: { cell: Cell }) {
  const blockedIds = useBlockedIds()
  const toast = useToast()
  const { update } = useCell()
  const leader = cell.members.find((m) => m.role === 'lider')
  const role = cell.myRole
  const isVisitor = role === 'visitante'
  const going = cell.confirmedOthers + (cell.myRsvp === 'vou' ? 1 : 0)
  const myNext = cell.schedule.find((s) => s.memberId === 'me')

  function rsvp(v: 'vou' | 'naovou') {
    update((c) => ({ ...c, myRsvp: v }))
    const total = cell.confirmedOthers + (v === 'vou' ? 1 : 0)
    toast(`${v === 'vou' ? 'Presença confirmada' : 'Ausência avisada'}. ${total} ${total === 1 ? 'pessoa vai' : 'pessoas vão'}`)
  }

  return (
    <>
      <Header
        title="Célula"
        sub={`${cell.name} · ${leader ? `${leader.name} lidera` : ''} · ${WEEKDAYS_PLURAL[cell.day]}, ${formatTime(cell.time)}`}
        right={<IconButton icon="more" label="Opções da célula" onPress={() => router.push('/celula/opcoes')} />}
      />
      {role !== 'membro' ? (
        <View style={{ alignItems: 'flex-start', paddingHorizontal: 4 }}>
          <Tag label={`Você é ${ROLE_LABEL[role].toLowerCase()}`} />
        </View>
      ) : null}

      <MeetingCard cell={cell}>
        {!isVisitor ? (
          <>
            <AppText variant="bodyStrong">Você vai?</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Você vai?">
              {(['vou', 'naovou'] as const).map((v) => {
                const sel = cell.myRsvp === v
                return <Button key={v} label={v === 'vou' ? 'Vou' : 'Não vou'} variant={sel ? 'primary' : 'outline'} icon={sel ? 'check' : undefined} onPress={() => rsvp(v)} style={{ flex: 1 }} />
              })}
            </View>
            <AppText variant="small" tone="secondary" accessibilityLiveRegion="polite">{`${going} ${going === 1 ? 'pessoa confirmou' : 'pessoas confirmaram'}`}</AppText>
          </>
        ) : null}
      </MeetingCard>

      <PlanCard cell={cell} />

      {can(role, 'markAttendance') ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Como auxiliar, você pode</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Marcar presença" size="sm" onPress={() => router.push('/celula/presenca')} style={{ flex: 1 }} />
            <Button label="Editar escala" variant="outline" size="sm" onPress={() => router.push('/celula/escala-editar')} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      {!isVisitor ? (
        <TileGrid
          items={[
            { label: 'Pedidos', sub: `${cell.prayers.filter((p) => !cell.hidden.includes(p.id) && !blockedIds.has(p.memberId)).length} na célula`, icon: 'chat', onPress: () => router.push('/celula/pedidos') },
            { label: 'Carona', sub: 'Pedir ou oferecer', icon: 'car', onPress: () => router.push('/celula/carona') },
            { label: 'Minha escala', sub: myNext ? myNext.role : 'Sem função esta semana', icon: 'calendarCheck', onPress: () => router.push('/celula/escala') },
            { label: 'Membros', sub: `${cell.members.length} pessoas`, icon: 'people', onPress: () => router.push('/celula/membros') },
            { label: 'Mural', sub: 'Avisos e enquetes', icon: 'flag', onPress: () => router.push('/celula/mural') },
            { label: 'Materiais', sub: 'Arquivos', icon: 'file', onPress: () => router.push('/celula/materiais') },
            { label: 'Playlist', sub: 'Músicas da semana', icon: 'music', onPress: () => router.push('/celula/playlist') },
            { label: 'Plano de leitura', sub: 'Em grupo', icon: 'book', onPress: () => router.push('/celula/leitura') },
          ]}
        />
      ) : (
        <Card>
          <AppText variant="body" tone="secondary">
            Como visitante, você vê a reunião, o endereço e o roteiro. Quando o líder mudar seu papel para membro, o resto da célula aparece aqui.
          </AppText>
        </Card>
      )}
    </>
  )
}
