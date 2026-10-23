import type { ExerciseDefinition } from '@/data/exercises/schema'
import type {
  Equipment,
  HyroxStation,
  MuscleGroup,
  Preference,
  StressRegion,
} from '@/data/exercises/vocabulary'
import type { TrainingLevel } from '@/domain/profile/vocabulary'

// -----------------------------------------------------------------------------
// Anfrage
// -----------------------------------------------------------------------------

export const FOCUSES = ['hyrox', 'strength', 'endurance', 'full_body', 'mixed', 'recovery'] as const
export type Focus = (typeof FOCUSES)[number]

export const INTENSITIES = ['easy', 'moderate', 'hard'] as const
export type Intensity = (typeof INTENSITIES)[number]

/** Tagesform: Schnellauswahl oder die vier Skalen des Check-ins (1–5, höher = besser). */
export type ReadinessInput =
  | { kind: 'quick'; level: 'low' | 'normal' | 'high' }
  | {
      kind: 'checkin'
      energy: number
      /** 1 = starker Muskelkater, 5 = keiner */
      soreness: number
      sleepQuality: number
      recovery: number
    }

export interface WorkoutRequest {
  durationMin: number
  focus: Focus
  intensity: Intensity
  readiness?: ReadinessInput | undefined
  targetMuscles?: readonly MuscleGroup[] | undefined
  hyroxStations?: readonly HyroxStation[] | undefined
  unavailableEquipment?: readonly Equipment[] | undefined
}

export interface GeneratorProfile {
  trainingLevel: TrainingLevel
  availableEquipment: readonly Equipment[]
  limitationRegions: readonly StressRegion[]
}

export interface GoalWeights {
  hypertrophy: number
  strength: number
  endurance: number
  hyrox: number
}

/** Übung, wie sie der Generator nutzt (Bibliothek oder eigene, inkl. Präferenz). */
export interface GeneratorExercise extends ExerciseDefinition {
  preference: Preference
}

// -----------------------------------------------------------------------------
// Trainingsverlauf (wird ab Schritt 2.7 aus gespeicherten Trainings gebaut)
// -----------------------------------------------------------------------------

export type SetType = 'warmup' | 'working' | 'interval' | 'round'

export interface HistorySet {
  setType: SetType
  completed: boolean
  reps?: number | undefined
  weightKg?: number | undefined
  distanceM?: number | undefined
  durationSec?: number | undefined
  /** Anstrengung des Satzes (1–10), falls erfasst */
  rpe?: number | undefined
  /** Vorgabe beim Training (für die Progression) */
  targetReps?: number | undefined
}

export interface HistoryExercise {
  exerciseSlug: string
  /** Block im Training (Warm-up/Cool-down zählen nicht als Leistung) */
  block?: BlockType | undefined
  sets: readonly HistorySet[]
}

export interface HistorySession {
  /** ISO-Zeitpunkt des Trainingsbeginns */
  startedAt: string
  focus: Focus
  /** Aktive Trainingszeit in Minuten */
  durationMin: number
  /** Anstrengung des ganzen Trainings (1–10), falls erfasst */
  sessionRpe?: number | undefined
  exercises: readonly HistoryExercise[]
}

export interface WorkoutRequestInput {
  request: WorkoutRequest
  profile: GeneratorProfile
  goals: GoalWeights
  exercises: readonly GeneratorExercise[]
  /** Trainings der letzten 28 Tage (ältere werden ignoriert) */
  history: readonly HistorySession[]
  /** Aktueller Zeitpunkt (ISO) – nie Date.now() im Generator */
  now: string
  seed: number
}

// -----------------------------------------------------------------------------
// Ergebnis
// -----------------------------------------------------------------------------

export const BLOCK_TYPES = ['warmup', 'main', 'accessory', 'conditioning', 'cooldown'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

/**
 * Rolle einer Übung im Workout – bestimmt Dosierung und passende Austauschübungen.
 * Bleibt beim Austausch erhalten.
 */
export const SLOT_ROLES = [
  'warmup_cardio',
  'warmup_drill',
  'strength_main',
  'hypertrophy',
  'accessory',
  'core',
  'run',
  'station',
  'conditioning',
  'interval',
  'steady',
  'mobility',
  'cooldown_cardio',
  'stretch',
] as const
export type SlotRole = (typeof SLOT_ROLES)[number]

export interface PlannedSet {
  type: SetType
  reps?: number | undefined
  weightKg?: number | undefined
  distanceM?: number | undefined
  durationSec?: number | undefined
  calories?: number | undefined
  restSec: number
}

export interface WorkoutItem {
  exerciseSlug: string
  exerciseName: string
  role: SlotRole
  sets: PlannedSet[]
  /** Hinweis zur Progression, z. B. „letztes Mal 3 × 8 mit RPE 7 → +2,5 kg" */
  note?: string | undefined
  /** Geschätzte Dauer der Übung inkl. Pausen und Wechsel (Sekunden) */
  estimatedSec: number
}

export interface WorkoutBlock {
  type: BlockType
  items: WorkoutItem[]
  /**
   * Zirkel: Die Übungen werden im Wechsel absolviert, Runde für Runde.
   * Jede Übung hat dann genau so viele Sätze wie Runden.
   */
  rounds?: number | undefined
}

export interface GeneratedWorkout {
  generatorVersion: string
  seed: number
  focus: Focus
  /** Intensität nach Anpassung an Tagesform und Belastung */
  intensity: Intensity
  targetDurationMin: number
  estimatedDurationMin: number
  blocks: WorkoutBlock[]
  /** Kurze Begründungen der Entscheidungen */
  explanation: string[]
  /** Tagesform sehr niedrig → regenerative Einheit wird empfohlen */
  recoverySuggested: boolean
}
