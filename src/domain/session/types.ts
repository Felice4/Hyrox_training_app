import type { Measurement } from '@/data/exercises/vocabulary'
import type { BlockType, GeneratedWorkout, SetType, SlotRole } from '@/domain/generator/types'

/** Messwerte eines Satzes (Vorgabe oder tatsächlich). */
export interface SetValues {
  reps?: number | undefined
  weightKg?: number | undefined
  distanceM?: number | undefined
  durationSec?: number | undefined
  calories?: number | undefined
}

export interface ActiveSet {
  id: string
  setNumber: number
  type: SetType
  target: SetValues & { restSec: number }
  actual: SetValues
  rpe?: number | undefined
  completed: boolean
  completedAt?: string | undefined
}

export interface ActiveExercise {
  id: string
  exerciseSlug: string
  exerciseName: string
  /** Welche Werte erfasst werden (Gewicht × Wdh., Strecke und Zeit …) */
  measurement: Measurement
  role: SlotRole
  block: BlockType
  /** Gesetzt, wenn die Übung Teil eines Zirkels ist */
  inCircuit: boolean
  skipped: boolean
  /** Ursprünglich geplante Übung, falls ausgetauscht */
  replacedSlug?: string | undefined
  sets: ActiveSet[]
  /** Hinweis aus dem Generator (Progression) */
  note?: string | undefined
}

/** Laufender Pausentimer – als Zeitstempel, damit er im Hintergrund korrekt weiterläuft. */
export interface RestTimer {
  startedAt: string
  durationSec: number
}

/** Ein laufendes Training. Wird bei jeder Änderung lokal gesichert. */
export interface ActiveSession {
  id: string
  startedAt: string
  /** Ursprünglich erzeugtes Workout (für den Vergleich Plan ↔ Ist) */
  workout: GeneratedWorkout
  exercises: ActiveExercise[]
  /** Index im Ablauf (siehe `buildSteps`) */
  cursor: number
  pausedSince?: string | undefined
  pausedSec: number
  rest?: RestTimer | undefined
  finishedAt?: string | undefined
}

/** Ein Schritt im Ablauf: Satz `setIndex` der Übung `exerciseIndex`. */
export interface Step {
  exerciseIndex: number
  setIndex: number
}
