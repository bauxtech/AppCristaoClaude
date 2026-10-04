import { router } from 'expo-router'
import { useBlockedIds, useSettings } from '../settings/SettingsContext'
import { visibleNotices } from '../settings/notices'
import { useRemoteState } from '../../state/connection'
import { ErrorState, SkeletonCard } from '../../components'
import { LastDayCard, PaymentFailedCard, TrialBanner } from '../subscription/screens/SubscriptionScreens'
import { useState } from 'react'
import { Linking, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button, Card, Chip, Icon, IconButton, ListRow, MIN_TOUCH, ProgressBar, SectionLabel, Sheet, useToast } from '../../components'
import { formatLongDate } from '../../lib/date'
import { useSession } from '../../state/session'
import { useCell } from '../cell/CellContext'
import { can } from '../cell/permissions'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'
import { useAudio } from '../audio/AudioContext'
import { useBible } from '../bible/BibleContext'
import { slugify } from '../bible/books'
import { planState } from '../bible/plans'
import { useChurch } from '../church/ChurchContext'
import { upcomingCommitments } from './commitments'
import { SERVICES, songUrl } from '../music/catalog'
import { verseText } from '../bible/text'
import { moods, passage, reflection, songOfDay, wordForNow } from './data'
import { PrayerMomentsSection, ReadingPlansSection } from './HomeSections'

const SOON = 'Disponível em breve'

