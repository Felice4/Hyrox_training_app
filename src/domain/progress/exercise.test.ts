import { describe, expect, it } from 'vitest'
import type { HistoryExercise, HistorySession, HistorySet } from '@/domain/generator/types'
import { exerciseProgress, improvement, trainedExercises } from './exercise'

const set = (values: Partial<HistorySet>): HistorySet => ({
  setType: 'working',
  completed: true,
  ...values,
})

const session = (date: string, exercises: HistoryExercise[]): HistorySession => ({
  startedAt: new Date(`${date}T18:00:00`).toISOString(),
  focus: 'strength',
  durationMin: 60,
  exercises,
})

const squat = (...sets: HistorySet[]): HistoryExercise => ({
  exerciseSlug: 'back-squat',
  block: 'main',
  sets,
})

describe('Kraft', () => {
  const sessions = [
    // neueste zuerst wie aus der Datenbank
    session('2026-10-20', [
      squat(set({ reps: 5, weightKg: 105 }), set({ reps: 3, weightKg: 110 })),
    ]),
    session('2026-10-13', [
      squat(
        set({ setType: 'warmup', reps: 8, weightKg: 60 }),
        set({ reps: 5, weightKg: 100 }),
        set({ reps: 5, weightKg: 100, completed: false }),
      ),
    ]),
  ]

  it('vergleicht über das geschätzte Maximalgewicht, bester Satz je Training', () => {
    const progress = exerciseProgress(sessions, 'back-squat', 'weight_reps')
    expect(progress?.metric).toBe('e1rm')
    const points = progress?.series[0]?.points ?? []
    // 100 × (1 + 5/30) = 116,7 → 116,5; 105 × (1 + 5/30) = 122,5; 110 × 1,1 = 121
    expect(points.map((p) => [p.date, p.value])).toEqual([
      ['2026-10-13', 116.5],
      ['2026-10-20', 122.5],
    ])
    expect(points[1]?.set.weightKg).toBe(105)
    expect(improvement(progress!.series[0]!, false)).toBe(6)
  })

  it('berechnet Volumen ohne Aufwärm- und nicht geschaffte Sätze', () => {
    const progress = exerciseProgress(sessions, 'back-squat', 'weight_reps')
    expect(progress?.volume.map((v) => v.value)).toEqual([500, 855])
    expect(progress?.sessions).toBe(2)
  })

  it('führt das beste Gewicht je Wiederholungszahl', () => {
    const progress = exerciseProgress(sessions, 'back-squat', 'weight_reps')
    expect(progress?.repBests).toEqual([
      { reps: 3, weightKg: 110, date: '2026-10-20' },
      { reps: 5, weightKg: 105, date: '2026-10-20' },
    ])
  })

  it('ignoriert Warm-up- und Cool-down-Blöcke', () => {
    const warmupOnly = [
      session('2026-10-21', [{ ...squat(set({ reps: 10, weightKg: 40 })), block: 'warmup' }]),
    ]
    expect(exerciseProgress(warmupOnly, 'back-squat', 'weight_reps')?.sessions).toBe(0)
    expect(trainedExercises(warmupOnly).size).toBe(0)
  })
})

describe('Ausdauer und Stationen', () => {
  const run = (distanceM: number, durationSec: number): HistoryExercise => ({
    exerciseSlug: 'run',
    block: 'main',
    sets: [set({ distanceM, durationSec })],
  })

  it('vergleicht Pace nur bei gleicher Strecke', () => {
    const sessions = [
      session('2026-10-01', [run(1000, 300)]),
      session('2026-10-05', [run(5000, 1600)]),
      session('2026-10-08', [run(1000, 285)]),
    ]
    const progress = exerciseProgress(sessions, 'run', 'distance_time')
    expect(progress?.lowerIsBetter).toBe(true)
    // 1 km zuerst (mehr Trainings)
    expect(progress?.series.map((s) => [s.distanceM, s.points.map((p) => p.value)])).toEqual([
      [1000, [300, 285]],
      [5000, [320]],
    ])
    expect(improvement(progress!.series[0]!, true)).toBe(15)
  })

  it('rechnet Ruder-Pace je 500 m', () => {
    const rows = [
      session('2026-10-01', [
        { exerciseSlug: 'row', block: 'main', sets: [set({ distanceM: 1000, durationSec: 220 })] },
      ]),
    ]
    expect(exerciseProgress(rows, 'row', 'distance_time', 500)?.series[0]?.points[0]?.value).toBe(
      110,
    )
  })

  it('wertet Gewicht je Strecke getrennt (z. B. Sled Push)', () => {
    const sled = (distanceM: number, weightKg: number): HistoryExercise => ({
      exerciseSlug: 'sled-push',
      block: 'main',
      sets: [set({ distanceM, weightKg })],
    })
    const progress = exerciseProgress(
      [
        session('2026-10-01', [sled(25, 100)]),
        session('2026-10-08', [sled(50, 90), sled(25, 120)]),
      ],
      'sled-push',
      'weight_distance',
    )
    expect(progress?.series.map((s) => [s.distanceM, s.points.map((p) => p.value)])).toEqual([
      [25, [100, 120]],
      [50, [90]],
    ])
  })

  it('wertet Kalorien (noch) nicht aus', () => {
    expect(exerciseProgress([], 'assault-bike', 'calories')).toBeNull()
  })
})
