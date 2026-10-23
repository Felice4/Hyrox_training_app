import type { HistorySession } from '@/domain/generator/types'
import type { TrainingLoadSummary } from '@/domain/load/trainingLoad'
import type { Weekday } from '@/domain/profile/vocabulary'

/** Lokales Datum als „JJJJ-MM-TT". */
function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ISO-Wochentag 1 = Montag … 7 = Sonntag. */
export function isoWeekday(date: Date): Weekday {
  return (((date.getDay() + 6) % 7) + 1) as Weekday
}

/** Montag 00:00 (lokal) der Woche von `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - (isoWeekday(date) - 1))
  return start
}

export interface WeekStats {
  sessions: number
  minutes: number
}

/** Trainings der aktuellen Woche (Montag bis jetzt). */
export function weekStats(history: readonly HistorySession[], now: Date): WeekStats {
  const from = startOfWeek(now).getTime()
  const thisWeek = history.filter((s) => {
    const t = Date.parse(s.startedAt)
    return t >= from && t <= now.getTime()
  })
  return {
    sessions: thisWeek.length,
    minutes: Math.round(thisWeek.reduce((sum, s) => sum + s.durationMin, 0)),
  }
}

export interface WeekDay {
  date: string
  weekday: Weekday
  isToday: boolean
  isPast: boolean
  /** An diesem Tag wurde trainiert */
  trained: boolean
  /** Bevorzugter Trainingstag laut Profil */
  preferred: boolean
}

/** Die sieben Tage der aktuellen Woche mit Trainings und bevorzugten Tagen. */
export function weekStrip(
  history: readonly HistorySession[],
  preferredWeekdays: readonly number[],
  now: Date,
): WeekDay[] {
  const trainedDays = new Set(history.map((s) => localDay(new Date(s.startedAt))))
  const today = localDay(now)
  const monday = startOfWeek(now)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const day = localDay(date)
    const weekday = (i + 1) as Weekday
    return {
      date: day,
      weekday,
      isToday: day === today,
      isPast: day < today,
      trained: trainedDays.has(day),
      preferred: preferredWeekdays.includes(weekday),
    }
  })
}

/**
 * Nächster bevorzugter Trainingstag ab heute – heute nur, wenn noch nicht trainiert.
 * `undefined`, wenn im Profil keine Wochentage gewählt sind.
 */
export function nextPreferredDay(
  history: readonly HistorySession[],
  preferredWeekdays: readonly number[],
  now: Date,
): Date | undefined {
  if (preferredWeekdays.length === 0) return undefined
  const trainedToday = history.some((s) => localDay(new Date(s.startedAt)) === localDay(now))
  for (let offset = trainedToday ? 1 : 0; offset <= 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    if (preferredWeekdays.includes(isoWeekday(date))) return date
  }
  return undefined
}

export type LoadLevel = 'unknown' | 'low' | 'normal' | 'high'

export interface LoadStatus {
  level: LoadLevel
  label: string
  explanation: string
}

/** Verständliche Einordnung der Trainingsbelastung (keine medizinische Aussage). */
export function loadStatus(summary: TrainingLoadSummary): LoadStatus {
  if (summary.ratio === null) {
    return {
      level: 'unknown',
      label: 'Noch im Aufbau',
      explanation:
        'Nach etwa zwei Wochen mit Trainings und Anstrengungsbewertung lässt sich die Belastung einordnen.',
    }
  }
  if (summary.elevated) {
    return {
      level: 'high',
      label: 'Erhöht',
      explanation:
        'Die letzten 7 Tage waren deutlich intensiver als dein Schnitt – der Generator plant vorsichtiger.',
    }
  }
  if (summary.ratio < 0.8) {
    return {
      level: 'low',
      label: 'Niedrig',
      explanation: 'Weniger als sonst – gut zur Erholung oder Zeit für eine fordernde Einheit.',
    }
  }
  return {
    level: 'normal',
    label: 'Im gewohnten Bereich',
    explanation: 'Deine Belastung entspricht deinem Durchschnitt der letzten vier Wochen.',
  }
}
