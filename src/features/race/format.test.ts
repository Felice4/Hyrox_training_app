import { describe, expect, it } from 'vitest'
import type { Race } from '@/domain/race/race'
import { countdownLabel, phaseLine } from './format'

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

describe('countdownLabel', () => {
  it('zählt die Tage herunter', () => {
    expect(countdownLabel(58)).toBe('Noch 58 Tage')
    expect(countdownLabel(1)).toBe('Morgen')
    expect(countdownLabel(0)).toBe('Heute')
    expect(countdownLabel(-2)).toBe('Vorbei')
  })
})

describe('phaseLine', () => {
  it('nennt Phase und Woche', () => {
    expect(phaseLine(race, '2026-12-16')).toBe('Spezifisch · Woche 5 von 9')
    expect(phaseLine(race, '2027-01-19')).toBe('Erholung')
    expect(phaseLine(race, '2026-11-15')).toBeNull()
  })
})
