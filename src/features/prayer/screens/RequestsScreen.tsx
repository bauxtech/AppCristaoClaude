import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Segmented, Tag } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { campaignInfo } from '../campaign'
import type { PrayerRequest } from '../data'
import { formatAgo, formatDayMonth } from '../dates'
import { usePrayer } from '../PrayerContext'
import { EmptyState, PrayerPage } from './parts'

export function RequestsScreen() {
  const { colors } = useTheme()
  const prayer = usePrayer()
  const { cellStatus } = useSession()
  const hasCell = cellStatus === 'member' || cellStatus === 'leader'
  const [filter, setFilter] = useState<'orando' | 'respondidos'>('orando')
  const praying = prayer.requests.filter((r) => !r.answeredAt)
  const answered = prayer.requests.filter((r) => r.answeredAt).sort((a, b) => (b.answeredAt! > a.answeredAt! ? 1 : -1))
  const list = filter === 'orando' ? praying : answered
  const campaign = prayer.campaigns.find((c) => campaignInfo(c).status === 'active')

  return (
    <PrayerPage title="Pedidos de oração">
      <Segmented
        label="Filtro dos pedidos"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'orando', label: `Orando (${praying.length})` },
          { id: 'respondidos', label: `Respondidos (${answered.length})` },
        ]}
      />
      <Button label="Novo pedido" icon="plus" variant="outline" onPress={() => router.push('/oracao/pedidos/novo')} />
      {filter === 'respondidos' && answered.length > 0 ? <Button label="Ver linha do tempo dos respondidos" variant="soft" onPress={() => router.push('/oracao/respondidos')} /> : null}

      {list.length === 0 ? (
        <EmptyState text={filter === 'orando' ? 'Nenhum pedido ainda. Escreva o que está no seu coração.' : 'Nenhum pedido respondido ainda.'} />
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((r) => (
            <RequestCard key={r.id} r={r} hasCell={hasCell} />
          ))}
        </View>
      )}

      {campaign ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 16, gap: 10 }}>
          <View style={{ alignItems: 'flex-start', gap: 6 }}>
            <Tag label="Em andamento" tone="solid" />
            <AppText variant="bodyStrong">{campaign.name}</AppText>
          </View>
          <Button label="Ver campanhas" size="sm" onPress={() => router.push('/oracao/campanhas')} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
    </PrayerPage>
  )
}

function RequestCard({ r, hasCell }: { r: PrayerRequest; hasCell: boolean }) {
  const { colors } = useTheme()
  const when = r.answeredAt ? `Respondido em ${formatDayMonth(r.answeredAt)}` : `Criado ${formatAgo(r.createdAt)}`
  const shared = r.shared && hasCell
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/oracao/pedidos/[id]', params: { id: r.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${r.title}. ${when}${shared ? '. Compartilhado com a célula' : ''}${r.videoUri ? '. Em vídeo, Libras' : ''}`}
      style={({ pressed }) => ({ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <AppText style={{ fontFamily: fonts.medium }}>{r.title}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="small" tone="secondary">
            {when}
          </AppText>
          {shared ? <Tag label="Célula" /> : null}
          {r.videoUri ? <Tag label="Libras" tone="neutral" /> : null}
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={colors.lineStrong} />
    </Pressable>
  )
}
