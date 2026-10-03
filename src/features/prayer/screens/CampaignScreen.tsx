import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Card, ProgressBar, SectionLabel, Tag } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { campaignInfo } from '../campaign'
import { formatDayMonth } from '../dates'
import { usePrayer } from '../PrayerContext'
import { PrayerPage } from './parts'

export function CampaignScreen() {
  const { colors } = useTheme()
  const prayer = usePrayer()
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = prayer.campaigns.find((x) => x.id === id)

  if (!c) {
    return (
      <PrayerPage title="Campanha">
        <AppText variant="body">Esta campanha não existe mais.</AppText>
      </PrayerPage>
    )
  }

  const info = campaignInfo(c)
  const days = Array.from({ length: info.total }, (_, i) => i + 1)

  return (
    <PrayerPage title={c.name}>
      <Card style={{ gap: 10 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Tag label={c.type} tone={info.status === 'done' ? 'neutral' : 'solid'} />
        </View>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {c.name}
        </AppText>
        <AppText variant="small" tone="secondary">
          {`${formatDayMonth(c.start)} a ${formatDayMonth(c.end)}${info.status === 'active' ? ` · Dia ${info.today} de ${info.total}` : ''}`}
        </AppText>
        <ProgressBar value={info.doneCount} max={info.total} label={`${info.doneCount} de ${info.total} dias concluídos`} />
      </Card>

      {info.status === 'done' ? (
        <Card style={{ alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderColor: colors.primary }} accessibilityLiveRegion="polite">
          <Icon name="check" size={28} color={colors.primary} strokeWidth={2.5} />
          <AppText variant="bodyStrong" tone="brand">
            Campanha concluída
          </AppText>
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            {`Você orou em ${info.doneCount} de ${info.total} dias.`}
          </AppText>
        </Card>
      ) : null}

      <View style={{ gap: 12 }}>
        <SectionLabel>Dias da campanha</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {days.map((d) => {
            const done = c.doneDays.includes(d)
            const isToday = info.status === 'active' && d === info.today
            return (
              <View key={d} style={{ width: `${100 / 7}%`, padding: 4 }}>
                <View
                  accessible
                  accessibilityLabel={`Dia ${d}${done ? ', concluído' : ''}${isToday ? ', hoje' : ''}`}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.primary : colors.card,
                    borderWidth: isToday ? 2 : 1,
                    borderColor: isToday ? colors.primary : colors.line,
                  }}
                >
                  {done ? (
                    <Icon name="check" size={16} color={colors.primaryText} strokeWidth={2.5} />
                  ) : (
                    <AppText variant="small" style={{ fontFamily: fonts.semibold, color: isToday ? colors.primary : colors.textSecondary }}>
                      {d}
                    </AppText>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {info.status === 'active' ? (
        info.todayDone ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={18} color={colors.primary} strokeWidth={2.5} />
            <AppText variant="bodyStrong">{`Dia ${info.today} concluído`}</AppText>
          </Card>
        ) : (
          <Button label={`Orar o dia ${info.today}`} onPress={() => router.push({ pathname: '/oracao/campanhas/[id]/dia', params: { id: c.id } })} />
        )
      ) : info.status === 'notStarted' ? (
        <AppText variant="body" tone="secondary">{`A campanha começa em ${formatDayMonth(c.start)}.`}</AppText>
      ) : null}
    </PrayerPage>
  )
}
