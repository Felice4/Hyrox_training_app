import type { Weekday } from '@/domain/profile/vocabulary'

/** Lokales Datum als „JJJJ-MM-TT" (nicht UTC – sonst wäre kurz nach Mitternacht noch „gestern"). */
export function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Rechnet mit lokalen Daten „JJJJ-MM-TT" (Mittag als Uhrzeit – keine Sommerzeit-Sprünge). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function weekdayOf(date: string): Weekday {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return (((day + 6) % 7) + 1) as Weekday
}

/** Montag der Woche, in der `date` liegt. */
export function weekStartOf(date: string): string {
  return addDays(date, 1 - weekdayOf(date))
}
