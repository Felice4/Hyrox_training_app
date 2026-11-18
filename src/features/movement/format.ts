import type { LoadParams } from '@/data/exercises/schema'
import { MOVEMENT_GROUPS, type MovementGroup } from '@/data/exercises/vocabulary'
import { formatRange } from '@/features/exercises/format'
import { formatDurationClock } from '@/lib/time'

/** Adress-Teil der Gruppe (/movement/mobility …) – unbekannte Werte ergeben `undefined`. */
export function parseGroup(value: string | undefined): MovementGroup | undefined {
  return (MOVEMENT_GROUPS as readonly string[]).includes(value ?? '')
    ? (value as MovementGroup)
    : undefined
}

const kg = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

function clockRange([min, max]: readonly [number, number]): string {
  return min === max
    ? formatDurationClock(min)
    : `${formatDurationClock(min)}–${formatDurationClock(max)}`
}

/** Kurzform der Dosierung für Listen, z. B. „1–3 × 0:30–1:00 min" oder „2 × 8 Wdh.". */
export function movementDosage(load: LoadParams): string {
  const amount = load.reps
    ? `${formatRange(load.reps)} Wdh.`
    : load.durationSec
      ? `${clockRange(load.durationSec)} min`
      : ''
  const weight = load.weightKg ? ` · ${kg.format(load.weightKg[0])} kg` : ''
  return `${formatRange(load.sets)} × ${amount}${weight}`
}
