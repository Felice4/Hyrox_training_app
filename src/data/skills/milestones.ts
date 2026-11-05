import type { MilestoneInput } from './schema'

/** Läufe, deren Zeit für eine feste Strecke zählt (Strecke muss genau passen). */
const RUNS = [
  'run-5k-time-trial',
  'tempo-run',
  'progression-run',
  'easy-run',
  'treadmill-run',
  'hyrox-run',
  'run-intervals-1000m',
]
const ROWS = ['hyrox-row', 'row-2000m-time-trial', 'row-steady']

/**
 * Meilensteine aus dem normalen Training (docs/SKILLS.md §4). Sie brauchen keine
 * Aktivierung und keinen Skill-Block – die App zeigt nur, wie nah du dran bist.
 * Den `slug` nie ändern; Reihen (`series`) vom leichtesten zum schwersten.
 */
export const MILESTONES: MilestoneInput[] = [
  // Zug
  ...[10, 15, 20].map((reps): MilestoneInput => ({
    slug: `pull-ups-${reps}`,
    name: `${reps} strikte Klimmzüge`,
    area: 'pull',
    series: 'pull-ups',
    metric: { kind: 'max_reps', exercises: ['pull-up'], reps },
  })),

  // Kraft relativ zum Körpergewicht (geschätztes Maximalgewicht)
  ...(
    [
      ['back-squat', 'Kniebeuge', [1, 1.5, 2]],
      ['deadlift', 'Kreuzheben', [1.5, 2, 2.5]],
      ['bench-press', 'Bankdrücken', [0.75, 1, 1.25]],
    ] as const
  ).flatMap(([exercise, label, factors]) =>
    factors.map((factor): MilestoneInput => ({
      slug: `${exercise}-${String(factor).replace('.', '-')}x-bodyweight`,
      name: `${label} ${String(factor).replace('.', ',')} × Körpergewicht`,
      area: 'strength',
      series: `${exercise}-bodyweight`,
      metric: { kind: 'relative_strength', exercise, factor },
    })),
  ),

  // Laufen
  ...[25, 22, 20].map((minutes): MilestoneInput => ({
    slug: `run-5k-sub-${minutes}`,
    name: `5 km unter ${minutes} min`,
    area: 'run',
    series: 'run-5k',
    metric: { kind: 'best_time', exercises: RUNS, distanceM: 5000, maxSec: minutes * 60 },
  })),
  {
    slug: 'run-1k-sub-3-30',
    name: '1 km unter 3:30 min',
    area: 'run',
    series: 'run-1k',
    metric: { kind: 'best_time', exercises: RUNS, distanceM: 1000, maxSec: 210 },
  },

  // Ergometer
  {
    slug: 'row-1k-sub-3-45',
    name: '1000 m Rudern unter 3:45 min',
    area: 'erg',
    series: 'row-1k',
    metric: { kind: 'best_time', exercises: ROWS, distanceM: 1000, maxSec: 225 },
  },
  {
    slug: 'row-1k-sub-3-30',
    name: '1000 m Rudern unter 3:30 min',
    area: 'erg',
    series: 'row-1k',
    metric: { kind: 'best_time', exercises: ROWS, distanceM: 1000, maxSec: 210 },
  },
  {
    slug: 'row-2k-sub-7-30',
    name: '2000 m Rudern unter 7:30 min',
    area: 'erg',
    series: 'row-2k',
    metric: { kind: 'best_time', exercises: ROWS, distanceM: 2000, maxSec: 450 },
  },
  {
    slug: 'skierg-1k-sub-4',
    name: '1000 m SkiErg unter 4:00 min',
    area: 'erg',
    series: 'skierg-1k',
    metric: {
      kind: 'best_time',
      exercises: ['hyrox-skierg', 'skierg-steady'],
      distanceM: 1000,
      maxSec: 240,
    },
  },

  // HYROX
  {
    slug: 'wall-balls-100',
    name: '100 Wall Balls am Stück',
    area: 'hyrox',
    series: 'wall-balls',
    metric: { kind: 'max_reps', exercises: ['hyrox-wall-balls', 'wall-ball-heavy'], reps: 100 },
  },
  ...(
    [
      [90, '1:30'],
      [80, '1:20'],
      [70, '1:10'],
    ] as const
  ).map(([minutes, label]): MilestoneInput => ({
    slug: `hyrox-sub-${minutes}`,
    name: `HYROX unter ${label} h`,
    area: 'hyrox',
    series: 'hyrox-time',
    metric: { kind: 'hyrox_time', maxSec: minutes * 60 },
  })),
]
