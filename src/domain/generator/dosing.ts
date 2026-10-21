import { suggestWeight, roundToStep, weightStep } from '@/domain/progression/progression'
import type {
  GeneratorExercise,
  HistorySession,
  Intensity,
  PlannedSet,
  SetType,
  SlotRole,
} from './types'

type Range = readonly [number, number]

const clamp = (value: number, [min, max]: Range) => Math.min(max, Math.max(min, value))

/** Angenehme Zahlen: kurze Strecken auf 5 m, mittlere auf 50 m, lange auf 250 m. */
export function niceDistance(meters: number): number {
  const step = meters < 100 ? 5 : meters < 1000 ? 50 : 250
  return Math.max(step, Math.round(meters / step) * step)
}

/** Dauer: unter 2 min auf 5 s, sonst auf 30 s gerundet. */
export function niceDuration(seconds: number): number {
  const step = seconds < 120 ? 5 : 30
  return Math.max(step, Math.round(seconds / step) * step)
}

const roundRest = (seconds: number) => Math.round(seconds / 15) * 15

/** Wert innerhalb eines Bereichs je Intensität: leicht → unten, hart → oben. */
function pick([min, max]: Range, intensity: Intensity): number {
  if (intensity === 'easy') return min
  if (intensity === 'hard') return max
  return (min + max) / 2
}

/** Ziel-Wiederholungen je Rolle (innerhalb des Bereichs der Übung). */
const ROLE_REPS: Partial<Record<SlotRole, number>> = {
  strength_main: 5,
  hypertrophy: 10,
  accessory: 12,
  core: 12,
}

/** Grund-Satzzahl je Rolle bei mittlerer Intensität. */
const ROLE_SETS: Record<SlotRole, number | 'range'> = {
  warmup_cardio: 1,
  warmup_drill: 1,
  strength_main: 4,
  hypertrophy: 3,
  accessory: 3,
  core: 3,
  run: 'range',
  station: 'range',
  conditioning: 3,
  interval: 'range',
  steady: 1,
  mobility: 1,
  cooldown_cardio: 1,
  stretch: 1,
}

/** Rollen, deren Satzzahl sich mit Intensität und Tagesform ändert. */
const VOLUME_ROLES: readonly SlotRole[] = [
  'strength_main',
  'hypertrophy',
  'accessory',
  'core',
  'conditioning',
  'interval',
  'station',
  'run',
]

/** Rollen mit stufenlos einstellbarer Dauer (für die Zeitanpassung). */
export const ADJUSTABLE_ROLES: readonly SlotRole[] = ['warmup_cardio', 'cooldown_cardio', 'steady']

/** Spielraum der einstellbaren Einheiten in Sekunden (Warm-up/Cool-down unabhängig von der Übung). */
export function adjustableRange(exercise: GeneratorExercise, role: SlotRole): Range | undefined {
  if (role === 'warmup_cardio') return [300, 720]
  if (role === 'cooldown_cardio') return [120, 600]
  if (role === 'steady') return exercise.loadParams.durationSec ?? undefined
  return undefined
}

export interface DosingOptions {
  intensity: Intensity
  /** Faktor aus Tagesform (0,8 = 20 % weniger Volumen) */
  volumeFactor: number
  /** Faktor für Gewichte bei sehr niedriger Tagesform */
  loadFactor: number
  history: readonly HistorySession[]
  /** Feste Satzzahl, z. B. Rundenzahl eines Zirkels */
  fixedSets?: number | undefined
}

export interface DosedItem {
  sets: PlannedSet[]
  note?: string | undefined
}

function setTypeFor(role: SlotRole): SetType {
  if (role === 'run' || role === 'interval') return 'interval'
  if (role === 'station' || role === 'conditioning') return 'round'
  return 'working'
}

