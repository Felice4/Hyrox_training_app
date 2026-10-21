import { describe, expect, it } from 'vitest'
import type { PlannedSet, WorkoutItem } from '@/domain/generator/types'
import { circuitRest, describeRest, describeSetTarget, summarizeItem } from './describe'

const item = (sets: PlannedSet[]): WorkoutItem => ({
  exerciseSlug: 'x',
  exerciseName: 'X',
  role: 'strength_main',
  sets,
  estimatedSec: 600,
})

describe('describeSetTarget', () => {
  it('beschreibt Wiederholungen, Strecke, Dauer und Kalorien', () => {
    expect(describeSetTarget({ type: 'working', reps: 5, restSec: 0 })).toBe('5 Wdh.')
    expect(describeSetTarget({ type: 'interval', distanceM: 1000, restSec: 0 })).toBe('1 km')
    expect(describeSetTarget({ type: 'round', distanceM: 12.5, restSec: 0 })).toBe('12,5 m')
    expect(describeSetTarget({ type: 'working', durationSec: 45, restSec: 0 })).toBe('45 s')
    expect(describeSetTarget({ type: 'working', durationSec: 600, restSec: 0 })).toBe('10 min')
    expect(describeSetTarget({ type: 'interval', calories: 15, restSec: 0 })).toBe('15 kcal')
  })
})

describe('describeRest', () => {
  it('zeigt kurze Pausen in Sekunden, lange in Minuten', () => {
    expect(describeRest(90)).toBe('90 s')
    expect(describeRest(180)).toBe('3 min')
  })
})

describe('summarizeItem', () => {
  it('fasst Kraftsätze mit Gewicht, Pause und Aufwärmsatz zusammen', () => {
    const summary = summarizeItem(
      item([
        { type: 'warmup', reps: 8, weightKg: 30, restSec: 60 },
        ...Array.from({ length: 4 }, () => ({
          type: 'working' as const,
          reps: 5,
          weightKg: 62.5,
          restSec: 180,
        })),
      ]),
      false,
    )
    expect(summary).toEqual({
      main: '4 × 5 Wdh.',
      details: ['62,5 kg', 'Pause 3 min', '+ Aufwärmsatz'],
    })
  })

  it('zeigt einzelne Einheiten ohne „1 ×" und ohne Pause', () => {
    expect(summarizeItem(item([{ type: 'working', durationSec: 600, restSec: 0 }]), false)).toEqual(
      {
        main: '10 min',
        details: [],
      },
    )
  })

  it('beschreibt Zirkel-Übungen pro Runde', () => {
    const sets = Array.from({ length: 4 }, () => ({
      type: 'interval' as const,
      distanceM: 1000,
      restSec: 0,
    }))
    expect(summarizeItem(item(sets), true).main).toBe('1 km pro Runde')
  })
})

describe('circuitRest', () => {
  it('liest die Rundenpause vom letzten Element', () => {
    const run = item([{ type: 'interval', distanceM: 1000, restSec: 0 }])
    const station = item([{ type: 'round', distanceM: 25, restSec: 90 }])
    expect(circuitRest([run, station])).toBe(90)
  })
})
