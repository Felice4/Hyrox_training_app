import type { HyroxStation } from '@/data/exercises/vocabulary'

/**
 * HYROX-Simulation (docs/SIMULATION.md): Formate, Divisionen und Wettkampfgewichte.
 * Gewichte nach dem offiziellen HYROX-Regelwerk (Saison 2025/26) – Sled inklusive
 * Schlitten, Farmers Carry je Hand.
 */

export const SIMULATION_FORMATS = ['full', 'half_1', 'half_2', 'short'] as const
export type SimulationFormat = (typeof SIMULATION_FORMATS)[number]
export const SIMULATION_FORMAT_LABELS: Record<SimulationFormat, string> = {
  full: 'Komplett',
  half_1: 'Hälfte 1 (Stationen 1–4)',
  half_2: 'Hälfte 2 (Stationen 5–8)',
  short: 'Kurz (8 × 500 m + halbe Stationen)',
}
export const SIMULATION_FORMAT_HINTS: Record<SimulationFormat, string> = {
  full: '8 × (1 km Lauf + Station) – wie im Wettkampf.',
  half_1: '4 × (1 km Lauf + Station): SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps.',
  half_2: '4 × (1 km Lauf + Station): Rudern, Farmers Carry, Sandbag Lunges, Wall Balls.',
  short: '8 × (500 m Lauf + halbe Station) – für das Training unter der Woche.',
}

export const DIVISIONS = ['open_men', 'open_women', 'pro_men', 'pro_women'] as const
export type Division = (typeof DIVISIONS)[number]
export const DIVISION_LABELS: Record<Division, string> = {
  open_men: 'Open Männer',
  open_women: 'Open Frauen',
  pro_men: 'Pro Männer',
  pro_women: 'Pro Frauen',
}

export type StationKey = Exclude<HyroxStation, 'run'>

/** Station mit Wettkampfumfang (voller Durchgang) und Übung der Bibliothek. */
export interface StationSpec {
  station: StationKey
  exerciseSlug: string
  distanceM?: number
  reps?: number
  /** Gewicht je Division in kg; `undefined` = ohne Gewicht */
  weightKg?: Record<Division, number>
  /** Zusatz zum Gewicht, z. B. „je Hand" */
  weightNote?: string
}

/** Die acht Stationen in Wettkampfreihenfolge. */
export const STATIONS: readonly StationSpec[] = [
  { station: 'skierg', exerciseSlug: 'hyrox-skierg', distanceM: 1000 },
  {
    station: 'sled_push',
    exerciseSlug: 'hyrox-sled-push',
    distanceM: 50,
    weightKg: { open_men: 152, open_women: 102, pro_men: 202, pro_women: 152 },
    weightNote: 'inkl. Schlitten',
  },
  {
    station: 'sled_pull',
    exerciseSlug: 'hyrox-sled-pull',
    distanceM: 50,
    weightKg: { open_men: 103, open_women: 78, pro_men: 153, pro_women: 103 },
    weightNote: 'inkl. Schlitten',
  },
  { station: 'burpee_broad_jump', exerciseSlug: 'hyrox-burpee-broad-jump', distanceM: 80 },
  { station: 'row', exerciseSlug: 'hyrox-row', distanceM: 1000 },
  {
    station: 'farmers_carry',
    exerciseSlug: 'hyrox-farmers-carry',
    distanceM: 200,
    weightKg: { open_men: 24, open_women: 16, pro_men: 32, pro_women: 24 },
    weightNote: 'je Hand',
  },
  {
    station: 'sandbag_lunges',
    exerciseSlug: 'hyrox-sandbag-lunges',
    distanceM: 100,
    weightKg: { open_men: 20, open_women: 10, pro_men: 30, pro_women: 20 },
  },
  {
    station: 'wall_balls',
    exerciseSlug: 'hyrox-wall-balls',
    reps: 100,
    weightKg: { open_men: 6, open_women: 4, pro_men: 9, pro_women: 6 },
  },
]

export const RUN_EXERCISE = 'hyrox-run'

/** Stationen und Umfang (Anteil) je Format. */
export function formatPlan(format: SimulationFormat): {
  stations: readonly StationSpec[]
  runM: number
  share: number
} {
  switch (format) {
    case 'full':
      return { stations: STATIONS, runM: 1000, share: 1 }
    case 'half_1':
      return { stations: STATIONS.slice(0, 4), runM: 1000, share: 1 }
    case 'half_2':
      return { stations: STATIONS.slice(4), runM: 1000, share: 1 }
    case 'short':
      return { stations: STATIONS, runM: 500, share: 0.5 }
  }
}
