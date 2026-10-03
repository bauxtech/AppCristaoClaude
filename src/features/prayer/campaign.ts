import type { Campaign } from './data'
import { daysBetween, parseISODate } from './dates'

export function campaignInfo(c: Campaign, now = new Date()) {
  const total = daysBetween(parseISODate(c.start), parseISODate(c.end)) + 1
  const elapsed = daysBetween(parseISODate(c.start), now) + 1
  const ended = elapsed > total || c.doneDays.length >= total
  const notStarted = elapsed < 1
  const today = Math.min(Math.max(elapsed, 1), total)
  return {
    total,
    /** Dia de hoje dentro da campanha. */
    today,
    status: ended ? ('done' as const) : notStarted ? ('notStarted' as const) : ('active' as const),
    doneCount: c.doneDays.length,
    todayDone: c.doneDays.includes(today),
    daysLeft: Math.max(total - elapsed, 0),
  }
}
