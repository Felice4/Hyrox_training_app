import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { computeMuscleFatigue, fatigueLevel } from './muscleFatigue'

const NOW = '2026-10-21T18:00:00.000Z'

const workSets = (count: number, rpe?: number): HistorySet[] =>
  Array.from({ length: count }, () => ({ setType: 'working', completed: true, reps: 5, rpe }))

function sessionHoursAgo(hours: number, exercises: HistorySession['exercises']): HistorySession {
  return {
    startedAt: new Date(Date.parse(NOW) - hours * 3600 * 1000).toISOString(),
    focus: 'strength',
    durationMin: 60,
    exercises,
  }
}

describe('computeMuscleFatigue', () => {
  it('ist ohne Verlauf leer', () => {
    expect(computeMuscleFatigue([], EXERCISE_LIBRARY, NOW)).toEqual({})
  })

  it('belastet primäre Muskeln voll und sekundäre zur Hälfte', () => {
    // Kniebeuge vor 0 h: 5 Sätze → Quadrizeps 5, Adduktoren (sekundär) 2,5
    const history = [sessionHoursAgo(0, [{ exerciseSlug: 'back-squat', sets: workSets(5) }])]
    const fatigue = computeMuscleFatigue(history, EXERCISE_LIBRARY, NOW)
    expect(fatigue.quadriceps).toBe(5)
    expect(fatigue.adductors).toBe(2.5)
    expect(fatigue.chest).toBeUndefined()
  })

  it('lässt die Ermüdung mit der Zeit abklingen', () => {
    const sets = [{ exerciseSlug: 'back-squat', sets: workSets(6) }]
    const fresh = computeMuscleFatigue([sessionHoursAgo(12, sets)], EXERCISE_LIBRARY, NOW)
    const older = computeMuscleFatigue([sessionHoursAgo(48, sets)], EXERCISE_LIBRARY, NOW)
    const gone = computeMuscleFatigue([sessionHoursAgo(80, sets)], EXERCISE_LIBRARY, NOW)
    expect(fresh.quadriceps).toBeGreaterThan(older.quadriceps ?? 0)
    expect(gone.quadriceps).toBeUndefined()
  })

  it('zählt Aufwärmsätze und nicht abgeschlossene Sätze nicht', () => {
    const sets: HistorySet[] = [
      { setType: 'warmup', completed: true, reps: 10 },
      { setType: 'working', completed: false, reps: 5 },
    ]
    const history = [sessionHoursAgo(1, [{ exerciseSlug: 'back-squat', sets }])]
    expect(computeMuscleFatigue(history, EXERCISE_LIBRARY, NOW)).toEqual({})
  })

  it('gewichtet harte Sätze stärker', () => {
    const easy = computeMuscleFatigue(
      [sessionHoursAgo(0, [{ exerciseSlug: 'back-squat', sets: workSets(4, 6) }])],
      EXERCISE_LIBRARY,
      NOW,
    )
    const hard = computeMuscleFatigue(
      [sessionHoursAgo(0, [{ exerciseSlug: 'back-squat', sets: workSets(4, 9) }])],
      EXERCISE_LIBRARY,
      NOW,
    )
    expect(hard.quadriceps).toBeGreaterThan(easy.quadriceps ?? 0)
  })

  it('erkennt ein schweres Beintraining von gestern als hohe Ermüdung', () => {
    const legDay = sessionHoursAgo(20, [
      { exerciseSlug: 'back-squat', sets: workSets(5, 8) },
      { exerciseSlug: 'bulgarian-split-squat', sets: workSets(3, 8) },
      { exerciseSlug: 'leg-press', sets: workSets(4, 8) },
    ])
    const fatigue = computeMuscleFatigue([legDay], EXERCISE_LIBRARY, NOW)
    expect(fatigueLevel(fatigue.quadriceps)).toBe('high')
    expect(fatigueLevel(fatigue.glutes)).toBe('high')
    expect(fatigueLevel(fatigue.chest)).toBe('low')
  })
})

describe('fatigueLevel', () => {
  it('teilt in niedrig, mittel und hoch ein', () => {
    expect(fatigueLevel(undefined)).toBe('low')
    expect(fatigueLevel(3.9)).toBe('low')
    expect(fatigueLevel(4)).toBe('medium')
    expect(fatigueLevel(8)).toBe('high')
  })
})
