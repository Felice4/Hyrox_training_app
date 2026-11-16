import { describe, expect, it } from 'vitest'
import { detectRecords } from '@/domain/records/detect'
import { createSession, finishSession } from '@/domain/session/session'
import { buildRunTestWorkout } from './runTest'

describe('buildRunTestWorkout', () => {
  it('Einlaufen, Steigerungen, 1 km auf Zeit, Auslaufen', () => {
    const workout = buildRunTestWorkout()
    expect(workout.blocks.map((b) => b.type)).toEqual(['warmup', 'main', 'cooldown'])
    const main = workout.blocks[1]?.items[0]
    expect(main).toMatchObject({
      exerciseSlug: 'hyrox-run',
      exerciseName: 'Lauf (HYROX-Kilometer)',
    })
    expect(main?.sets).toEqual([{ type: 'interval', distanceM: 1000, restSec: 0 }])
    expect(workout.estimatedDurationMin).toBeGreaterThanOrEqual(25)
  })

  it('die gelaufene Zeit wird zur 1-km-Bestleistung, Ein- und Auslaufen nicht', () => {
    let id = 0
    const session = createSession(
      buildRunTestWorkout(),
      '2026-11-17T08:00:00.000Z',
      () => `id-${++id}`,
      () => 'distance_time',
    )
    const done = finishSession(
      {
        ...session,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({
            ...set,
            completed: true,
            actual: { distanceM: set.target.distanceM ?? 1000, durationSec: 250 },
          })),
        })),
      },
      '2026-11-17T08:40:00.000Z',
    )
    const records = detectRecords(done).filter((r) => r.recordType === 'best_time')
    expect(records).toEqual([
      expect.objectContaining({
        exerciseSlug: 'hyrox-run',
        contextKey: 'distance_m=1000',
        value: 250,
      }),
    ])
  })
})
