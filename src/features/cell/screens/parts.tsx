import { Pressable, View } from 'react-native'
import { AppText, Tag } from '../../../components'
import { Icon, type IconName } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'

export interface TileItem {
  label: string
  sub: string
  icon: IconName
  onPress: () => void
  badge?: string
}

/** Atalhos em duas colunas, como no protótipo. */
export function TileGrid({ items }: { items: TileItem[] }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
      {items.map((t) => (
        <View key={t.label} style={{ width: '50%', padding: 6 }}>
          <Pressable
            onPress={t.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${t.label}, ${t.sub}${t.badge ? `, ${t.badge}` : ''}`}
            style={({ pressed }) => ({ minHeight: 96, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 4, opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <Icon name={t.icon} size={20} color={colors.primary} />
              {t.badge ? <Tag label={t.badge} tone="accent" /> : null}
            </View>
            <AppText variant="bodyStrong">{t.label}</AppText>
            <AppText variant="small" tone="secondary">
              {t.sub}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

/** Linha "rótulo: valor" dos cartões de reunião e escala. */
export function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.line }} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="body" tone="secondary" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={{ color: muted ? colors.textSecondary : colors.text, textAlign: 'right', flexShrink: 1 }}>
        {value}
      </AppText>
    </View>
  )
}
