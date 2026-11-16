import { describe, expect, it } from 'vitest'
import { raceTimeline } from './phases'
import type { Race } from './race'
import {
  easyRunMinutes,
  RACE_SESSION_FOCUS,
  raceSessionForDate,
  raceWeekContext,
  raceWeekPlanInput,
  raceWeekSessions,
  stationWeights,
  trainingDivision,
} from './sessions'

// Plan vom 16.11.2026 bis zum Wettkampf am 17.01.2027 (9 Wochen):
// Aufbau ×3, Entlastung, Spezifisch ×3, Tapering, Wettkampfwoche, danach Erholung
const race: Race = {
  id: 'r1',
  name: 'HYROX Wien',
  raceDate: '2027-01-17',
  planStart: '2026-11-16',
  format: 'single',
  category: 'open',
  gender: 'men',
  daysPerWeek: 4,
  weekdays: [2, 4, 6, 7],
  targetTimeSec: null,
  status: 'active',
  resultTimeSec: null,
  resultSessionId: null,
}
const timeline = raceTimeline(race)
const sessionsOf = (weekStart: string, variant: Partial<Race> = {}) => {
  const ctx = raceWeekContext(timeline, weekStart)
  if (!ctx) throw new Error('Woche nicht im Plan')
  return raceWeekSessions(ctx, { ...race, ...variant }, 60)
}
const typesOf = (weekStart: string, variant: Partial<Race> = {}) =>
  sessionsOf(weekStart, variant).map((s) => s.type)

describe('raceWeekContext', () => {
  it('zählt Wochen je Phase, Belastungswochen und frühere Simulationen', () => {
    expect(raceWeekContext(timeline, '2026-11-30')).toMatchObject({
      week: { phase: 'base', number: 3 },
      phaseWeek: 3,
      loadWeek: 3,
      simulationsBefore: 0,
    })
    // Die Entlastungswoche zählt nicht als Belastungswoche
    expect(raceWeekContext(timeline, '2026-12-14')).toMatchObject({
      week: { phase: 'build', number: 5 },
      phaseWeek: 1,
      loadWeek: 4,
    })
    // Spezifisch Woche 2 war eine Simulationswoche
    expect(raceWeekContext(timeline, '2026-12-28')).toMatchObject({
      phaseWeek: 3,
      simulationsBefore: 1,
    })
  })

  it('liefert nichts außerhalb des Plans', () => {
    expect(raceWeekContext(timeline, '2026-11-09')).toBeUndefined()
    expect(raceWeekContext(timeline, '2027-01-25')).toBeUndefined()
  })
})

