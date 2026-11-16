import { getLibraryExercise } from '@/data/exercises'
import type { GeneratedWorkout, WorkoutItem } from '@/domain/generator/types'

/**
 * 1-km-Lauftest des Einstiegstests (docs/RACE_PREP.md §6): einlaufen, Steigerungen,
 * 1 km so schnell wie gleichmäßig möglich, auslaufen. Die Zeit landet als Bestleistung
 * „Lauf (HYROX-Kilometer) · 1000 m“ und fließt in die Zielzeit-Schätzung.
 */

export const RUN_TEST_VERSION = 'run-test-1'

const name = (slug: string) => getLibraryExercise(slug)?.name ?? slug

const item = (
  slug: string,
  role: WorkoutItem['role'],
  item: Omit<WorkoutItem, 'exerciseSlug' | 'exerciseName' | 'role'>,
): WorkoutItem => ({
  exerciseSlug: slug,
  exerciseName: name(slug),
  role,
  ...item,
})

export function buildRunTestWorkout(seed = 0): GeneratedWorkout {
  const blocks: GeneratedWorkout['blocks'] = [
    {
      type: 'warmup',
      items: [
        item('easy-run', 'warmup_cardio', {
          sets: [{ type: 'warmup', durationSec: 600, restSec: 60 }],
          note: '10 min locker einlaufen',
          estimatedSec: 660,
        }),
        item('strides', 'warmup_drill', {
          sets: Array.from({ length: 4 }, () => ({
            type: 'warmup' as const,
            distanceM: 80,
            restSec: 60,
          })),
          note: 'Steigerungen bis knapp unter Renntempo',
          estimatedSec: 4 * 80,
        }),
      ],
    },
    {
      type: 'main',
      items: [
        item('hyrox-run', 'run', {
          sets: [{ type: 'interval', distanceM: 1000, restSec: 0 }],
          note: '1 km auf Zeit: zügig, aber gleichmäßig – die erste Hälfte nicht zu schnell. Zeit danach eintragen.',
          estimatedSec: 300,
        }),
      ],
    },
    {
      type: 'cooldown',
      items: [
        item('easy-run', 'cooldown_cardio', {
          sets: [{ type: 'warmup', durationSec: 600, restSec: 0 }],
          note: '10 min locker auslaufen',
          estimatedSec: 600,
        }),
      ],
    },
  ]
  const estimatedSec = blocks.flatMap((b) => b.items).reduce((sum, i) => sum + i.estimatedSec, 0)
  return {
    generatorVersion: RUN_TEST_VERSION,
    seed,
    focus: 'endurance',
    intensity: 'hard',
    targetDurationMin: Math.round(estimatedSec / 60),
    estimatedDurationMin: Math.round(estimatedSec / 60),
    blocks,
    explanation: [
      'Einstiegstest: 1-km-Lauftest auf Zeit. Zusammen mit der Simulation „Kurz“ schätzt die App daraus deine Zielzeit.',
      'Am besten auf ebener Strecke oder auf dem Laufband (1 % Steigung).',
    ],
    recoverySuggested: false,
  }
}
