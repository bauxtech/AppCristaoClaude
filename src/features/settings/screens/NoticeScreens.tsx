import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, Icon, IconButton, Page, SectionLabel, Switch, useToast } from '../../../components'
import type { IconName } from '../../../components/Icon'
import { askReminderPermission, reminderPermission, type ReminderPermission } from '../../../lib/reminders'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { groupNotices, NOTICE_TYPE_LABEL, noticeTime, type Notice } from '../notices'
import { hourLabel, inQuietHours, NOTIFICATION_TYPES } from '../prefs'
import { useSettings } from '../SettingsContext'

const TYPE_ICON: Record<Notice['type'], IconName> = { cell: 'users', bible: 'book', prayer: 'hand', church: 'church', system: 'info' }

/** Estado da permissão de avisos do celular, para mostrar quando estão desligados. */
function usePermission() {
  const [perm, setPerm] = useState<ReminderPermission>('unavailable')
  useEffect(() => {
    reminderPermission().then(setPerm)
  }, [])
  return { perm, ask: async () => setPerm(await askReminderPermission()) }
}

function PermissionCard({ perm, ask }: { perm: ReminderPermission; ask: () => void }) {
  const { colors } = useTheme()
  if (perm === 'granted' || perm === 'unavailable') return null
  return (
    <Card style={{ gap: 8, borderColor: colors.accent }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Icon name="alert" size={18} color={colors.text} />
        <AppText variant="bodyStrong">Avisos desligados no celular</AppText>
      </View>
      <AppText variant="small" tone="secondary">
        {perm === 'denied'
          ? 'Os lembretes de leitura e oração não vão tocar. Para ligar, abra os ajustes do celular e permita os avisos do app.'
          : 'Para receber os lembretes de leitura e oração, permita os avisos do app.'}
      </AppText>
      {perm === 'denied' ? (
        <Button label="Abrir ajustes do celular" variant="soft" size="sm" onPress={() => Linking.openSettings()} />
      ) : (
        <Button label="Permitir avisos" variant="soft" size="sm" onPress={ask} />
      )}
    </Card>
  )
}

export function NoticesScreen() {
  const { colors } = useTheme()
  const s = useSettings()
  const { perm, ask } = usePermission()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const visible = filter === 'unread' ? s.notices.filter((n) => !n.read) : s.notices
  const groups = groupNotices(visible)

  function open(n: Notice) {
    s.markRead(n.id)
    if (n.href) router.push(n.href as '/celula')
  }

  return (
    <Page title={s.unreadCount ? `Avisos (${s.unreadCount})` : 'Avisos'} right={<IconButton icon="settings" label="Configurar avisos" onPress={() => router.push('/avisos/configurar')} />}>
      <PermissionCard perm={perm} ask={ask} />
      {s.notices.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label="Todas" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label={s.unreadCount ? `Não lidas (${s.unreadCount})` : 'Não lidas'} selected={filter === 'unread'} onPress={() => setFilter('unread')} />
          <View style={{ flex: 1 }} />
          {s.unreadCount > 0 ? <Button label="Marcar todas como lidas" variant="text" size="sm" onPress={s.markAllRead} /> : null}
        </View>
      ) : null}

      {visible.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
          <Icon name="bell" size={40} color={colors.textSecondary} strokeWidth={1.5} />
          <AppText variant="bodyStrong">{s.notices.length === 0 ? 'Nenhum aviso por enquanto' : 'Tudo em dia'}</AppText>
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            {s.notices.length === 0 ? 'Lembretes de leitura e oração, a célula e o culto aparecem aqui.' : 'Nenhuma notificação não lida.'}
          </AppText>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.label} style={{ gap: 8 }}>
            <SectionLabel>{g.label}</SectionLabel>
            {g.items.map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, borderWidth: 1, borderColor: n.read ? colors.line : colors.primary, backgroundColor: n.read ? colors.card : colors.primarySoft }}>
                <Pressable
                  onPress={() => open(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.read ? '' : 'Não lido. '}${NOTICE_TYPE_LABEL[n.type]}. ${n.title}. ${n.body}. ${noticeTime(n.at)}`}
                  style={{ flex: 1, flexDirection: 'row', gap: 12, padding: 14 }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: n.read ? colors.primarySoft : colors.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={TYPE_ICON[n.type]} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                      <AppText variant="body" style={{ fontFamily: n.read ? fonts.medium : fonts.bold, flex: 1 }}>
                        {n.title}
                      </AppText>
                    </View>
                    <AppText variant="small" tone="secondary">
                      {n.body}
                    </AppText>
                    <AppText variant="label" tone="secondary">
                      {`${noticeTime(n.at)}${n.read ? '' : ' · Não lido'}`}
                    </AppText>
                  </View>
                </Pressable>
                <IconButton icon="close" label={`Dispensar aviso: ${n.title}`} onPress={() => s.dismissNotice(n.id)} color={colors.textSecondary} />
              </View>
            ))}
          </View>
        ))
      )}
    </Page>
  )
}

export function NotificationSettingsScreen() {
  const { colors } = useTheme()
  const s = useSettings()
  const { perm, ask } = usePermission()
  const n = s.notif
  const quietClash = (t: string) => inQuietHours(t, n.quietFrom, n.quietTo)

  async function setType(k: (typeof NOTIFICATION_TYPES)[number]['key'], v: boolean) {
    s.setType(k, v)
    // A permissão do celular só é pedida quando a pessoa liga um lembrete.
    if (v && (k === 'leitura' || k === 'oracao') && perm === 'undetermined') await ask()
  }

  return (
    <Page title="Configurar avisos">
      <PermissionCard perm={perm} ask={ask} />
      <Card style={{ paddingVertical: 4 }}>
        {NOTIFICATION_TYPES.map((t, i) => (
          <View key={t.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: i < NOTIFICATION_TYPES.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontFamily: fonts.medium }}>
                {t.label}
              </AppText>
              <AppText variant="small" tone="secondary">
                {t.sub}
              </AppText>
            </View>
            <Switch label={t.label} value={n.types[t.key]} onChange={(v) => setType(t.key, v)} />
          </View>
        ))}
      </Card>

      <SectionLabel>Horários dos lembretes</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {[
          { id: 'leitura', label: 'Leitura do dia', time: n.readingTime, on: n.types.leitura },
          { id: 'oracao', label: 'Momento de oração', time: n.prayerTime, on: n.types.oracao },
        ].map((r, i) => (
          <Pressable
            key={r.id}
            onPress={() => router.push({ pathname: '/avisos/horario', params: { qual: r.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}, ${hourLabel(r.time)}${r.on ? '' : ', desligado'}${quietClash(r.time) ? ', dentro do horário de silêncio' : ''}`}
            accessibilityHint="Alterar horário"
            style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: colors.line }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontFamily: fonts.medium }}>
                {r.label}
              </AppText>
              <AppText variant="small" tone="secondary">
                {!r.on ? 'Desligado' : quietClash(r.time) ? 'Dentro do horário de silêncio: não vai tocar' : 'Todos os dias'}
              </AppText>
            </View>
            <AppText variant="bodyStrong" style={{ color: colors.primary }}>
              {hourLabel(r.time)}
            </AppText>
            <Icon name="chevronRight" size={18} color={colors.lineStrong} />
          </Pressable>
        ))}
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontFamily: fonts.medium }}>
              Vibração
            </AppText>
            <AppText variant="small" tone="secondary">
              Para todos os avisos ativos
            </AppText>
          </View>
          <Switch label="Vibração" value={n.vibration} onChange={(v) => s.setNotif({ vibration: v })} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontFamily: fonts.medium }}>
              Aviso visual
            </AppText>
            <AppText variant="small" tone="secondary">
              Banner na tela sem som
            </AppText>
          </View>
          <Switch label="Aviso visual" value={n.visual} onChange={(v) => s.setNotif({ visual: v })} />
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Horário de silêncio</AppText>
        <AppText variant="small" tone="secondary">
          {`Nenhum aviso entre ${hourLabel(n.quietFrom)} e ${hourLabel(n.quietTo)}.`}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={`Começa ${hourLabel(n.quietFrom)}`} variant="outline" size="sm" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/avisos/horario', params: { qual: 'silencioInicio' } })} accessibilityHint="Alterar início do silêncio" />
          <Button label={`Termina ${hourLabel(n.quietTo)}`} variant="outline" size="sm" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/avisos/horario', params: { qual: 'silencioFim' } })} accessibilityHint="Alterar fim do silêncio" />
        </View>
      </Card>
    </Page>
  )
}