describe('raceWeekSessions', () => {
  it('Aufbau mit 4 Tagen: Kompromiss-Lauf, Stationskraft, Laufintervalle, Dauerlauf', () => {
    const sessions = sessionsOf('2026-11-23')
    expect(sessions.map((s) => [s.type, s.intensity])).toEqual([
      ['compromised_run', 'moderate'],
      ['station_strength', 'moderate'],
      ['run_intervals', 'moderate'],
      ['easy_run', 'easy'],
    ])
    expect(sessions.every((s) => s.loadShare === 0.8)).toBe(true)
  })

  it('richtet sich nach der Zahl der Trainingstage', () => {
    expect(typesOf('2026-11-23', { daysPerWeek: 3 })).toEqual([
      'compromised_run',
      'station_strength',
      'run_intervals',
    ])
    expect(typesOf('2026-11-23', { daysPerWeek: 5 })).toHaveLength(5)
  })

  it('Spezifisch: hart, Wettkampfgewicht und jede 2. Woche eine Simulation statt Kompromiss-Lauf', () => {
    const first = sessionsOf('2026-12-14')
    expect(first.map((s) => s.type)).toContain('compromised_run')
    expect(first.filter((s) => s.type !== 'easy_run').every((s) => s.intensity === 'hard')).toBe(
      true,
    )
    expect(first.every((s) => s.loadShare === 1)).toBe(true)

    const second = sessionsOf('2026-12-21')
    expect(second[0]).toMatchObject({ type: 'simulation', simulationFormat: 'short' })
    expect(second.map((s) => s.type)).not.toContain('compromised_run')
  })

  it('Entlastung: drei Einheiten, kürzer und höchstens mittel', () => {
    const deload = sessionsOf('2026-12-07')
    const base = sessionsOf('2026-11-23')
    expect(deload).toHaveLength(3)
    expect(deload.every((s) => s.intensity === 'moderate')).toBe(true)
    for (const s of deload) {
      const before = base.find((b) => b.type === s.type)
      expect(s.durationMin).toBeLessThan(before?.durationMin ?? 0)
    }
    expect(deload.every((s) => s.loadShare === 0.7)).toBe(true)
  })

  it('Tapering: kurze Einheiten im Renntempo, Stationskraft leicht', () => {
    const taper = sessionsOf('2027-01-04')
    expect(taper.map((s) => [s.type, s.intensity])).toEqual([
      ['compromised_run', 'hard'],
      ['run_intervals', 'hard'],
      ['station_strength', 'easy'],
    ])
    expect(taper.every((s) => s.durationMin <= 40)).toBe(true)
  })

  it('Wettkampfwoche: zwei Aktivierungen; danach Erholung', () => {
    expect(typesOf('2027-01-11')).toEqual(['activation', 'activation'])
    const recovery = sessionsOf('2027-01-18')
    expect(recovery.every((s) => s.type === 'easy_run' && s.intensity === 'easy')).toBe(true)
  })

  it('Pro: Stationskraft hat Vorrang und geht im Spezifisch bis 110 %', () => {
    const pro = sessionsOf('2026-12-14', { category: 'pro', daysPerWeek: 5 })
    expect(pro[0]).toMatchObject({ type: 'station_strength', loadShare: 1.1 })
    expect(pro.filter((s) => s.type === 'station_strength')).toHaveLength(2)
  })

  it('Staffel: Tempo zuerst, Intervalle schon im Aufbau hart, kürzerer Kompromiss-Lauf', () => {
    const relay = sessionsOf('2026-11-23', { format: 'relay' })
    expect(relay[0]).toMatchObject({ type: 'run_intervals', intensity: 'hard' })
    expect(relay.find((s) => s.type === 'compromised_run')?.durationMin).toBe(50)
  })

  it('Woche 1: Einstiegstest mit der Simulation „Kurz“ statt Kompromiss-Lauf', () => {
    const first = sessionsOf('2026-11-16')
    expect(first[0]).toMatchObject({ type: 'simulation', simulationFormat: 'short' })
    expect(first.map((s) => s.type)).not.toContain('compromised_run')
    // Auch Pro (Kraft zuerst) macht den Test
    expect(typesOf('2026-11-16', { category: 'pro' })).toContain('simulation')
    // Die erste Simulation der spezifischen Phase bleibt „Kurz“
    expect(sessionsOf('2026-12-21')[0]).toMatchObject({ simulationFormat: 'short' })
  })

  it('Doubles: Intervalle schon im Aufbau hart', () => {
    const doubles = sessionsOf('2026-11-16', { format: 'double', gender: 'mixed' })
    expect(doubles.find((s) => s.type === 'run_intervals')?.intensity).toBe('hard')
  })
})

describe('easyRunMinutes', () => {
  it('steigt um rund 10 % je Woche und bleibt bei 60 min', () => {
    expect(easyRunMinutes(1)).toBe(30)
    for (let week = 2; week < 12; week++) {
      expect(easyRunMinutes(week)).toBeGreaterThanOrEqual(easyRunMinutes(week - 1))
      expect(easyRunMinutes(week) - easyRunMinutes(week - 1)).toBeLessThanOrEqual(5)
    }
    expect(easyRunMinutes(20)).toBe(60)
  })
})

