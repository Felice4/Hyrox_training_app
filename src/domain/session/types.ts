import type { Measurement } from '@/data/exercises/vocabulary'
import type { BlockType, GeneratedWorkout, SetType, SlotRole } from '@/domain/generator/types'
import type { Division, SimulationFormat } from '@/domain/simulation/formats'

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

/**
 * Arbeitstimer für einen Satz: Countdown bei Zeitvorgaben (z. B. 45 s Plank),
 * Stoppuhr bei Strecken (z. B. 1 km Lauf – die Zeit wird gemessen).
 */
export interface WorkTimer {
  exerciseId: string
  setId: string
  mode: 'countdown' | 'stopwatch'
  startedAt: string
  /** Nur beim Countdown */
  durationSec?: number | undefined
}

/** HYROX-Simulation: Format, Division und Start der Rennuhr (docs/SIMULATION.md). */
export interface SimulationMeta {
  format: SimulationFormat
  division: Division
  /** Start der Rennuhr; vorher läuft noch nichts */
  raceStartedAt?: string | undefined
}

/** Ein laufendes Training. Wird bei jeder Änderung lokal gesichert. */
export interface ActiveSession {
  id: string
  startedAt: string
  /** Ursprünglich erzeugtes Workout (für den Vergleich Plan ↔ Ist) */
  workout: GeneratedWorkout
  /** Geplante Einheit aus dem Wochenplan, aus der das Training gestartet wurde */
  plannedWorkoutId?: string | undefined
  /** Tagesform-Check-in des Trainingstags */
  readinessCheckinId?: string | undefined
  exercises: ActiveExercise[]
  /** Index im Ablauf (siehe `buildSteps`) */
  cursor: number
  pausedSince?: string | undefined
  pausedSec: number
  rest?: RestTimer | undefined
  workTimer?: WorkTimer | undefined
  finishedAt?: string | undefined
  /** Gesetzt, wenn das Training eine HYROX-Simulation ist */
  simulation?: SimulationMeta | undefined
}

/** Ein Schritt im Ablauf: Satz `setIndex` der Übung `exerciseIndex`. */
export interface Step {
  exerciseIndex: number
  setIndex: number
}
