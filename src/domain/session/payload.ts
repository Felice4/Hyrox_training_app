import { sessionLoad } from '@/domain/load/trainingLoad'
import { detectRecords } from '@/domain/records/detect'
import { activeSeconds, exerciseOutcome, sessionOutcome } from './session'
import type { ActiveSession } from './types'

/** Nutzlast für die Datenbankfunktion save_workout_session (siehe Migration 0004). */
export interface SaveSessionPayload {
  session: {
    id: string
    started_at: string
    ended_at: string
    active_duration_sec: number
    status: 'completed' | 'partial'
    focus: string
    intensity: string
    session_rpe: number | null
    notes: string | null
    workout_snapshot: unknown
    generator_version: string
    training_load: number
  }
  exercises: {
    id: string
    exercise_slug: string
    exercise_name: string
    position: number
    block: string
    role: string
    status: 'completed' | 'partial' | 'skipped'
    replaced_exercise_slug: string | null
    notes: string | null
    sets: {
      id: string
      set_number: number
      set_type: string
      target_reps: number | null
      target_weight_kg: number | null
      target_distance_m: number | null
      target_duration_sec: number | null
      target_calories: number | null
      reps: number | null
      weight_kg: number | null
      distance_m: number | null
      duration_sec: number | null
      calories: number | null
      rpe: number | null
      completed: boolean
      completed_at: string | null
    }[]
  }[]
  records: {
    exercise_slug: string
    record_type: string
    context: Record<string, number>
    context_key: string
    value: number
    unit: string
    achieved_at: string
  }[]
}

export interface SessionFeedback {
  /** Anstrengung des ganzen Trainings 1–10 */
  sessionRpe: number | undefined
  notes: string | undefined
}

const orNull = <T>(value: T | undefined): T | null => (value === undefined ? null : value)

/**
 * Wandelt ein BEENDETES Training in die Speicher-Nutzlast um.
 * Gleiche Session → gleiche IDs → wiederholtes Speichern legt nichts doppelt an.
 */
export function toSaveSessionPayload(
  session: ActiveSession,
  feedback: SessionFeedback,
): SaveSessionPayload {
  if (!session.finishedAt) throw new Error('Training ist noch nicht beendet')
  const activeSec = activeSeconds(session, session.finishedAt)
  const notes = feedback.notes?.trim()

  return {
    session: {
      id: session.id,
      started_at: session.startedAt,
      ended_at: session.finishedAt,
      active_duration_sec: activeSec,
      status: sessionOutcome(session),
      focus: session.workout.focus,
      intensity: session.workout.intensity,
      session_rpe: orNull(feedback.sessionRpe),
      notes: notes ? notes : null,
      workout_snapshot: session.workout,
      generator_version: session.workout.generatorVersion,
      training_load:
        feedback.sessionRpe === undefined
          ? 0
          : sessionLoad({ sessionRpe: feedback.sessionRpe, durationMin: activeSec / 60 }),
    },
    exercises: session.exercises.map((exercise, position) => ({
      id: exercise.id,
      exercise_slug: exercise.exerciseSlug,
      exercise_name: exercise.exerciseName,
      position,
      block: exercise.block,
      role: exercise.role,
      status: exerciseOutcome(exercise),
      replaced_exercise_slug: orNull(exercise.replacedSlug),
      notes: null,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        set_number: set.setNumber,
        set_type: set.type,
        target_reps: orNull(set.target.reps),
        target_weight_kg: orNull(set.target.weightKg),
        target_distance_m: orNull(set.target.distanceM),
        target_duration_sec: orNull(set.target.durationSec),
        target_calories: orNull(set.target.calories),
        reps: orNull(set.actual.reps),
        weight_kg: orNull(set.actual.weightKg),
        distance_m: orNull(set.actual.distanceM),
        duration_sec: orNull(set.actual.durationSec),
        calories: orNull(set.actual.calories),
        rpe: orNull(set.rpe),
        completed: set.completed,
        completed_at: orNull(set.completedAt),
      })),
    })),
    records: detectRecords(session).map((record) => ({
      exercise_slug: record.exerciseSlug,
      record_type: record.recordType,
      context: record.context,
      context_key: record.contextKey,
      value: record.value,
      unit: record.unit,
      achieved_at: record.achievedAt,
    })),
  }
}
