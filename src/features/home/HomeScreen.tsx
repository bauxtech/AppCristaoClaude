import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button, Card, Chip, Icon, IconButton, ListRow, MIN_TOUCH, SectionLabel, useToast } from '../../components'
import { ProgressBar } from '../../components/ProgressBar'
import { formatLongDate } from '../../lib/date'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'
import {
  cellRequests,
  commitments,
  moods,
  passage,
  prayerOfDay,
  readingPlan,
  reflection,
  songOfDay,
  totalDays,
  unreadNotifications,
} from './data'

const SOON = 'Disponível em breve'

export function HomeScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const [mood, setMood] = useState<string | null>(null)

  const pct = Math.round((readingPlan.day / readingPlan.total) * 100)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 96 }}
    >
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            Hoje
          </AppText>
          <AppText variant="small" tone="secondary">
            {formatLongDate(new Date())}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconButton icon="bell" label="Avisos" badge={unreadNotifications} onPress={() => toast(SOON)} />
          <Pressable
            onPress={() => toast(SOON)}
            accessibilityRole="button"
            accessibilityLabel={`${totalDays} dias com leitura ou oração`}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.primarySoft,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Icon name="calendarCheck" size={14} color={colors.accent} strokeWidth={2.5} />
            <AppText style={{ color: colors.accent, fontFamily: fonts.semibold, fontSize: 14 }}>{totalDays} dias</AppText>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {/* Passagem do dia */}
        <Card>
          <SectionLabel>Passagem do dia</SectionLabel>
          <AppText variant="bible" style={{ marginBottom: 8 }}>
            {`"${passage.text}"`}
          </AppText>
          <AppText variant="bibleRef" tone="secondary" style={{ marginBottom: 20 }}>
            {passage.reference}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Button label="Ler capítulo" onPress={() => router.push('/biblia')} style={{ flexGrow: 1, minWidth: 120 }} />
            <Button label="Ouvir" icon="volume" variant="outline" onPress={() => toast(SOON)} />
            <Button label="Perguntar sobre isso" variant="text" onPress={() => router.push('/chat')} />
          </View>
        </Card>

        {/* Reflexão de hoje */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <SectionLabel>Reflexão de hoje</SectionLabel>
              <AppText variant="bodyStrong">{reflection.minutes} min de leitura</AppText>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pen" size={18} color={colors.primary} />
            </View>
          </View>
          <AppText variant="small" tone="secondary" numberOfLines={2} style={{ marginBottom: 16 }}>
            {reflection.preview}
          </AppText>
          <Button label="Ler reflexão completa" variant="soft" onPress={() => toast(SOON)} />
        </Card>

        {/* Como você está agora? */}
        <Card>
          <AppText variant="bodyStrong" accessibilityRole="header" style={{ marginBottom: 12 }}>
            Como você está agora?
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {moods.map((m) => (
              <Chip key={m} label={m} selected={mood === m} onPress={() => setMood(mood === m ? null : m)} />
            ))}
          </View>
          {mood ? (
            <Button
              label={`Perguntar sobre ${mood.toLowerCase()} na Bíblia`}
              variant="text"
              onPress={() => router.push('/chat')}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            />
          ) : null}
        </Card>

        {/* Oração do dia */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SectionLabel>Oração do dia</SectionLabel>
              <AppText variant="bodyStrong">{prayerOfDay.title}</AppText>
              <AppText variant="small" tone="secondary">
                {prayerOfDay.meta}
              </AppText>
            </View>
            <Button label="Começar" variant="soft" onPress={() => router.push('/oracao')} accessibilityHint="Abre o momento de oração" />
          </View>
        </Card>

        {/* Continuar leitura */}
        <Card>
          <SectionLabel>Continuar leitura</SectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{readingPlan.name}</AppText>
              <AppText variant="small" tone="secondary">
                Dia {readingPlan.day} de {readingPlan.total}
              </AppText>
            </View>
            <Button label="Continuar" variant="outline" size="sm" onPress={() => router.push('/biblia')} />
          </View>
          <ProgressBar value={readingPlan.day} max={readingPlan.total} label={`Dia ${readingPlan.day} de ${readingPlan.total}, ${pct}% concluído`} />
          <AppText variant="small" tone="secondary" style={{ marginTop: 6 }} importantForAccessibility="no" accessibilityElementsHidden>
            {pct}% concluído
          </AppText>
        </Card>

        {/* Próximos compromissos */}
        <Card style={{ paddingBottom: 8 }}>
          <SectionLabel>Próximos compromissos</SectionLabel>
          {commitments.length === 0 ? (
            <AppText variant="small" tone="secondary">
              Nenhum compromisso por enquanto.
            </AppText>
          ) : (
            commitments.map((c, i) => (
              <ListRow key={c.title} icon={c.icon} label={c.title} sub={c.when} onPress={() => toast(SOON)} divider={i < commitments.length - 1} />
            ))
          )}
        </Card>

        {/* Pedidos da célula */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SectionLabel>Pedidos da célula</SectionLabel>
              <AppText variant="body" style={{ fontFamily: fonts.medium }}>
                {cellRequests.count} pedidos novos na sua célula
              </AppText>
            </View>
            <Button label="Ver pedidos" variant="outline" size="sm" onPress={() => router.push('/celula')} />
          </View>
        </Card>

        {/* Música do dia */}
        <Card>
          <SectionLabel>Música do dia</SectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="music" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{songOfDay.title}</AppText>
              <AppText variant="small" tone="secondary">
                {songOfDay.artist}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Abrir no Spotify" icon="external" variant="soft" size="sm" onPress={() => toast('Abrindo o Spotify')} style={{ flex: 1 }} />
            <Button label="Abrir no YouTube" icon="external" variant="soft" size="sm" onPress={() => toast('Abrindo o YouTube')} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </ScrollView>
  )
}
