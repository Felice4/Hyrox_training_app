import { describe, expect, it } from 'vitest'
import type { SimulationResult } from '@/domain/simulation/simulation'
import {
  bestRun1k,
  estimateRaceTime,
  STATION_TIME_SHARE,
  targetDiffers,
  targetPlan,
} from './estimate'

/** Simulation mit gleichen Zeiten je Lauf bzw. Station. */
function simulation(
  format: SimulationResult['format'],
  date: string,
  runSec: number,
  stationSec: number,
): SimulationResult {
  const rounds = format === 'half_1' || format === 'half_2' ? 4 : 8
  return {
    sessionId: `${format}-${date}`,
    format,
    division: 'open_men',
    startedAt: `${date}T09:00:00.000Z`,
    totalSec: rounds * (runSec + stationSec),
    splits: Array.from({ length: rounds }, () => [runSec, stationSec]).flat(),
  }
}

const base = {
  simulations: [] as SimulationResult[],
  run1kSec: null as number | null,
  division: 'open_men' as const,
  format: 'single' as const,
  today: '2026-11-20',
}

describe('estimateRaceTime', () => {
  it('ohne Simulation und 1-km-Zeit: keine Schätzung', () => {
    expect(estimateRaceTime(base)).toBeUndefined()
  })

  it('nur 1-km-Test: Laufzeit × 1,22 + Richtwert Stationen + Roxzone, breiter Bereich', () => {
    // 8 × 240 × 1,22 = 2342 s + 36 min + 6 min = 4862 s ≈ 81 min
    const estimate = estimateRaceTime({ ...base, run1kSec: 240 })
    expect(estimate).toMatchObject({
      centerSec: 81 * 60,
      source: { kind: 'run_test', runSec: 240 },
      scope: 'race',
    })
    expect(estimate?.lowSec).toBe(73 * 60)
    expect(estimate?.highSec).toBe(89 * 60)
  })

  it('Simulation „Kurz“: auf volle Strecke und ganze Stationen hochgerechnet', () => {
    // Läufe 1200 s × 2,16 + Stationen 1080 s × 2,3 + 4 min Roxzone = 5316 s ≈ 89 min
    const estimate = estimateRaceTime({
      ...base,
      run1kSec: 240,
      simulations: [simulation('short', '2026-11-18', 150, 135)],
    })
    expect(estimate).toMatchObject({
      centerSec: 89 * 60,
      source: { kind: 'simulation', format: 'short', date: '2026-11-18' },
    })
  })

  it('komplette Simulation hat Vorrang und den engsten Bereich', () => {
    const estimate = estimateRaceTime({
      ...base,
      simulations: [
        simulation('short', '2026-11-19', 150, 135),
        simulation('full', '2026-11-10', 300, 270),
      ],
    })
    // 2400 + 2160 + 240 = 4800 s
    expect(estimate).toMatchObject({
      centerSec: 80 * 60,
      lowSec: 78 * 60,
      highSec: 82 * 60,
      runSec: 2400,
      stationSec: 2160,
      roxzoneSec: 240,
      source: { kind: 'simulation', format: 'full' },
    })
  })

  it('beide Hälften: zweite Hälfte mit Vorermüdung', () => {
    const estimate = estimateRaceTime({
      ...base,
      simulations: [
        simulation('half_1', '2026-11-12', 300, 270),
        simulation('half_2', '2026-11-15', 300, 270),
      ],
    })
    // 1200 + 1296 + 1080 + 1166 + 240 = 4982 s ≈ 83 min
    expect(estimate).toMatchObject({
      centerSec: 83 * 60,
      source: { kind: 'halves', date: '2026-11-15' },
    })
  })

  it('ignoriert Simulationen, die älter als 12 Wochen sind', () => {
    const estimate = estimateRaceTime({
      ...base,
      run1kSec: 240,
      simulations: [simulation('full', '2026-08-01', 300, 270)],
    })
    expect(estimate?.source.kind).toBe('run_test')
  })

  it('Doubles: Stationen geteilt; Staffel: nur die eigenen 2 Runden', () => {
    const simulations = [simulation('full', '2026-11-10', 300, 270)]
    // 2400 + 2160 × 0,6 + 240 = 3936 s ≈ 66 min
    expect(estimateRaceTime({ ...base, simulations, format: 'double' })).toMatchObject({
      centerSec: 66 * 60,
      scope: 'team',
    })
    // 570 + 486 + 60 = 1116 s ≈ 19 min
    expect(estimateRaceTime({ ...base, simulations, format: 'relay' })).toMatchObject({
      centerSec: 19 * 60,
      scope: 'own_legs',
    })
  })
})

describe('bestRun1k', () => {
  it('nimmt die schnellste 1-km-Zeit (Lauf, Zeit, 1000 m)', () => {
    expect(
      bestRun1k([
        {
          exerciseSlug: 'hyrox-run',
          recordType: 'best_time',
          contextKey: 'distance_m=1000',
          value: 260,
        },
        {
          exerciseSlug: 'hyrox-run',
          recordType: 'best_time',
          contextKey: 'distance_m=1000',
          value: 245,
        },
        {
          exerciseSlug: 'hyrox-run',
          recordType: 'best_time',
          contextKey: 'distance_m=500',
          value: 100,
        },
        {
          exerciseSlug: 'easy-run',
          recordType: 'best_time',
          contextKey: 'distance_m=1000',
          value: 200,
        },
      ]),
    ).toBe(245)
    expect(bestRun1k([])).toBeNull()
  })
})

describe('targetPlan', () => {
  it('ohne Schätzung: 50 % Laufen, 7 % Roxzone, 43 % Stationen', () => {
    const plan = targetPlan(90 * 60, 'single')
    expect(plan.paceSecPerKm).toBe(338)
    expect(plan.roxzoneSec).toBe(378)
    expect(plan.stationSec).toBe(2322)
    expect(plan.stations).toHaveLength(8)
    const sum = plan.stations.reduce((total, s) => total + s.sec, 0)
    expect(Math.abs(sum - plan.stationSec)).toBeLessThanOrEqual(4)
  })

  it('mit Schätzung: deren Anteile', () => {
    const plan = targetPlan(80 * 60, 'single', { runSec: 2400, stationSec: 2160, roxzoneSec: 240 })
    expect(plan.runSec).toBe(2400)
    expect(plan.paceSecPerKm).toBe(300)
  })

  it('Staffel: 2 km und keine Richtzeiten je Station', () => {
    const plan = targetPlan(20 * 60, 'relay')
    expect(plan.paceSecPerKm).toBe(300)
    expect(plan.stations).toEqual([])
  })

  it('die Anteile der Stationen ergeben zusammen 1', () => {
    const total = Object.values(STATION_TIME_SHARE).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 5)
  })
})

describe('targetDiffers', () => {
  it('erst ab mehr als 3 % Abweichung', () => {
    const estimate = estimateRaceTime({ ...base, run1kSec: 240 })
    if (!estimate) throw new Error('keine Schätzung')
    expect(targetDiffers(81 * 60, estimate)).toBe(false)
    expect(targetDiffers(90 * 60, estimate)).toBe(true)
  })
})
