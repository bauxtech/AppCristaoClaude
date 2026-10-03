import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { inQuietHours, type NotificationPrefs } from '../features/settings/prefs'

// Lembretes diários de leitura e oração, agendados no próprio aparelho.
// Os avisos que dependem de outras pessoas (célula, "Orei por você") chegam pelo servidor depois.

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable'

const CHANNEL = 'lembretes'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  })
}

export async function reminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === 'web') return 'unavailable'
  try {
    const p = await Notifications.getPermissionsAsync()
    if (p.granted) return 'granted'
    return p.canAskAgain ? 'undetermined' : 'denied'
  } catch {
    return 'unavailable'
  }
}

export async function askReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === 'web') return 'unavailable'
  try {
    const p = await Notifications.requestPermissionsAsync()
    return p.granted ? 'granted' : 'denied'
  } catch {
    return 'unavailable'
  }
}

/** Refaz os lembretes a partir das preferências. Horário dentro do silêncio não é agendado. */
export async function syncReminders(prefs: NotificationPrefs): Promise<{ scheduled: string[] }> {
  const scheduled: string[] = []
  if (Platform.OS === 'web') return { scheduled }
  try {
    const p = await Notifications.getPermissionsAsync()
    if (!p.granted) return { scheduled }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Lembretes',
        importance: prefs.visual ? Notifications.AndroidImportance.LOW : Notifications.AndroidImportance.DEFAULT,
        enableVibrate: prefs.vibration,
        vibrationPattern: prefs.vibration ? [0, 250, 150, 250] : [0],
      })
    }
    await Notifications.cancelAllScheduledNotificationsAsync()
    const items = [
      { on: prefs.types.leitura, time: prefs.readingTime, title: 'Leitura do dia', body: 'Hora da sua leitura.', id: 'leitura' },
      { on: prefs.types.oracao, time: prefs.prayerTime, title: 'Momento de oração', body: 'Que tal orar agora?', id: 'oracao' },
    ]
    for (const it of items) {
      if (!it.on || inQuietHours(it.time, prefs.quietFrom, prefs.quietTo)) continue
      const [hour, minute] = it.time.split(':').map(Number)
      await Notifications.scheduleNotificationAsync({
        identifier: it.id,
        content: { title: it.title, body: it.body, sound: !prefs.visual },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
      })
      scheduled.push(it.id)
    }
  } catch {
    // agendamento falhou: o app segue, e a tela de avisos mostra o estado da permissão
  }
  return { scheduled }
}
