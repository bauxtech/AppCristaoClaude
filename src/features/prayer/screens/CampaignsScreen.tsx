import { router } from 'expo-router'
import { Pressable, View } from 'react-native'
import { AppText, Button, ProgressBar, SectionLabel, Tag } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { campaignInfo } from '../campaign'
import type { Campaign } from '../data'
import { formatBR, formatDayMonth } from '../dates'
import { usePrayer } from '../PrayerContext'
import { EmptyState, PrayerPage } from './parts'

export function CampaignsScreen() {
  const prayer = usePrayer()
  const withInfo = prayer.campaigns.map((c) => ({ c, info: campaignInfo(c) }))
  const current = withInfo.filter((x) => x.info.status !== 'done')
  const done = withInfo.filter((x) => x.info.status === 'done')

  return (
    <PrayerPage title="Campanhas">
      <Button label="Nova campanha" icon="plus" variant="outline" onPress={() => router.push('/oracao/campanhas/nova')} />
      <View style={{ gap: 12 }}>
        <SectionLabel>Em andamento</SectionLabel>
        {current.length === 0 ? <EmptyState text="Nenhuma campanha em andamento." /> : current.map(({ c }) => <CampaignCard key={c.id} c={c} />)}
      </View>
      {done.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionLabel>Concluídas</SectionLabel>
          {done.map(({ c }) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </View>
      ) : null}
    </PrayerPage>
  )
}

function CampaignCard({ c }: { c: Campaign }) {
  const { colors } = useTheme()
  const info = campaignInfo(c)
  const isDone = info.status === 'done'
  const sub = isDone
    ? `Concluída em ${formatDayMonth(c.end)} · ${info.doneCount} de ${info.total} dias`
    : info.status === 'notStarted'
      ? `Começa em ${formatDayMonth(c.start)}`
      : `Dia ${info.today} de ${info.total} · ${formatBR(c.start)} a ${formatBR(c.end)}`
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/oracao/campanhas/[id]', params: { id: c.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${c.type}. ${c.name}. ${sub}`}
      style={({ pressed }) => ({
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDone ? colors.line : colors.primary,
        backgroundColor: isDone ? colors.card : colors.primarySoft,
        padding: 16,
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
          <Tag label={c.type} tone={isDone ? 'neutral' : 'solid'} />
          <AppText variant="bodyStrong">{c.name}</AppText>
          <AppText variant="small" tone="secondary">
            {sub}
          </AppText>
        </View>
        {isDone ? (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={14} color={colors.primary} strokeWidth={2.5} />
          </View>
        ) : (
          <Icon name="chevronRight" size={20} color={colors.primary} />
        )}
      </View>
      {!isDone ? <ProgressBar value={info.doneCount} max={info.total} label={`${info.doneCount} de ${info.total} dias concluídos`} /> : null}
    </Pressable>
  )
}
