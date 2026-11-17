import type { ExerciseDefinition } from '@/data/exercises/schema'
import {
  COMBAT_SPORTS,
  COMBAT_SPORT_LABELS,
  type CombatSport,
  type Measurement,
} from '@/data/exercises/vocabulary'
import type { GeneratedWorkout, PlannedSet, WorkoutItem } from '@/domain/generator/types'

/**
 * Kampfsport-Training (docs/COMBAT.md §5): Drills aus beliebigen Sportarten kombinieren
 * und als Workout für den Trainingsmodus aufbauen. Reine Funktionen ohne UI/DB.
 */

export const COMBAT_WORKOUT_VERSION = 'combat-1'

/** Ein Drill im Kampfsport-Training mit konkreten Vorgaben. */
export interface CombatPlanItem {
  slug: string
  name: string
  measurement: Measurement
  sports: CombatSport[]
  sets: number
  reps?: number | undefined
  durationSec?: number | undefined
  weightKg?: number | undefined
  restSec: number
}

/** Nacheinander: Drill für Drill · Zirkel: alle Drills im Wechsel, Runde für Runde. */
export type CombatMode = 'sequence' | 'circuit'

export interface CombatPlan {
  items: CombatPlanItem[]
  mode: CombatMode
  /** Nur im Zirkel: Anzahl der Runden (ersetzt die Sätze je Drill) */
  rounds: number
}

export const EMPTY_COMBAT_PLAN: CombatPlan = { items: [], mode: 'sequence', rounds: 3 }

/** Geschätzte Sekunden je Wiederholung (Technik-Drills sind meist je Seite). */
const SEC_PER_REP = 5
/** Wechsel zwischen Drills (Position einnehmen, Partner tauschen …). */
const TRANSITION_SEC = 30

type DrillSource = Pick<
  ExerciseDefinition,
  'slug' | 'name' | 'measurement' | 'combatSports' | 'loadParams'
>

/** Vorgaben eines Drills übernehmen; aus Bereichen jeweils der untere Wert. */
export function planItemFromDrill(drill: DrillSource): CombatPlanItem {
  const load = drill.loadParams
  return {
    slug: drill.slug,
    name: drill.name,
    measurement: drill.measurement,
    sports: [...drill.combatSports],
    sets: load.sets[0],
    reps: load.reps?.[0],
    durationSec: load.durationSec?.[0],
    weightKg: load.weightKg?.[0],
    restSec: load.restSec[0],
  }
}

/** Fügt einen Drill hinzu – derselbe Drill kommt nicht doppelt vor. */
export function addDrill(plan: CombatPlan, drill: DrillSource): CombatPlan {
  if (plan.items.some((item) => item.slug === drill.slug)) return plan
  return { ...plan, items: [...plan.items, planItemFromDrill(drill)] }
}

export function moveItem(plan: CombatPlan, index: number, offset: -1 | 1): CombatPlan {
  const target = index + offset
  if (target < 0 || target >= plan.items.length) return plan
  const items = [...plan.items]
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item!)
  return { ...plan, items }
}

export function removeItem(plan: CombatPlan, index: number): CombatPlan {
  return { ...plan, items: plan.items.filter((_, i) => i !== index) }
}

/** Sportarten des Trainings in fester Reihenfolge (für Titel und Erklärung). */
export function planSports(plan: CombatPlan): CombatSport[] {
  const used = new Set(plan.items.flatMap((item) => item.sports.slice(0, 1)))
  return COMBAT_SPORTS.filter((sport) => used.has(sport))
}

const SHORT_LABELS: Partial<Record<CombatSport, string>> = { bjj: 'BJJ' }
const sportLabel = (sport: CombatSport) => SHORT_LABELS[sport] ?? COMBAT_SPORT_LABELS[sport]

function plannedSet(item: CombatPlanItem, restSec: number): PlannedSet {
  return {
    type: 'working',
    reps: item.durationSec === undefined ? item.reps : undefined,
    durationSec: item.durationSec,
    weightKg: item.weightKg,
    restSec,
  }
}

function workSec(item: CombatPlanItem): number {
  return item.durationSec ?? (item.reps ?? 0) * SEC_PER_REP
}

/** Baut das Workout; `undefined`, solange kein Drill gewählt ist. */
export function buildCombatWorkout(plan: CombatPlan, seed = 0): GeneratedWorkout | undefined {
  if (plan.items.length === 0) return undefined
  const circuit = plan.mode === 'circuit' && plan.items.length > 1
  const rounds = Math.max(2, plan.rounds)

  const items: WorkoutItem[] = plan.items.map((item, index) => {
    const isLast = index === plan.items.length - 1
    // Im Zirkel: Pause erst nach dem letzten Drill einer Runde, dazwischen nur Wechsel
    const restSec = circuit ? (isLast ? item.restSec : 0) : item.restSec
    const sets = circuit ? rounds : item.sets
    return {
      exerciseSlug: item.slug,
      exerciseName: item.name,
      role: 'skill',
      sets: Array.from({ length: sets }, () => plannedSet(item, restSec)),
      estimatedSec: sets * (workSec(item) + restSec) + TRANSITION_SEC,
    }
  })

  const estimatedSec = items.reduce((sum, item) => sum + item.estimatedSec, 0)
  const estimatedMin = Math.round(estimatedSec / 60)
  const labels = planSports(plan).map(sportLabel)
  const title = `Kampfsport: ${labels.join(' · ')}`.slice(0, 120)

  return {
    generatorVersion: COMBAT_WORKOUT_VERSION,
    seed,
    focus: 'mixed',
    intensity: 'moderate',
    targetDurationMin: Math.min(240, Math.max(10, estimatedMin)),
    estimatedDurationMin: estimatedMin,
    blocks: [{ type: 'main', items, ...(circuit ? { rounds } : {}) }],
    explanation: [
      `Kampfsport-Training mit ${plan.items.length} ${plan.items.length === 1 ? 'Drill' : 'Drills'} aus ${labels.join(', ')}.`,
      circuit
        ? `Zirkel: ${rounds} Runden, alle Drills im Wechsel; Pause nach jeder Runde.`
        : 'Drill für Drill mit den Vorgaben aus der Kampfsport-Bibliothek.',
      'Vorher aufwärmen (z. B. Seilspringen, Shrimps, Schattenboxen locker).',
    ],
    recoverySuggested: false,
    title,
  }
}

const isPositive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0
const isOptionalPositive = (v: unknown) => v === undefined || isPositive(v)

/** Prüft einen lokal gesicherten Plan; Beschädigtes wird verworfen. */
export function restoreCombatPlan(stored: unknown): CombatPlan {
  if (typeof stored !== 'object' || stored === null) return EMPTY_COMBAT_PLAN
  const plan = stored as Partial<CombatPlan>
  const items = Array.isArray(plan.items)
    ? plan.items.filter(
        (item: Partial<CombatPlanItem> | null) =>
          typeof item?.slug === 'string' &&
          typeof item.name === 'string' &&
          typeof item.measurement === 'string' &&
          Array.isArray(item.sports) &&
          isPositive(item.sets) &&
          isOptionalPositive(item.reps) &&
          isOptionalPositive(item.durationSec) &&
          isOptionalPositive(item.weightKg) &&
          typeof item.restSec === 'number' &&
          item.restSec >= 0,
      )
    : []
  return {
    items: items as CombatPlanItem[],
    mode: plan.mode === 'circuit' ? 'circuit' : 'sequence',
    rounds: isPositive(plan.rounds) ? Math.min(20, Math.round(plan.rounds!)) : 3,
  }
}
