import type { LoadParams } from '@/data/exercises/schema'

type Range = readonly [number, number]

const numberFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
  useGrouping: false,
})

function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** [3, 5] → „3–5", [5, 5] → „5". */
export function formatRange([min, max]: Range, unit = ''): string {
  const value = min === max ? formatNumber(min) : `${formatNumber(min)}–${formatNumber(max)}`
  return unit ? `${value} ${unit}` : value
}

/** Strecke: ab 1 km in Kilometern, sonst in Metern. */
export function formatDistance([min, max]: Range): string {
  return min >= 1000 ? formatRange([min / 1000, max / 1000], 'km') : formatRange([min, max], 'm')
}

/** Dauer: ab 2 Minuten in Minuten, sonst in Sekunden. */
export function formatDuration([min, max]: Range): string {
  return max >= 120 ? formatRange([min / 60, max / 60], 'min') : formatRange([min, max], 's')
}

export interface LoadLine {
  label: string
  value: string
}

/** Belastungsparameter als lesbare Zeilen für die Detailansicht. */
export function describeLoad(load: LoadParams): LoadLine[] {
  const lines: LoadLine[] = [{ label: 'Sätze / Runden', value: formatRange(load.sets) }]
  if (load.reps) lines.push({ label: 'Wiederholungen', value: formatRange(load.reps) })
  if (load.distanceM) lines.push({ label: 'Strecke', value: formatDistance(load.distanceM) })
  if (load.durationSec) lines.push({ label: 'Dauer', value: formatDuration(load.durationSec) })
  if (load.calories) lines.push({ label: 'Kalorien', value: formatRange(load.calories, 'kcal') })
  if (load.restSec[1] > 0) {
    lines.push({ label: 'Pause', value: formatDuration(load.restSec) })
  }
  return lines
}
