import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import type { PlannedSet } from '@/domain/generator/types'
import { estimateItemSeconds, secondsPerMeter, setWorkSeconds, totalMinutes } from './estimate'

function exercise(slug: string) {
  const found = getLibraryExercise(slug)
  if (!found) throw new Error(`Übung ${slug} fehlt`)
  return found
}

describe('secondsPerMeter', () => {
  it('unterscheidet Geräte und Fortbewegungsarten', () => {
    expect(secondsPerMeter(exercise('hyrox-row'), 'intermediate')).toBe(0.25)
    expect(secondsPerMeter(exercise('hyrox-sled-push'), 'intermediate')).toBe(1.6)
    expect(secondsPerMeter(exercise('hyrox-sandbag-lunges'), 'intermediate')).toBe(3)
    expect(secondsPerMeter(exercise('hyrox-burpee-broad-jump'), 'intermediate')).toBe(4)
    expect(secondsPerMeter(exercise('hyrox-farmers-carry'), 'intermediate')).toBe(0.9)
    expect(secondsPerMeter(exercise('bear-crawl'), 'intermediate')).toBe(2)
  })

  it('nimmt für Läufe ein Tempo je Trainingsniveau an', () => {
    expect(secondsPerMeter(exercise('hyrox-run'), 'beginner')).toBe(0.39)
    expect(secondsPerMeter(exercise('easy-run'), 'advanced')).toBe(0.285)
  })
})

describe('setWorkSeconds', () => {
  const squat = exercise('back-squat')
  it('rechnet Wiederholungen, Dauer, Strecke und Kalorien um', () => {
    expect(setWorkSeconds({ type: 'working', reps: 5, restSec: 120 }, squat, 'intermediate')).toBe(
      15,
    )
    expect(
      setWorkSeconds({ type: 'working', durationSec: 40, restSec: 0 }, squat, 'intermediate'),
    ).toBe(40)
    expect(
      setWorkSeconds(
        { type: 'interval', distanceM: 1000, restSec: 0 },
        exercise('hyrox-run'),
        'intermediate',
      ),
    ).toBe(330)
    expect(
      setWorkSeconds(
        { type: 'interval', calories: 15, restSec: 0 },
        exercise('air-bike-sprints'),
        'intermediate',
      ),
    ).toBe(60)
  })
})

describe('estimateItemSeconds', () => {
  it('zählt Pausen zwischen den Sätzen, aber nicht nach dem letzten, plus Wechselzeit', () => {
    const sets: PlannedSet[] = Array.from({ length: 4 }, () => ({
      type: 'working',
      reps: 5,
      restSec: 150,
    }))
    // 4 × 15 s Arbeit + 3 × 150 s Pause + 60 s Wechsel = 570 s
    expect(estimateItemSeconds(sets, exercise('back-squat'), 'intermediate', 'main')).toBe(570)
  })

  it('ist für eine Übung ohne Sätze 0', () => {
    expect(estimateItemSeconds([], exercise('back-squat'), 'intermediate', 'main')).toBe(0)
  })
})

describe('totalMinutes', () => {
  it('summiert alle Blöcke', () => {
    const item = (estimatedSec: number) => ({
      exerciseSlug: 'x',
      exerciseName: 'X',
      role: 'accessory' as const,
      sets: [],
      estimatedSec,
    })
    expect(totalMinutes([{ items: [item(600), item(300)] }, { items: [item(900)] }])).toBe(30)
  })
})
