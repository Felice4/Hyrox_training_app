import { describe, expect, it } from 'vitest'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { lastPerformance } from './lastTime'

const set = (partial: Partial<HistorySet>): HistorySet => ({
  setType: 'working',
  completed: true,
  ...partial,
})

function session(startedAt: string, slug: string, sets: HistorySet[]): HistorySession {
  return {
    startedAt,
    focus: 'strength',
    durationMin: 60,
    exercises: [{ exerciseSlug: slug, sets }],
  }
}

describe('lastPerformance', () => {
  it('fasst gleiche Sätze des jüngsten Trainings zusammen', () => {
    const history = [
      session('2026-10-10T17:00:00Z', 'back-squat', [set({ reps: 5, weightKg: 95 })]),
      session('2026-10-17T17:00:00Z', 'back-squat', [
        set({ setType: 'warmup', reps: 8, weightKg: 50 }),
        set({ reps: 5, weightKg: 100 }),
        set({ reps: 5, weightKg: 100 }),
        set({ reps: 5, weightKg: 100 }),
        set({ reps: 3, weightKg: 105 }),
        set({ reps: 5, weightKg: 110, completed: false }),
      ]),
    ]
    expect(lastPerformance(history, 'back-squat')).toEqual({
      date: '2026-10-17T17:00:00Z',
      text: '3 × 5 Wdh. · 100 kg, 3 Wdh. · 105 kg',
    })
  })

  it('beschreibt Läufe mit Strecke und Zeit', () => {
    const history = [
      session('2026-10-17T17:00:00Z', 'hyrox-run', [
        set({ distanceM: 1000, durationSec: 287 }),
        set({ distanceM: 1000, durationSec: 295 }),
      ]),
    ]
    expect(lastPerformance(history, 'hyrox-run')?.text).toBe('1 km · 4:47, 1 km · 4:55')
  })

  it('überspringt Trainings ohne abgehakte Sätze und berücksichtigt „vor"', () => {
    const history = [
      session('2026-10-10T17:00:00Z', 'pull-up', [set({ reps: 8 })]),
      session('2026-10-17T17:00:00Z', 'pull-up', [set({ reps: 10, completed: false })]),
      session('2026-10-20T17:00:00Z', 'pull-up', [set({ reps: 12 })]),
    ]
    expect(lastPerformance(history, 'pull-up')?.text).toBe('12 Wdh.')
    expect(lastPerformance(history, 'pull-up', '2026-10-20T00:00:00Z')?.text).toBe('8 Wdh.')
  })

  it('liefert nichts für unbekannte Übungen', () => {
    expect(lastPerformance([], 'back-squat')).toBeUndefined()
  })
})
