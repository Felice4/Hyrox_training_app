import type { SavedRecord } from '@/api/sessions'
import type { SetValues } from '@/domain/session/types'
import { formatDistance } from '@/features/exercises/format'
import { formatDurationClock } from '@/lib/time'

const decimal = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',')

/** Vorgabe eines Satzes in Worten: „5 Wdh. · 100 kg", „1 km", „0:45". */
export function describeTarget(values: SetValues): string {
  const parts: string[] = []
  if (values.reps !== undefined) parts.push(`${values.reps} Wdh.`)
  if (values.distanceM !== undefined)
    parts.push(formatDistance([values.distanceM, values.distanceM]))
  if (values.durationSec !== undefined) parts.push(formatDurationClock(values.durationSec))
  if (values.calories !== undefined) parts.push(`${values.calories} kcal`)
  if (values.weightKg !== undefined) parts.push(`${decimal(values.weightKg)} kg`)
  return parts.join(' · ')
}

/** Neue Bestleistung lesbar: Bezeichnung und Wert. */
export function describeRecord(
  record: Pick<SavedRecord, 'record_type' | 'context_key' | 'value'>,
): {
  label: string
  value: string
} {
  const context = Object.fromEntries(
    record.context_key
      .split(';')
      .filter(Boolean)
      .map((pair) => pair.split('=') as [string, string]),
  )
  const distance = context.distance_m
    ? formatDistance([Number(context.distance_m), Number(context.distance_m)])
    : ''
  switch (record.record_type) {
    case 'estimated_1rm':
      return { label: 'Geschätztes Maximalgewicht (1 Wdh.)', value: `${decimal(record.value)} kg` }
    case 'max_weight':
      return context.reps
        ? {
            label: `Höchstes Gewicht für ${context.reps} Wdh.`,
            value: `${decimal(record.value)} kg`,
          }
        : { label: `Höchstes Gewicht über ${distance}`, value: `${decimal(record.value)} kg` }
    case 'max_reps':
      return { label: 'Meiste Wiederholungen am Stück', value: `${decimal(record.value)}` }
    case 'best_time':
      return { label: `Bestzeit über ${distance}`, value: formatDurationClock(record.value) }
    default:
      return { label: 'Bestleistung', value: decimal(record.value) }
  }
}

/** Kurze Beschreibung der Anstrengung (RPE-Skala 1–10). */
export function rpeLabel(rpe: number): string {
  if (rpe <= 2) return 'sehr leicht'
  if (rpe <= 4) return 'leicht'
  if (rpe <= 6) return 'mittel'
  if (rpe <= 8) return 'schwer'
  if (rpe === 9) return 'sehr schwer'
  return 'maximal'
}