export function HomeScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const audio = useAudio()
  const bible = useBible()
  const { cellStatus, profile, activeDays, sampleData } = useSession()
  const { cell } = useCell()
  const church = useChurch()
  const totalDays = activeDays.length
  const settings = useSettings()
  const { simple } = settings
  const blockedIds = useBlockedIds()
  const unreadNotifications = visibleNotices(settings.notices, !cell || can(cell.myRole, 'seePrayers')).filter((n) => !n.read).length
  const daily = useRemoteState()
  const commitments = upcomingCommitments({
    cell,
    church: church.main,
    courses: church.main ? church.courses : [],
    ministries: church.main ? church.ministries : [],
    savedEvents: church.savedEvents,
  })
  const cellPrayers = cell && can(cell.myRole, 'seePrayers') ? cell.prayers.filter((p) => !cell.hidden.includes(p.id) && !blockedIds.has(p.memberId)).length : null
  const [mood, setMood] = useState<string | null>(null)
  const [daysOpen, setDaysOpen] = useState(false)

  const planDef = bible.activePlanId ? bible.planDef(bible.activePlanId) : undefined
  const plan = planDef && bible.progress[planDef.id] ? { def: planDef, ...planState(planDef, bible.progress[planDef.id]) } : undefined
  const isNewUser = cellStatus === 'none' && !profile.church
  const word = mood ? wordForNow[mood] : null

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 140,
      }}
    >
      {/* Cabeçalho */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            Hoje
          </AppText>
          <AppText variant="small" tone="secondary">
            {formatLongDate(new Date())}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconButton icon="bell" label="Avisos" badge={unreadNotifications} onPress={() => router.push('/avisos')} />
          <Pressable
            onPress={() => setDaysOpen(true)}
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
            <AppText
              style={{
                color: colors.accent,
                fontFamily: fonts.semibold,
                fontSize: 14,
              }}
            >
              {totalDays} dias
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <TrialBanner />
        <LastDayCard />
        <PaymentFailedCard />
        {daily.loading ? (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
          </>
        ) : daily.error ? (
          <ErrorState message="Não foi possível carregar a passagem do dia." onRetry={daily.retry} />
        ) : (
          <>
            {/* Passagem do dia */}
            <Card>
              <SectionLabel>Passagem do dia</SectionLabel>
              <AppText variant="bible" style={{ marginBottom: 8 }}>
                {`"${passage.text}"`}
              </AppText>
              <AppText variant="bibleRef" tone="secondary" style={{ marginBottom: 20 }}>
                {`${passage.reference} · Almeida`}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Button
                  label="Ler capítulo"
                  onPress={() =>
                    router.push({
                      pathname: '/biblia/[livro]/[capitulo]',
                      params: { livro: 'salmos', capitulo: '23', v: '1' },
                    })
                  }
                  style={{ flexGrow: 1, minWidth: 120 }}
                />
                <Button label="Ouvir" icon="volume" variant="outline" onPress={() => audio.play({ title: passage.reference, text: passage.text })} />
                <Button
                  label="Perguntar sobre isso"
                  variant="text"
                  onPress={() =>
                    router.push({
                      pathname: '/chat',
                      params: { passagem: passage.reference },
                    })
                  }
                />
              </View>
            </Card>

            {/* Reflexão de hoje */}
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <SectionLabel>Reflexão de hoje</SectionLabel>
                  <AppText variant="bodyStrong">{reflection.minutes} min de leitura</AppText>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="pen" size={18} color={colors.primary} />
                </View>
              </View>
              <AppText variant="small" tone="secondary" numberOfLines={2} style={{ marginBottom: 16 }}>
                {reflection.paragraphs[0]}
              </AppText>
              <Button label="Ler reflexão completa" variant="soft" onPress={() => router.push('/reflexao')} />
            </Card>
          </>
        )}

        {!simple ? (
          <>
            {/* Palavra para agora */}
            <Card>
              <AppText variant="bodyStrong" accessibilityRole="header" style={{ marginBottom: 12 }}>
                Como você está agora?
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {moods.map((m) => (
                  <Chip key={m} label={m} selected={mood === m} onPress={() => setMood(mood === m ? null : m)} />
                ))}
              </View>
              {word && mood ? (
                <View style={{ marginTop: 16, gap: 8 }} accessibilityLiveRegion="polite">
                  <View
                    style={{
                      backgroundColor: colors.primarySoft,
                      borderRadius: 12,
                      padding: 14,
                      gap: 6,
                    }}
                  >
                    <AppText variant="bible" style={{ fontSize: 17, lineHeight: 27 }}>{`"${verseText(word.book, word.chapter, word.verse)}"`}</AppText>
                    <AppText variant="bibleRef" tone="secondary">{`${word.book} ${word.chapter}:${word.verse}`}</AppText>
                  </View>
                  <AppText variant="body">{word.phrase}</AppText>
                  <Button
                    label={`Perguntar sobre ${mood.toLowerCase()} na Bíblia`}
                    variant="text"
                    onPress={() =>
                      router.push({
                        pathname: '/chat',
                        params: {
                          passagem: `${word.book} ${word.chapter}:${word.verse}`,
                        },
                      })
                    }
                    style={{ alignSelf: 'flex-start' }}
                  />
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* Momentos de oração (aparece também para conta nova) */}
        <PrayerMomentsSection />

        {/* Planos de leitura */}
        <ReadingPlansSection />

        {isNewUser ? (
          <Card
            style={{
              borderStyle: 'dashed',
              borderWidth: 2,
              paddingVertical: 8,
            }}
          >
            <ListRow icon="people" label="Criar ou entrar numa célula" sub="Conecte-se com pessoas da sua comunidade." onPress={() => router.push('/celula')} divider />
            <ListRow icon="church" label="Cadastrar minha igreja" sub="Veja cultos, horários e acessibilidade." onPress={() => router.push('/igreja')} />
          </Card>
        ) : (
          <>
            {/* Próximos compromissos */}
            <Card style={{ paddingBottom: 8 }}>
              <SectionLabel>Próximos compromissos</SectionLabel>
              {commitments.length === 0 ? (
                <AppText variant="small" tone="secondary">
                  Nenhum compromisso por enquanto. Eles aparecem aqui quando você entra numa célula, vincula a igreja ou cadastra cursos e ministérios.
                </AppText>
              ) : (
                commitments.map((c, i) => <ListRow key={c.title} icon={c.icon} label={c.title} sub={c.when} onPress={() => router.push(c.href as '/celula')} divider={i < commitments.length - 1} />)
              )}
            </Card>

            {/* Pedidos da célula: só para quem tem célula e não é visitante */}
            {cellPrayers !== null ? (
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <SectionLabel>Pedidos da célula</SectionLabel>
                    <AppText variant="body" style={{ fontFamily: fonts.medium }}>
                      {cellPrayers === 0 ? 'Nenhum pedido na sua célula' : `${cellPrayers} ${cellPrayers === 1 ? 'pedido' : 'pedidos'} na sua célula`}
                    </AppText>
                  </View>
                  <Button label="Ver pedidos" variant="outline" size="sm" onPress={() => router.push('/celula/pedidos')} />
                </View>
              </Card>
            ) : null}
          </>
        )}

        {!simple ? (
          <>
            {/* Música do dia */}
            <Card>
              <SectionLabel>Música do dia</SectionLabel>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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
                {SERVICES.map((svc) => (
                  <Button
                    key={svc}
                    label={svc}
                    icon="external"
                    variant="soft"
                    size="sm"
                    accessibilityHint={`Abre a música no ${svc}`}
                    onPress={() => {
                      toast(`Abrindo o ${svc}`)
                      Linking.openURL(songUrl(songOfDay, svc)).catch(() => {})
                    }}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>
            </Card>
          </>
        ) : null}
      </View>

      <TotalDaysSheet visible={daysOpen} onClose={() => setDaysOpen(false)} activeDays={activeDays} />
    </ScrollView>
  )
}

/** Total de dias com leitura ou oração, com o mês marcado. Não existe sequência. */
function TotalDaysSheet({ visible, onClose, activeDays }: { visible: boolean; onClose: () => void; activeDays: string[] }) {
  const totalDays = activeDays.length
  const { colors } = useTheme()
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const first = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array.from({ length: first }, () => 0), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthName = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][month]
  return (
    <Sheet visible={visible} onClose={onClose} title={`${totalDays} dias com leitura ou oração`}>
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {totalDays === 0 ? 'Ainda nenhum dia. Um dia conta quando você lê ou ora pelo app.' : 'Um dia conta quando você lê ou ora pelo app.'}
      </AppText>
      <AppText variant="label" tone="secondary">{`${monthName} de ${year}`}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <View
            key={`h${i}`}
            style={{
              width: `${100 / 7}%`,
              alignItems: 'center',
              paddingVertical: 4,
            }}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            <AppText variant="small" tone="secondary">
              {d}
            </AppText>
          </View>
        ))}
        {cells.map((d, i) => {
          const active = d > 0 && activeDays.includes(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
          return (
            <View
              key={i}
              style={{
                width: `${100 / 7}%`,
                alignItems: 'center',
                paddingVertical: 4,
              }}
              accessible={d > 0}
              accessibilityLabel={d > 0 ? `${d} de ${monthName}${active ? ', com leitura ou oração' : ''}` : undefined}
            >
              {d > 0 ? (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.primary : 'transparent',
                  }}
                >
                  {active ? <Icon name="check" size={14} color={colors.primaryText} strokeWidth={3} /> : <AppText variant="small">{d}</AppText>}
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
      <Button label="Fechar" variant="outline" onPress={onClose} />
    </Sheet>
  )
}
