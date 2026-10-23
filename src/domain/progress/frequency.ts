import type { HistorySession } from '@/domain/generator/types'
import { addDays, toLocalIsoDate, weekStartOf } from '@/lib/date'

/** Auswertungszeitraum der Übersicht. */
export type Period = '4w' | '12w' | '12m'

export const PERIODS: readonly Period[] = ['4w', '12w', '12m']

/** Ein Abschnitt im Diagramm: eine Woche oder ein Monat (lokale Daten, inklusive). */
export interface Bucket {
  /** Montag der Woche bzw. „JJJJ-MM" */
  key: string
  from: string
  to: string
}

/** Geplante Einheit, soweit für die Auswertung nötig. */
export interface PlannedEntry {
  date: string
  status: 'planned' | 'completed' | 'skipped'
}

/** Wochen (4 oder 12) bzw. 12 Monate bis einschließlich heute, älteste zuerst. */
export function periodBuckets(period: Period, today: string): Bucket[] {
  if (period === '12m') {
    const [year = 0, month = 1] = today.split('-').map(Number)
    return Array.from({ length: 12 }, (_, i) => {
      const index = year * 12 + (month - 1) - (11 - i)
      const key = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
      const nextIndex = index + 1
      const next = `${Math.floor(nextIndex / 12)}-${String((nextIndex % 12) + 1).padStart(2, '0')}-01`
      return { key, from: `${key}-01`, to: addDays(next, -1) }
    })
  }
  const weeks = period === '4w' ? 4 : 12
  const current = weekStartOf(today)
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDays(current, -7 * (weeks - 1 - i))
    return { key: from, from, to: addDays(from, 6) }
  })
}

export interface FrequencyPoint extends Bucket {
  sessions: number
  minutes: number
  /** Tage mit mindestens einem Training */
  trainingDays: number
  /** Geplante Einheiten (offen, erledigt oder ausgefallen) */
  planned: number
  /** Davon erledigt */
  plannedDone: number
}

const sessionDate = (s: HistorySession) => toLocalIsoDate(new Date(s.startedAt))

/** Trainings und geplante Einheiten je Abschnitt. */
export function frequency(
  buckets: readonly Bucket[],
  sessions: readonly HistorySession[],
  planned: readonly PlannedEntry[],
): FrequencyPoint[] {
  const dated = sessions.map((s) => ({ date: sessionDate(s), minutes: s.durationMin }))
  return buckets.map((bucket) => {
    const inBucket = dated.filter((s) => s.date >= bucket.from && s.date <= bucket.to)
    const plannedIn = planned.filter((p) => p.date >= bucket.from && p.date <= bucket.to)
    return {
      ...bucket,
      sessions: inBucket.length,
      minutes: Math.round(inBucket.reduce((sum, s) => sum + s.minutes, 0)),
      trainingDays: new Set(inBucket.map((s) => s.date)).size,
      planned: plannedIn.length,
      plannedDone: plannedIn.filter((p) => p.status === 'completed').length,
    }
  })
}

export interface FrequencySummary {
  sessions: number
  minutes: number
  trainingDays: number
  /** Trainings pro Woche im Schnitt (bis heute gerechnet) */
  perWeek: number
  /** Fällige geplante Einheiten: erledigt, ausgefallen oder verpasst – offene zählen nicht */
  plannedDue: number
  plannedDone: number
  /** Anteil erledigter fälliger Einheiten (0–1), `null` ohne fällige Einheiten */
  adherence: number | null
}

export function summarize(
  points: readonly FrequencyPoint[],
  planned: readonly PlannedEntry[],
  today: string,
): FrequencySummary {
  const first = points[0]
  const last = points.at(-1)
  const sessions = points.reduce((sum, p) => sum + p.sessions, 0)
  const elapsedDays =
    first && last
      ? Math.round(
          (Date.parse(`${last.to < today ? last.to : today}T12:00:00Z`) -
            Date.parse(`${first.from}T12:00:00Z`)) /
            86_400_000,
        ) + 1
      : 0
  const due = planned.filter(
    (p) =>
      first !== undefined &&
      last !== undefined &&
      p.date >= first.from &&
      p.date <= last.to &&
      (p.status !== 'planned' || p.date < today),
  )
  const done = due.filter((p) => p.status === 'completed').length
  return {
    sessions,
    minutes: points.reduce((sum, p) => sum + p.minutes, 0),
    trainingDays: points.reduce((sum, p) => sum + p.trainingDays, 0),
    perWeek: elapsedDays > 0 ? Math.round((sessions / elapsedDays) * 7 * 10) / 10 : 0,
    plannedDue: due.length,
    plannedDone: done,
    adherence: due.length > 0 ? done / due.length : null,
  }
}