describe('Gewichte', () => {
  it('nimmt die Division der Variante; in der Mixed-Staffel nach dem Profil', () => {
    expect(trainingDivision(race)).toBe('open_men')
    expect(trainingDivision({ format: 'double', category: 'pro', gender: 'women' })).toBe(
      'pro_women',
    )
    const mixedRelay = { format: 'relay', category: 'open', gender: 'mixed' } as const
    expect(trainingDivision(mixedRelay, 'female')).toBe('open_women')
    expect(trainingDivision(mixedRelay, 'male')).toBe('open_men')
  })

  it('liefert die Wettkampfgewichte je Station', () => {
    expect(stationWeights('open_men')).toEqual({
      sled_push: 152,
      sled_pull: 103,
      farmers_carry: 24,
      sandbag_lunges: 20,
      wall_balls: 6,
    })
  })
})

describe('raceWeekPlanInput', () => {
  const options = { baseDurationMin: 60, seed: 1 }

  it('baut die Einheiten mit Schwerpunkt, Gewichten und Erklärung', () => {
    const input = raceWeekPlanInput(race, '2026-11-23', options)
    expect(input?.weekdays).toEqual([2, 4, 6, 7])
    expect(input?.latestDate).toBeUndefined()
    expect(input?.explanation[0]).toBe('Wettkampfmodus · Aufbau · Woche 2 von 9.')
    const first = input?.sessions[0]
    expect(first).toMatchObject({ type: 'compromised_run', focus: 'hyrox' })
    expect(first?.raceSession).toMatchObject({
      type: 'compromised_run',
      team: 'single',
      loadShare: 0.8,
      stationWeights: { sled_push: 152 },
    })
    for (const s of input?.sessions ?? []) expect(s.focus).toBe(RACE_SESSION_FOCUS[s.type])
  })

  it('Woche 1 erklärt den Einstiegstest', () => {
    const input = raceWeekPlanInput(race, '2026-11-16', options)
    expect(input?.explanation.some((l) => l.startsWith('Einstiegstest'))).toBe(true)
  })

  it('mit Zielzeit: Renntempo in den Einheiten', () => {
    const timed = { ...race, targetTimeSec: 90 * 60 }
    const input = raceWeekPlanInput(timed, '2026-11-23', options)
    // 90 min × 50 % Laufen / 8 km = 337,5 s ≈ 5:38 min/km
    expect(input?.sessions[0]?.raceSession?.racePaceSecPerKm).toBe(338)
    expect(raceWeekPlanInput(race, '2026-11-23', options)?.sessions[0]?.raceSession).toMatchObject({
      racePaceSecPerKm: undefined,
    })
    const simulation = raceWeekPlanInput(timed, '2026-11-16', options)?.sessions[0]?.workout
    expect(simulation?.explanation.at(-1)).toBe(
      'Renntempo laut Zielzeit: 5:38 min/km (inkl. Roxzone etwas langsamer).',
    )
  })

  it('Simulation als fertiges Workout mit Wettkampfgewichten', () => {
    const input = raceWeekPlanInput(race, '2026-12-21', options)
    const simulation = input?.sessions.find((s) => s.type === 'simulation')
    expect(simulation?.raceSession).toBeUndefined()
    expect(simulation?.workout?.blocks[0]?.items).toHaveLength(16)
    expect(simulation?.durationMin).toBe(simulation?.workout?.targetDurationMin)
  })

  it('plant in der Wettkampfwoche höchstens bis zwei Tage vor dem Rennen', () => {
    expect(raceWeekPlanInput(race, '2027-01-11', options)?.latestDate).toBe('2027-01-15')
  })

  it('außerhalb des Plans: normal planen', () => {
    expect(raceWeekPlanInput(race, '2026-11-09', options)).toBeUndefined()
  })
})

describe('raceSessionForDate', () => {
  it('erzeugt Einheiten mit Phase und Gewichten des Datums', () => {
    expect(raceSessionForDate(race, 'station_strength', '2026-12-16', { seed: 1 })).toEqual({
      raceSession: expect.objectContaining({ type: 'station_strength', loadShare: 1 }),
    })
    expect(raceSessionForDate(race, 'simulation', '2026-12-23', { seed: 1 })?.workout?.focus).toBe(
      'hyrox',
    )
    expect(raceSessionForDate(race, 'easy_run', '2027-03-01', { seed: 1 })).toBeUndefined()
  })
})
