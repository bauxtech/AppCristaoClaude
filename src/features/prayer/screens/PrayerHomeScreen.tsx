import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { AppText, Card, IconButton, MIN_TOUCH, ProgressBar, SectionLabel, Tag } from '../../../components'
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

        <Card style={{ gap: 12 }}>
          <SectionLabel>Momentos de oração</SectionLabel>
          <View style={{ gap: 8 }}>
            {THEMES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/oracao/momento/[tema]', params: { tema: t.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${t.label}, ${t.durations.join(', ').replace(/, (\d+)$/, ' ou $1')} minutos`}
                style={({ pressed }) => ({
                  minHeight: MIN_TOUCH + 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: colors.bg,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
                  <Icon name={t.icon} size={18} color={colors.primary} />
                  <AppText style={{ fontFamily: fonts.medium }}>{t.label}</AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {t.durations.map((d) => (
                    <Tag key={d} label={`${d} min`} />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Tile icon="file" title="Diário" sub="Registro pessoal" onPress={() => router.push('/oracao/diario')} />
          <Tile icon="chat" title="Pedidos" sub={`${active} ${active === 1 ? 'ativo' : 'ativos'}`} onPress={() => router.push('/oracao/pedidos')} />
        </View>

        {campaign && info ? (
          <Pressable
            onPress={() => router.push({ pathname: '/oracao/campanhas/[id]', params: { id: campaign.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Campanha em andamento: ${campaign.name}. Dia ${info.today} de ${info.total}. Termina em ${info.daysLeft} dias`}
            style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, padding: 20, gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
                <Tag label="Em andamento" tone="solid" />
                <AppText variant="bodyStrong">{campaign.name}</AppText>
                <AppText variant="small" tone="secondary">{`Dia ${info.today} de ${info.total} · Termina em ${info.daysLeft} ${info.daysLeft === 1 ? 'dia' : 'dias'}`}</AppText>
              </View>
              <Icon name="chevronRight" size={20} color={colors.primary} />
            </View>
            <ProgressBar value={info.doneCount} max={info.total} label={`${info.doneCount} de ${info.total} dias concluídos`} />
          </Pressable>
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
