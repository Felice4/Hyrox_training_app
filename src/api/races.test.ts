import { describe, expect, it } from 'vitest'
import { toRace } from './races'

const row = {
  id: 'r1',
  name: 'HYROX Wien',
  race_date: '2027-01-17',
  plan_start: '2026-11-16',
  format: 'single',
  category: 'open',
  gender: 'men',
  days_per_week: 4,
  weekdays: [7, 2, 6, 4],
  target_time_sec: null,
  status: 'active',
  result_time_sec: null,
  result_splits: null,
  result_session_id: null,
}

describe('toRace', () => {
  it('wandelt die Zeile um und sortiert die Wochentage', () => {
    expect(toRace(row)).toEqual({
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
      resultSplits: null,
      resultSessionId: null,
    })
  })

  it('ignoriert unbekannte Werte', () => {
    expect(toRace({ ...row, format: 'team_of_8' })).toBeNull()
    expect(toRace({ ...row, status: 'paused' })).toBeNull()
  })
})
