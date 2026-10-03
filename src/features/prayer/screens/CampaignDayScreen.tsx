import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { AppText, Button, Card, Tag, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { verseText } from '../../bible/text'
import { campaignInfo } from '../campaign'
import { usePrayer } from '../PrayerContext'
import { PrayerPage } from './parts'

export function CampaignDayScreen() {
  const { colors } = useTheme()
  const toast = useToast()
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
  const day = info.today
  const content = c.days?.[day]
  const verse = content?.verse ? verseText(content.verse.book, content.verse.chapter, content.verse.verse) : ''

  return (
    <PrayerPage title={`Dia ${day}`}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Tag label={c.name} />
        <AppText variant="screenTitle" accessibilityRole="header">{`Dia ${day} de ${info.total}`}</AppText>
        {content ? (
          <AppText variant="body" tone="secondary">
            {content.title}
          </AppText>
        ) : null}
      </View>

      {content ? (
        <Card style={{ gap: 14 }}>
          {content.paragraphs.map((p, i) => (
            <AppText key={i} variant="bible">
              {p}
            </AppText>
          ))}
          {verse && content.verse ? <AppText variant="bible">{`"${verse}" ${content.verse.book} ${content.verse.chapter}:${content.verse.verse}`}</AppText> : null}
        </Card>
      ) : null}

      {info.todayDone ? (
        <Card style={{ alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderColor: colors.primary }} accessibilityLiveRegion="polite">
          <Icon name="check" size={28} color={colors.primary} strokeWidth={2.5} />
          <AppText variant="bodyStrong" tone="brand">{`Dia ${day} concluído`}</AppText>
          <Button label="Voltar para a campanha" variant="text" onPress={() => router.back()} />
        </Card>
      ) : (
        <Button
          label="Concluir o dia"
          onPress={() => {
            prayer.markCampaignDay(c.id, day)
            toast(`Dia ${day} concluído`)
          }}
        />
      )}
    </PrayerPage>
  )
}
