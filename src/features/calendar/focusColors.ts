import type { Focus } from '@/domain/generator/types'

/**
 * Farbe je Trainingstyp im Monatskalender: gefüllter Punkt = absolviert,
 * Ring = geplant.
 */
export const FOCUS_COLORS: Record<Focus, { fill: string; ring: string }> = {
  hyrox: { fill: 'bg-hyrox', ring: 'border-hyrox' },
  strength: { fill: 'bg-accent', ring: 'border-accent' },
  endurance: { fill: 'bg-sky-400', ring: 'border-sky-400' },
  full_body: { fill: 'bg-violet-400', ring: 'border-violet-400' },
  mixed: { fill: 'bg-amber-300', ring: 'border-amber-300' },
  recovery: { fill: 'bg-emerald-400', ring: 'border-emerald-400' },
}