/** Satzzahl einer Übung für eine Rolle. */
export function setCount(exercise: GeneratorExercise, role: SlotRole, options: DosingOptions) {
  if (options.fixedSets !== undefined) return options.fixedSets
  const range = exercise.loadParams.sets
  const base = ROLE_SETS[role]
  let sets = base === 'range' ? Math.round((range[0] + range[1]) / 2) : base
  if (VOLUME_ROLES.includes(role)) {
    if (options.intensity === 'easy') sets -= 1
    if (options.intensity === 'hard') sets += 1
    sets = Math.round(sets * options.volumeFactor)
  }
  const minSets = VOLUME_ROLES.includes(role) ? Math.max(range[0], 2) : range[0]
  return clamp(sets, [Math.min(minSets, range[1]), range[1]])
}

/**
 * Konkrete Sätze für eine Übung in einer Rolle (docs/GENERATOR.md, Schritt 7).
 * Gewichte nur aus eigener Leistung (Progression), nie aus Körperdaten.
 */
export function doseExercise(
  exercise: GeneratorExercise,
  role: SlotRole,
  options: DosingOptions,
): DosedItem {
  const { loadParams: load, measurement } = exercise
  const count = setCount(exercise, role, options)
  const type = setTypeFor(role)
  // Pausen nach Rolle: schwere Hauptübungen lang, Ergänzungen kurz, sonst mittig
  const restSec = roundRest(
    role === 'strength_main'
      ? load.restSec[1]
      : ['hypertrophy', 'accessory', 'core'].includes(role)
        ? load.restSec[0]
        : (load.restSec[0] + load.restSec[1]) / 2,
  )
  // Im Zirkel kommt alles mehrfach hintereinander → Umfang je Station etwas geringer
  const volumeLevel: Intensity =
    options.fixedSets !== undefined
      ? options.intensity === 'hard'
        ? 'moderate'
        : 'easy'
      : options.intensity
  const inCircuitShare = options.fixedSets !== undefined && options.intensity === 'moderate'

  const base: Omit<PlannedSet, 'type' | 'restSec'> = {}
  let note: string | undefined

  if (load.reps && (measurement === 'reps' || measurement === 'weight_reps')) {
    const target = ROLE_REPS[role] ?? (load.reps[0] + load.reps[1]) / 2
    base.reps = Math.round(clamp(target, load.reps))
  }
  if (load.distanceM && measurement !== 'reps' && measurement !== 'weight_reps') {
    base.distanceM = niceDistance(
      inCircuitShare
        ? load.distanceM[0] + (load.distanceM[1] - load.distanceM[0]) / 3
        : pick(load.distanceM, volumeLevel),
    )
  }
  if (load.durationSec && (measurement === 'time' || measurement === 'weight_time')) {
    base.durationSec = ADJUSTABLE_ROLES.includes(role)
      ? niceDuration((adjustableRange(exercise, role) ?? load.durationSec)[0])
      : niceDuration(pick(load.durationSec, volumeLevel))
  }
  if (load.calories && measurement === 'calories') {
    base.calories = Math.round(pick(load.calories, volumeLevel))
  }

  // Gewichtsvorschlag für Kraftübungen mit Gewicht
  if (
    measurement === 'weight_reps' &&
    base.reps !== undefined &&
    ['strength_main', 'hypertrophy', 'accessory'].includes(role)
  ) {
    const suggestion = suggestWeight(exercise, base.reps, options.history, options.loadFactor)
    base.weightKg = suggestion.weightKg
    note = suggestion.note
  }

  const sets: PlannedSet[] = Array.from({ length: count }, () => ({ ...base, type, restSec }))

  // Hauptübungen bekommen einen Aufwärmsatz mit etwa halbem Gewicht
  if (role === 'strength_main' && base.reps !== undefined) {
    const warmupWeight =
      base.weightKg !== undefined
        ? roundToStep(base.weightKg * 0.5, weightStep(exercise.equipment), 'down')
        : undefined
    sets.unshift({ type: 'warmup', reps: 8, weightKg: warmupWeight, restSec: 60 })
  }
  return { sets, note }
}
