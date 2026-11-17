import type { LoadParams } from '@/data/exercises/schema'
import { COMBAT_SPORTS, type CombatSport } from '@/data/exercises/vocabulary'
import { formatRange } from '@/features/exercises/format'
import { formatDurationClock } from '@/lib/time'

/** Adress-Teil der Sportart (/combat/bjj …) – unbekannte Werte ergeben `undefined`. */
export function parseSport(value: string | undefined): CombatSport | undefined {
  return (COMBAT_SPORTS as readonly string[]).includes(value ?? '')
    ? (value as CombatSport)
    : undefined
}

const kg = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

function clockRange([min, max]: readonly [number, number]): string {
  return min === max
    ? formatDurationClock(min)
    : `${formatDurationClock(min)}–${formatDurationClock(max)}`
}

/** Kurzform der Dosierung für Listen, z. B. „3–5 × 2:00–3:00 min" oder „4 × 8 · 12,5 kg". */
export function drillDosage(load: LoadParams): string {
  const amount = load.reps
    ? `${formatRange(load.reps)} Wdh.`
    : load.durationSec
      ? `${clockRange(load.durationSec)} min`
      : ''
  const weight = load.weightKg ? ` · ${kg.format(load.weightKg[0])} kg` : ''
  return `${formatRange(load.sets)} × ${amount}${weight}`
}
