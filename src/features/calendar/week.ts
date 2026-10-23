import type { PlannedWorkout, ReplaceWeekPlanPayload } from '@/api/weekPlans'
import type { HistorySession } from '@/domain/generator/types'
import type { DoneTraining, GeneratedWeekPlan, KeptPlanned } from '@/domain/generator/weekPlan'
import type { Weekday } from '@/domain/profile/vocabulary'
import { toLocalIsoDate } from '@/lib/date'

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

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Eine Woche lässt sich planen, solange ihr Sonntag nicht vorbei ist. */
export function canPlanWeek(weekStart: string, today: string): boolean {
  return addDays(weekStart, 6) >= today
}

const sessionDate = (session: HistorySession) => toLocalIsoDate(new Date(session.startedAt))

/** Absolvierte Trainings der Woche – zählen beim Planen zum Wochenziel. */
export function doneInWeek(sessions: readonly HistorySession[], weekStart: string): DoneTraining[] {
  const end = addDays(weekStart, 6)
  return sessions
    .map((s) => ({ date: sessionDate(s), focus: s.focus }))
    .filter((d) => d.date >= weekStart && d.date <= end)
}

/**
 * Einheiten, die eine Neuplanung überstehen (siehe replace_week_plan): ausgefallene,
 * vergangene und spontan hinzugefügte. Erledigte stecken bereits in den Trainings.
 */
export function keptForReplan(planned: readonly PlannedWorkout[], today: string): KeptPlanned[] {
  return planned
    .filter(
      (p) =>
        p.status === 'skipped' ||
        (p.status === 'planned' && (p.date < today || p.source === 'manual')),
    )
    .map((p) => ({
      date: p.date,
      focus: p.focus,
      status: p.status === 'skipped' ? 'skipped' : 'planned',
    }))
}

export function toReplacePayload(
  plan: GeneratedWeekPlan,
  today: string,
  generatorVersion: string,
): ReplaceWeekPlanPayload {
  return {
    week_start: plan.weekStart,
    today,
    generator_version: generatorVersion,
    notes: plan.explanation.length > 0 ? plan.explanation.join('\n') : null,
    workouts: plan.days.map((day) => ({
      scheduled_date: day.date,
      focus: day.focus,
      target_duration_min: day.durationMin,
      intensity: day.intensity,
      workout: day.workout,
      explanation: day.workout.explanation,
    })),
  }
}

export interface CalendarDay {
  date: string
  weekday: Weekday
  isToday: boolean
  isPast: boolean
  sessions: HistorySession[]
  planned: PlannedWorkout[]
}

/** Die sieben Tage einer Woche mit absolvierten Trainings und geplanten Einheiten. */
export function calendarWeek(
  weekStart: string,
  today: string,
  sessions: readonly HistorySession[],
  planned: readonly PlannedWorkout[],
): CalendarDay[] {
  return weekDates(weekStart).map((date) => ({
    date,
    weekday: weekdayOf(date),
    isToday: date === today,
    isPast: date < today,
    // Trainings chronologisch (der Verlauf kommt neueste zuerst)
    sessions: sessions.filter((s) => sessionDate(s) === date).reverse(),
    // Erledigte Einheiten zeigt das zugehörige Training – nicht doppelt anzeigen
    planned: planned.filter((p) => p.date === date && p.status !== 'completed'),
  }))
}

/** Nächste offene Einheit ab heute. */
export function nextPlanned(
  planned: readonly PlannedWorkout[],
  today: string,
): PlannedWorkout | undefined {
  return [...planned]
    .filter((p) => p.status === 'planned' && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

/** Tage, auf die eine Einheit verschoben werden kann: dieselbe Woche, ab heute. */
export function moveTargets(planned: PlannedWorkout, today: string): string[] {
  return weekDates(weekStartOf(planned.date)).filter((d) => d >= today && d !== planned.date)
}

/** Verschieben merkt sich das ursprüngliche Datum (zurück auf den alten Tag hebt es auf). */
export function moveChange(planned: PlannedWorkout, date: string) {
  const original = planned.originalDate ?? planned.date
  return { date, originalDate: original === date ? null : original }
}
