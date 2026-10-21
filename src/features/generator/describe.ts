import type { PlannedSet, WorkoutItem } from '@/domain/generator/types'
import { formatDistance, formatDuration } from '@/features/exercises/format'

const kg = (weight: number) => `${String(weight).replace('.', ',')} kg`

/** Inhalt eines Satzes: „5 Wdh.", „1 km", „45 s", „15 kcal". */
export function describeSetTarget(set: PlannedSet): string {
  if (set.reps !== undefined) return `${set.reps} Wdh.`
  if (set.distanceM !== undefined) return formatDistance([set.distanceM, set.distanceM])
  if (set.durationSec !== undefined) return formatDuration([set.durationSec, set.durationSec])
  if (set.calories !== undefined) return `${set.calories} kcal`
  return ''
}

/** Pause lesbar: „90 s", „2,5 min". */
export function describeRest(seconds: number): string {
  return formatDuration([seconds, seconds])
}

export interface ItemSummary {
  /** z. B. „4 × 5 Wdh." oder „1 km pro Runde" */
  main: string
  /** z. B. „60 kg · Pause 3 min · + Aufwärmsatz" */
  details: string[]
}

/**
 * Kurzbeschreibung einer Übung im Workout. Im Zirkel („inCircuit") ist die Angabe pro Runde,
 * die Pause steht dann beim Block.
 */
export function summarizeItem(item: WorkoutItem, inCircuit: boolean): ItemSummary {
  const working = item.sets.filter((s) => s.type !== 'warmup')
  const warmups = item.sets.length - working.length
  const first = working[0]
  if (!first) return { main: '', details: [] }

  const target = describeSetTarget(first)
  const main = inCircuit
    ? `${target} pro Runde`
    : working.length === 1
      ? target
      : `${working.length} × ${target}`

  const details: string[] = []
  if (first.weightKg !== undefined) details.push(kg(first.weightKg))
  if (!inCircuit && working.length > 1 && first.restSec > 0) {
    details.push(`Pause ${describeRest(first.restSec)}`)
  }
  if (warmups > 0) details.push(warmups === 1 ? '+ Aufwärmsatz' : `+ ${warmups} Aufwärmsätze`)
  return { main, details }
}

/** Pause nach jeder Zirkelrunde (steht beim letzten Element). */
export function circuitRest(items: readonly WorkoutItem[]): number {
  return items.at(-1)?.sets[0]?.restSec ?? 0
}
