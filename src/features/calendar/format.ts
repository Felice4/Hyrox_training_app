import { addDays, weekdayOf } from './week'

// Lokale Daten „JJJJ-MM-TT" mittags als Uhrzeit formatieren – in UTC, damit es keine
// Verschiebung durch die Zeitzone gibt
const asDate = (date: string) => new Date(`${date}T12:00:00Z`)

const shortDay = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  timeZone: 'UTC',
})
const longDay = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const dayMonth = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  timeZone: 'UTC',
})

/** „Mo., 26.10." */
export const formatShortDay = (date: string) => shortDay.format(asDate(date))

/** „Montag, 26. Oktober" */
export const formatLongDay = (date: string) => longDay.format(asDate(date))

/** ISO-Kalenderwoche (Woche mit dem ersten Donnerstag des Jahres = KW 1). */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(date, 4 - weekdayOf(date))
  const jan1 = `${thursday.slice(0, 4)}-01-01`
  const dayOfYear = Math.round((asDate(thursday).getTime() - asDate(jan1).getTime()) / 86_400_000)
  return Math.floor(dayOfYear / 7) + 1
}

/** „KW 44 · 26.10. – 1.11." */
export function formatWeek(weekStart: string): string {
  return `KW ${isoWeekNumber(weekStart)} · ${dayMonth.format(asDate(weekStart))} – ${dayMonth.format(
    asDate(addDays(weekStart, 6)),
  )}`
}
