import { View } from 'react-native'
import { AppText } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { formatDayMonth } from '../dates'
import { usePrayer } from '../PrayerContext'
import { EmptyState, PrayerPage } from './parts'

/** Linha do tempo dos pedidos respondidos, do mais recente ao mais antigo. */
export function TimelineScreen() {
  const { colors } = useTheme()
  const prayer = usePrayer()
  const answered = prayer.requests.filter((r) => r.answeredAt).sort((a, b) => (b.answeredAt! > a.answeredAt! ? 1 : -1))

  return (
    <PrayerPage title="Pedidos respondidos">
      {answered.length === 0 ? (
        <EmptyState text="Nenhum pedido respondido ainda." />
      ) : (
        <View>
          <View style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, backgroundColor: colors.line }} />
          <View style={{ gap: 24 }}>
            {answered.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', gap: 16 }} accessible accessibilityLabel={`Respondido em ${formatDayMonth(r.answeredAt!)}. ${r.title}.${r.testimony ? ` ${r.testimony}` : ''}`}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={16} color={colors.primary} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="small" tone="secondary">{`Respondido em ${formatDayMonth(r.answeredAt!)}`}</AppText>
                  <AppText variant="bodyStrong">{r.title}</AppText>
                  {r.testimony ? (
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginTop: 4 }}>
                      <AppText variant="body">{`"${r.testimony}"`}</AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </PrayerPage>
  )
}