const TIME_TARGETS = {
  leitura: { title: 'Lembrete de leitura', key: 'readingTime' },
  oracao: { title: 'Lembrete de oração', key: 'prayerTime' },
  silencioInicio: { title: 'Início do silêncio', key: 'quietFrom' },
  silencioFim: { title: 'Fim do silêncio', key: 'quietTo' },
} as const

/** Escolher horário: horas de 1 em 1 e minutos de 5 em 5, como no protótipo. */
export function SetTimeScreen({ which }: { which: keyof typeof TIME_TARGETS }) {
  const { colors } = useTheme()
  const s = useSettings()
  const toast = useToast()
  const target = TIME_TARGETS[which] ?? TIME_TARGETS.leitura
  const [h0, m0] = s.notif[target.key].split(':').map(Number)
  const [hour, setHour] = useState(h0)
  const [minute, setMinute] = useState(m0 - (m0 % 5))
  const pad = (v: number) => String(v).padStart(2, '0')
  const value = `${pad(hour)}:${pad(minute)}`
  const clash = (which === 'leitura' || which === 'oracao') && inQuietHours(value, s.notif.quietFrom, s.notif.quietTo)

  const Stepper = ({ label, val, inc, dec }: { label: string; val: number; inc: () => void; dec: () => void }) => (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <IconButton icon="arrowUp" label={`Mais ${label}`} onPress={inc} color={colors.primary} />
      <AppText style={{ fontFamily: fonts.semibold, fontSize: 40, color: colors.text, minWidth: 72, textAlign: 'center' }} accessibilityLabel={`${val} ${label}`} accessibilityLiveRegion="polite">
        {pad(val)}
      </AppText>
      <IconButton icon="arrowDown" label={`Menos ${label}`} onPress={dec} color={colors.primary} />
    </View>
  )

  return (
    <Page title={target.title}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 16 }}>
        <Stepper label="horas" val={hour} inc={() => setHour((v) => (v + 1) % 24)} dec={() => setHour((v) => (v + 23) % 24)} />
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 40, color: colors.text }} accessible={false}>
          :
        </AppText>
        <Stepper label="minutos" val={minute} inc={() => setMinute((v) => (v + 5) % 60)} dec={() => setMinute((v) => (v + 55) % 60)} />
      </View>
      {clash ? (
        <Card style={{ gap: 4 }} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">Dentro do horário de silêncio</AppText>
          <AppText variant="small" tone="secondary">
            {`Entre ${hourLabel(s.notif.quietFrom)} e ${hourLabel(s.notif.quietTo)} nenhum aviso toca. Escolha outro horário ou mude o silêncio.`}
          </AppText>
        </Card>
      ) : null}
      <Button
        label="Salvar"
        onPress={() => {
          s.setNotif({ [target.key]: value })
          toast('Horário salvo')
          router.back()
        }}
      />
    </Page>
  )
}
