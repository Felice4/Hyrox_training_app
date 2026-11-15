import { describe, expect, it } from 'vitest'
import { generateWorkout } from './generateWorkout'
import { RACE_RUN_M } from './raceTemplates'
import { LIBRARY, makeInput } from './testFixtures'
import type {
  GeneratedRaceSessionType,
  GeneratedWorkout,
  Intensity,
  RaceSessionRequest,
  RaceTeamFormat,
} from './types'

const WEIGHTS: RaceSessionRequest['stationWeights'] = {
  sled_push: 152,
  sled_pull: 103,
  farmers_carry: 24,
  sandbag_lunges: 20,
  wall_balls: 6,
}

function race(
  type: GeneratedRaceSessionType,
  options: {
    durationMin?: number
    intensity?: Intensity
    team?: RaceTeamFormat
    loadShare?: number
    seed?: number
  } = {},
): GeneratedWorkout {
  return generateWorkout(
    makeInput(
      {
        durationMin: options.durationMin ?? 60,
        focus: 'hyrox',
        intensity: options.intensity ?? 'moderate',
        raceSession: {
          type,
          team: options.team ?? 'single',
          stationWeights: WEIGHTS,
          loadShare: options.loadShare ?? 1,
        },
      },
      { seed: options.seed ?? 1 },
    ),
  )
}

const items = (workout: GeneratedWorkout) => workout.blocks.flatMap((b) => b.items)
const exercise = (slug: string) => LIBRARY.find((e) => e.slug === slug)
const mainBlock = (workout: GeneratedWorkout) => workout.blocks.find((b) => b.type === 'main')

describe('Kompromiss-Lauf', () => {
  it('wechselt 1-km-Läufe und Stationen im Zirkel', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const workout = race('compromised_run', { seed })
      const main = mainBlock(workout)
      expect(main?.rounds).toBeGreaterThanOrEqual(2)
      const run = main?.items.find((i) => i.role === 'run')
      expect(run?.sets.every((s) => s.distanceM === RACE_RUN_M)).toBe(true)
      expect(main?.items.filter((i) => i.role === 'station').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('Staffel: höchstens 3 Runden mit langer Pause', () => {
    const workout = race('compromised_run', { team: 'relay', durationMin: 90 })
    const main = mainBlock(workout)
    expect(main?.rounds).toBeLessThanOrEqual(3)
    expect(main?.items.at(-1)?.sets[0]?.restSec).toBe(180)
  })

  it('hält die Zieldauer ein', () => {
    for (const durationMin of [40, 60, 75]) {
      const workout = race('compromised_run', { durationMin })
      expect(Math.abs(workout.estimatedDurationMin - durationMin)).toBeLessThanOrEqual(
        durationMin * 0.1,
      )
    }
  })
})

describe('Stationskraft', () => {
  it('trainiert die offiziellen Stationen mit dem Anteil des Wettkampfgewichts', () => {
    const workout = race('station_strength', { loadShare: 0.8 })
    const sledPush = items(workout).find(
      (i) => exercise(i.exerciseSlug)?.hyroxStation === 'sled_push',
    )
    expect(sledPush?.exerciseSlug).toBe('hyrox-sled-push')
    // 152 kg × 0,8 = 121,6 → auf 2,5 kg gerundet
    expect(sledPush?.sets.every((s) => s.weightKg === 122.5)).toBe(true)
    expect(sledPush?.note).toBe('80 % vom Wettkampfgewicht (152 kg)')
    const wallBalls = items(workout).find((i) => i.exerciseSlug === 'hyrox-wall-balls')
    expect(wallBalls?.sets[0]?.weightKg).toBe(5)
  })

  it('nutzt keine Varianten der Stationen (schwer/Sprint)', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const stations = items(race('station_strength', { seed })).filter(
        (i) => exercise(i.exerciseSlug)?.hyroxStation !== undefined,
      )
      expect(stations.every((i) => i.exerciseSlug.startsWith('hyrox-'))).toBe(true)
    }
  })

  it('Wettkampfgewicht bei 100 %', () => {
    const lunges = items(race('station_strength')).find(
      (i) => i.exerciseSlug === 'hyrox-sandbag-lunges',
    )
    expect(lunges?.sets[0]?.weightKg).toBe(20)
    expect(lunges?.note).toBe('Wettkampfgewicht 20 kg')
  })
})

describe('Laufintervalle', () => {
  it('hart und lang genug: 1-km-Intervalle', () => {
    const interval = items(race('run_intervals', { intensity: 'hard', durationMin: 50 })).find(
      (i) => i.role === 'interval',
    )
    expect(interval?.exerciseSlug).toBe('run-intervals-1000m')
  })

  it('kurz (Tapering): kürzere Intervalle, die in die Zeit passen', () => {
    const workout = race('run_intervals', { intensity: 'hard', durationMin: 30 })
    const interval = items(workout).find((i) => i.role === 'interval')
    expect(interval).toBeDefined()
    expect(workout.estimatedDurationMin).toBeLessThanOrEqual(33)
  })

  it('Staffel: kurze, schnelle Abschnitte', () => {
    const interval = items(race('run_intervals', { team: 'relay', intensity: 'hard' })).find(
      (i) => i.role === 'interval',
    )
    expect(interval?.sets[0]?.distanceM).toBeLessThanOrEqual(400)
  })
})

describe('Lockerer Dauerlauf und Aktivierung', () => {
  it('Dauerlauf: ein lockerer Lauf als Hauptteil', () => {
    const workout = race('easy_run', { intensity: 'easy', durationMin: 40 })
    const main = mainBlock(workout)?.items ?? []
    expect(main).toHaveLength(1)
    expect(exercise(main[0]?.exerciseSlug ?? '')?.movementPattern).toBe('locomotion')
    expect(Math.abs(workout.estimatedDurationMin - 40)).toBeLessThanOrEqual(4)
  })

  it('Aktivierung: Steigerungen und höchstens 2 kurze Sätze an der Station', () => {
    const workout = race('activation', { intensity: 'easy', durationMin: 25, loadShare: 0.6 })
    const station = items(workout).find((i) => i.role === 'station')
    if (station) {
      expect(station.sets.length).toBeLessThanOrEqual(2)
      expect(station.sets.every((s) => (s.reps ?? 0) <= 10)).toBe(true)
    }
    expect(items(workout).some((i) => i.exerciseSlug === 'strides')).toBe(true)
  })
})

it('ohne Wettkampf-Einheit bleibt der Generator unverändert', () => {
  const plain = generateWorkout(makeInput({ focus: 'hyrox' }))
  const again = generateWorkout(makeInput({ focus: 'hyrox', raceSession: undefined }))
  expect(again).toEqual(plain)
})
