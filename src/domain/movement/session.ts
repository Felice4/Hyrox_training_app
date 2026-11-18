import type { ExerciseDefinition } from '@/data/exercises/schema'
import {
  MOVEMENT_GROUPS,
  MOVEMENT_GROUP_LABELS,
  type Measurement,
  type MovementGroup,
} from '@/data/exercises/vocabulary'
import type { GeneratedWorkout, PlannedSet, WorkoutItem } from '@/domain/generator/types'

/**
 * Mobility-Einheit (docs/MOVEMENT.md §4): Übungen aus dem Movement Lab kombinieren und
 * als Workout für den Trainingsmodus aufbauen. Reine Funktionen ohne UI/DB.
 */

export const MOVEMENT_SESSION_VERSION = 'movement-1'

/** Eine Übung der Mobility-Einheit mit konkreten Vorgaben. */
export interface MovementPlanItem {
  slug: string
  name: string
  measurement: Measurement
  groups: MovementGroup[]
  sets: number
  reps?: number | undefined
  durationSec?: number | undefined
  weightKg?: number | undefined
  restSec: number
}

/** Nacheinander: Übung für Übung · Zirkel: alle Übungen im Wechsel, Runde für Runde. */
export type MovementMode = 'sequence' | 'circuit'

export interface MovementPlan {
  items: MovementPlanItem[]
  mode: MovementMode
  /** Nur im Zirkel: Anzahl der Runden (ersetzt die Sätze je Übung) */
  rounds: number
}

export const EMPTY_MOVEMENT_PLAN: MovementPlan = { items: [], mode: 'sequence', rounds: 3 }

/** Geschätzte Sekunden je Wiederholung (Bewegungen sind meist je Seite). */
const SEC_PER_REP = 5
/** Wechsel zwischen Übungen (Position einnehmen …). */
const TRANSITION_SEC = 15

type MovementSource = Pick<
  ExerciseDefinition,
  'slug' | 'name' | 'measurement' | 'movementGroups' | 'loadParams'
>

/** Vorgaben einer Übung übernehmen; aus Bereichen jeweils der untere Wert. */
export function planItemFromExercise(exercise: MovementSource): MovementPlanItem {
  const load = exercise.loadParams
  return {
    slug: exercise.slug,
    name: exercise.name,
    measurement: exercise.measurement,
    groups: [...exercise.movementGroups],
    sets: load.sets[0],
    reps: load.reps?.[0],
    durationSec: load.durationSec?.[0],
    weightKg: load.weightKg?.[0],
    restSec: load.restSec[0],
  }
}

/** Fügt eine Übung hinzu – dieselbe Übung kommt nicht doppelt vor. */
export function addExercise(plan: MovementPlan, exercise: MovementSource): MovementPlan {
  if (plan.items.some((item) => item.slug === exercise.slug)) return plan
  return { ...plan, items: [...plan.items, planItemFromExercise(exercise)] }
}

export function moveItem(plan: MovementPlan, index: number, offset: -1 | 1): MovementPlan {
  const target = index + offset
  if (target < 0 || target >= plan.items.length) return plan
  const items = [...plan.items]
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item!)
  return { ...plan, items }
}

export function removeItem(plan: MovementPlan, index: number): MovementPlan {
  return { ...plan, items: plan.items.filter((_, i) => i !== index) }
}

/** Gruppen der Einheit in fester Reihenfolge (je Übung die erste; für Titel und Erklärung). */
export function planGroups(plan: MovementPlan): MovementGroup[] {
  const used = new Set(plan.items.flatMap((item) => item.groups.slice(0, 1)))
  return MOVEMENT_GROUPS.filter((group) => used.has(group))
}

function plannedSet(item: MovementPlanItem, restSec: number): PlannedSet {
  return {
    type: 'working',
    reps: item.durationSec === undefined ? item.reps : undefined,
    durationSec: item.durationSec,
    weightKg: item.weightKg,
    restSec,
  }
}

function workSec(item: MovementPlanItem): number {
  return item.durationSec ?? (item.reps ?? 0) * SEC_PER_REP
}

/** Baut das Workout; `undefined`, solange keine Übung gewählt ist. */
export function buildMovementWorkout(plan: MovementPlan, seed = 0): GeneratedWorkout | undefined {
  if (plan.items.length === 0) return undefined
  const circuit = plan.mode === 'circuit' && plan.items.length > 1
  const rounds = Math.max(2, plan.rounds)

  const items: WorkoutItem[] = plan.items.map((item, index) => {
    const isLast = index === plan.items.length - 1
    // Im Zirkel: Pause erst nach der letzten Übung einer Runde, dazwischen nur Wechsel
    const restSec = circuit ? (isLast ? item.restSec : 0) : item.restSec
    const sets = circuit ? rounds : item.sets
    return {
      exerciseSlug: item.slug,
      exerciseName: item.name,
      role: 'movement',
      sets: Array.from({ length: sets }, () => plannedSet(item, restSec)),
      estimatedSec: sets * (workSec(item) + restSec) + TRANSITION_SEC,
    }
  })

  const estimatedSec = items.reduce((sum, item) => sum + item.estimatedSec, 0)
  const estimatedMin = Math.round(estimatedSec / 60)
  const labels = planGroups(plan).map((group) => MOVEMENT_GROUP_LABELS[group])
  const title = `Mobility-Einheit: ${labels.join(' · ')}`.slice(0, 120)

  return {
    generatorVersion: MOVEMENT_SESSION_VERSION,
    seed,
    focus: 'recovery',
    intensity: 'easy',
    targetDurationMin: Math.min(240, Math.max(10, estimatedMin)),
    estimatedDurationMin: estimatedMin,
    blocks: [{ type: 'main', items, ...(circuit ? { rounds } : {}) }],
    explanation: [
      `Mobility-Einheit mit ${plan.items.length} ${plan.items.length === 1 ? 'Übung' : 'Übungen'} aus dem Movement Lab: ${labels.join(', ')}.`,
      circuit
        ? `Zirkel: ${rounds} Runden, alle Übungen im Wechsel; Pause nach jeder Runde.`
        : 'Übung für Übung mit den Vorgaben aus dem Movement Lab.',
      'Locker bleiben: Bewegungen kontrolliert und ohne Schmerz ausführen.',
    ],
    recoverySuggested: false,
    title,
  }
}

const isPositive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0
const isOptionalPositive = (v: unknown) => v === undefined || isPositive(v)

/** Prüft einen lokal gesicherten Plan; Beschädigtes wird verworfen. */
export function restoreMovementPlan(stored: unknown): MovementPlan {
  if (typeof stored !== 'object' || stored === null) return EMPTY_MOVEMENT_PLAN
  const plan = stored as Partial<MovementPlan>
  const items = Array.isArray(plan.items)
    ? plan.items.filter(
        (item: Partial<MovementPlanItem> | null) =>
          typeof item?.slug === 'string' &&
          typeof item.name === 'string' &&
          typeof item.measurement === 'string' &&
          Array.isArray(item.groups) &&
          isPositive(item.sets) &&
          isOptionalPositive(item.reps) &&
          isOptionalPositive(item.durationSec) &&
          isOptionalPositive(item.weightKg) &&
          typeof item.restSec === 'number' &&
          item.restSec >= 0,
      )
    : []
  return {
    items: items as MovementPlanItem[],
    mode: plan.mode === 'circuit' ? 'circuit' : 'sequence',
    rounds: isPositive(plan.rounds) ? Math.min(20, Math.round(plan.rounds!)) : 3,
  }
}
