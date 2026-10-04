import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { AppText, Card, Carousel, IconButton, MIN_TOUCH, useCarouselItemWidth } from '../../../components'
import { PrayerMomentsSection } from '../../home/HomeSections'
import { CampaignCover } from './CampaignsScreen'
import { Icon, type IconName } from '../../../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { campaignInfo } from '../campaign'
import { THEMES } from '../data'
import { usePrayer } from '../PrayerContext'

export function PrayerHomeScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const prayer = usePrayer()
  const active = prayer.requests.filter((r) => !r.answeredAt).length
  const campaign = prayer.campaigns.find((c) => campaignInfo(c).status === 'active')
  const info = campaign ? campaignInfo(campaign) : null
  const coverWidth = useCarouselItemWidth()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <IconButton icon="close" label="Fechar oração" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 12 }}>
        <View style={{ paddingHorizontal: 4, paddingBottom: 4, gap: 4 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            Oração
          </AppText>
          <AppText variant="small" tone="secondary">
            Momentos guiados, diário e pedidos
          </AppText>
        </View>

        <PrayerMomentsSection seeAll={false} />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Tile icon="file" title="Diário" sub="Registro pessoal" onPress={() => router.push('/oracao/diario')} />
          <Tile icon="chat" title="Pedidos" sub={`${active} ${active === 1 ? 'ativo' : 'ativos'}`} onPress={() => router.push('/oracao/pedidos')} />
        </View>

        {campaign && info ? (
          <Carousel title="Campanhas" onSeeAll={() => router.push('/oracao/campanhas')} seeAllHint="Abre todas as campanhas">
            <CampaignCover c={campaign} width={coverWidth} />
          </Carousel>
        ) : (
          <Card style={{ paddingVertical: 6 }}>
            <Pressable
              onPress={() => router.push('/oracao/campanhas')}
              accessibilityRole="button"
              accessibilityLabel="Campanhas de oração, jejum e propósito"
              style={{ minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Icon name="flag" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Campanhas</AppText>
                <AppText variant="small" tone="secondary">
                  Oração, jejum e propósito
                </AppText>
              </View>
              <Icon name="chevronRight" size={18} color={colors.lineStrong} />
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      style={({ pressed }) => ({ flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 4, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ marginBottom: 8 }}>
        <Icon name={icon} size={22} color={colors.primary} />
      </View>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="small" tone="secondary">
        {sub}
      </AppText>
    </Pressable>
  )
}
