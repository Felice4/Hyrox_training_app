import { describe, expect, it } from 'vitest'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { progressionIncrement, roundToStep, suggestWeight, weightStep } from './progression'

const squat = {
  slug: 'back-squat',
  equipment: ['barbell', 'squat_rack'] as const,
  movementPattern: 'squat' as const,
}
const bench = {
  slug: 'bench-press',
  equipment: ['barbell', 'bench'] as const,
  movementPattern: 'push_horizontal' as const,
}
const curl = {
  slug: 'dumbbell-biceps-curl',
  equipment: ['dumbbell'] as const,
  movementPattern: 'isolation' as const,
}

function sets(weightKg: number, reps: number[], rpe?: number, targetReps = 5): HistorySet[] {
  return reps.map((r) => ({
    setType: 'working',
    completed: true,
    weightKg,
    reps: r,
    rpe,
    targetReps,
  }))
}

function session(daysAgo: number, slug: string, performed: HistorySet[]): HistorySession {
  return {
    startedAt: new Date(Date.UTC(2026, 9, 21) - daysAgo * 86400000).toISOString(),
    focus: 'strength',
    durationMin: 60,
    exercises: [{ exerciseSlug: slug, sets: performed }],
  }
}

describe('Gewichtsstufen', () => {
  it('kennt die Abstufung je Gerät', () => {
    expect(weightStep(['barbell'])).toBe(2.5)
    expect(weightStep(['dumbbell', 'bench'])).toBe(1)
    expect(weightStep(['kettlebell'])).toBe(2)
  })

  it('rundet auf die Stufe', () => {
    expect(roundToStep(101.3, 2.5)).toBe(102.5)
    expect(roundToStep(101.2, 2.5)).toBe(100)
    expect(roundToStep(101.3, 2.5, 'down')).toBe(100)
    expect(roundToStep(103.9, 2.5, 'down')).toBe(102.5)
  })

  it('steigert im Unterkörper mit Langhantel um 5 kg, sonst kleinste Stufe, höchstens 5 %', () => {
    expect(progressionIncrement(120, squat.equipment, 'squat')).toBe(5)
    expect(progressionIncrement(80, bench.equipment, 'push_horizontal')).toBe(2.5)
    expect(progressionIncrement(60, squat.equipment, 'squat')).toBe(2.5) // 5 kg wären > 5 %
    expect(progressionIncrement(12, curl.equipment, 'isolation')).toBe(0) // 1 kg wären > 5 %
  })
})

describe('suggestWeight', () => {
  it('gibt ohne Verlauf kein Gewicht vor', () => {
    const result = suggestWeight(squat, 5, [])
    expect(result.weightKg).toBeUndefined()
    expect(result.note).toContain('RPE 6–7')
  })

  it('steigert, wenn alle Sätze geschafft wurden und RPE ≤ 8', () => {
    const history = [session(3, 'back-squat', sets(100, [5, 5, 5, 5], 7.5))]
    const result = suggestWeight(squat, 5, history)
    expect(result.weightKg).toBe(105)
    expect(result.note).toContain('+5 kg')
  })

  it('hält das Gewicht, wenn das Ziel nur mit RPE > 8 erreicht wurde', () => {
    const history = [session(3, 'bench-press', sets(80, [5, 5, 5], 9))]
    expect(suggestWeight(bench, 5, history).weightKg).toBe(80)
  })

  it('hält das Gewicht bei knapp verfehltem Ziel', () => {
    const history = [session(3, 'bench-press', sets(80, [5, 5, 4], 8))]
    expect(suggestWeight(bench, 5, history).weightKg).toBe(80)
  })

  it('reduziert nach zweimal deutlich verfehltem Ziel', () => {
    const history = [
      session(3, 'bench-press', sets(80, [5, 3, 2], 9.5)),
      session(7, 'bench-press', sets(80, [4, 3, 3], 9.5)),
    ]
    const result = suggestWeight(bench, 5, history)
    expect(result.weightKg).toBe(72.5)
    expect(result.note).toContain('reduziert')
  })

  it('reduziert bei einmal verfehltem Ziel noch nicht', () => {
    const history = [
      session(3, 'bench-press', sets(80, [5, 3, 2], 9.5)),
      session(7, 'bench-press', sets(77.5, [5, 5, 5], 8)),
    ]
    expect(suggestWeight(bench, 5, history).weightKg).toBe(80)
  })

  it('nutzt den jüngsten Verlauf und ignoriert Aufwärmsätze', () => {
    const history = [
      session(10, 'back-squat', sets(90, [5, 5, 5], 7)),
      session(2, 'back-squat', [
        { setType: 'warmup', completed: true, weightKg: 60, reps: 8 },
        ...sets(100, [5, 5, 5], 7),
      ]),
    ]
    expect(suggestWeight(squat, 5, history).weightKg).toBe(105)
  })

  it('reduziert bei schlechter Tagesform zusätzlich um 10 %', () => {
    const history = [session(3, 'back-squat', sets(100, [5, 5, 5], 7))]
    const result = suggestWeight(squat, 5, history, 0.9)
    expect(result.weightKg).toBe(92.5)
    expect(result.note).toContain('Tagesform')
  })
})
