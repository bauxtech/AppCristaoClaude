import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, Cover, CoverGrid, coverStyle, SectionLabel, useGridItemWidth } from '../../../components'
import { campaignInfo } from '../campaign'
import type { Campaign } from '../data'
import { formatDayMonth } from '../dates'
import { usePrayer } from '../PrayerContext'
import { EmptyState, PrayerPage } from './parts'

export function CampaignsScreen() {
  const prayer = usePrayer()
  const width = useGridItemWidth()
  const withInfo = prayer.campaigns.map((c) => ({ c, info: campaignInfo(c) }))
  const current = withInfo.filter((x) => x.info.status !== 'done')
  const done = withInfo.filter((x) => x.info.status === 'done')

  return (
    <PrayerPage title="Campanhas">
      <Button label="Nova campanha" icon="plus" variant="outline" onPress={() => router.push('/oracao/campanhas/nova')} />
      <View style={{ gap: 12 }}>
        <SectionLabel>Em andamento</SectionLabel>
        {current.length === 0 ? (
          <EmptyState text="Nenhuma campanha em andamento." />
        ) : (
          <CoverGrid>
            {current.map(({ c }) => (
              <CampaignCover key={c.id} c={c} width={width} />
            ))}
          </CoverGrid>
        )}
      </View>
      {done.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionLabel>Concluídas</SectionLabel>
          <CoverGrid>
            {done.map(({ c }) => (
              <CampaignCover key={c.id} c={c} width={width} />
            ))}
          </CoverGrid>
        </View>
      ) : null}
    </PrayerPage>
  )
}

export function CampaignCover({ c, width }: { c: Campaign; width?: number }) {
  const info = campaignInfo(c)
  const isDone = info.status === 'done'
  const sub = isDone
    ? `Concluída em ${formatDayMonth(c.end)}`
    : info.status === 'notStarted'
      ? `Começa em ${formatDayMonth(c.start)}`
      : `Dia ${info.today} de ${info.total}`
  return (
    <Cover
      title={c.name}
      {...coverStyle(c.id)}
      tag={c.type}
      info={sub}
      progress={info.status === 'active' ? { value: info.doneCount, max: info.total } : undefined}
      label={`Campanha de ${c.type.toLowerCase()} ${c.name}, ${sub.toLowerCase()}`}
      width={width}
      onPress={() => router.push({ pathname: '/oracao/campanhas/[id]', params: { id: c.id } })}
    />
  )
}
