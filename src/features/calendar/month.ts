import { addDays, weekDates, weekStartOf, type CalendarDay } from './week'

/** Monat als „JJJJ-MM". */
export const monthOf = (date: string) => date.slice(0, 7)

export function addMonths(month: string, months: number): string {
  const [year = 0, m = 1] = month.split('-').map(Number)
  const index = year * 12 + (m - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Letzter Tag des Monats. */
export function monthEnd(month: string): string {
  return addDays(`${addMonths(month, 1)}-01`, -1)
}

/**
 * Wochen (Montag bis Sonntag), die den Monat abdecken – inklusive der angrenzenden Tage
 * des Vor- und Folgemonats in der ersten und letzten Woche.
 */
export function monthWeeks(month: string): string[][] {
  const weeks: string[][] = []
  const last = monthEnd(month)
  for (let start = weekStartOf(`${month}-01`); start <= last; start = addDays(start, 7)) {
    weeks.push(weekDates(start))
  }
  return weeks
}

export interface PeriodStats {
  /** Tage mit mindestens einem absolvierten Training */
  trainingDays: number
  sessions: number
  minutes: number
  /** Noch offene Einheiten (ab heute) */
  open: number
  skipped: number
  /** Geplante Einheiten in der Vergangenheit, die nicht absolviert wurden */
  missed: number
}

/** Kennzahlen für einen Zeitraum; `onlyMonth` zählt nur Tage dieses Monats. */
export function periodStats(days: readonly CalendarDay[], onlyMonth?: string): PeriodStats {
  const inScope = onlyMonth ? days.filter((d) => monthOf(d.date) === onlyMonth) : days
  const planned = inScope.flatMap((d) => d.planned.map((p) => ({ p, isPast: d.isPast })))
  return {
    trainingDays: inScope.filter((d) => d.sessions.length > 0).length,
    sessions: inScope.reduce((sum, d) => sum + d.sessions.length, 0),
    minutes: Math.round(
      inScope.reduce((sum, d) => sum + d.sessions.reduce((m, s) => m + s.durationMin, 0), 0),
    ),
    open: planned.filter(({ p, isPast }) => p.status === 'planned' && !isPast).length,
    skipped: planned.filter(({ p }) => p.status === 'skipped').length,
    missed: planned.filter(({ p, isPast }) => p.status === 'planned' && isPast).length,
  }
}
