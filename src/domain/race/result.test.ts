import { describe, expect, it } from 'vitest'
import { canEnterResult, isCurrentRace, recoveryEnd, validateResult } from './race'
import { raceResultSummary } from './result'

const splits = Array.from({ length: 8 }, () => [300, 330]).flat()

describe('Wettkampf nach dem Rennen', () => {
  it('Erholungswoche endet am Sonntag der Folgewoche', () => {
    expect(recoveryEnd('2027-01-17')).toBe('2027-01-24')
    expect(recoveryEnd('2027-01-29')).toBe('2027-02-07')
  })

  it('aktuell: aktiv immer, abgeschlossen bis Ende der Erholung, abgesagt nie', () => {
    const race = { raceDate: '2027-01-17' }
    expect(isCurrentRace({ ...race, status: 'active' }, '2027-06-01')).toBe(true)
    expect(isCurrentRace({ ...race, status: 'completed' }, '2027-01-24')).toBe(true)
    expect(isCurrentRace({ ...race, status: 'completed' }, '2027-01-25')).toBe(false)
    expect(isCurrentRace({ ...race, status: 'cancelled' }, '2027-01-10')).toBe(false)
  })

  it('Ergebnis erst ab dem Wettkampftag und nur, solange aktiv', () => {
    expect(canEnterResult({ status: 'active', raceDate: '2027-01-17' }, '2027-01-16')).toBe(false)
    expect(canEnterResult({ status: 'active', raceDate: '2027-01-17' }, '2027-01-17')).toBe(true)
    expect(canEnterResult({ status: 'completed', raceDate: '2027-01-17' }, '2027-01-18')).toBe(
      false,
    )
  })
})

describe('validateResult', () => {
  it('Gesamtzeit Pflicht, Zwischenzeiten ganz oder gar nicht und passend zur Summe', () => {
    expect(validateResult(5040, [])).toEqual([])
    expect(validateResult(5040, Array(16).fill(null))).toEqual([])
    expect(validateResult(null, [])).toHaveLength(1)
    expect(validateResult(300, [])).toHaveLength(1)
    expect(validateResult(5040, [300, ...Array(15).fill(null)])).toEqual([
      'Trag alle 16 Zwischenzeiten ein oder lass sie ganz leer.',
    ])
    expect(validateResult(5040, splits)).toEqual([])
    expect(validateResult(5100, splits)).toEqual([])
    expect(validateResult(5200, splits)).toEqual([
      'Die Zwischenzeiten ergeben zusammen nicht die Gesamtzeit (± 1 min).',
    ])
  })
})

describe('raceResultSummary', () => {
  const race = {
    raceDate: '2027-01-17',
    resultTimeSec: 5040,
    resultSplits: splits,
    targetTimeSec: 5400,
  }

  it('Abstand zur Zielzeit und Laufen vs. Stationen', () => {
    const summary = raceResultSummary(race, 'open_men')
    expect(summary?.targetDeltaSec).toBe(-360)
    expect(summary?.stats).toMatchObject({ runSec: 2400, stationSec: 2640, runPacePerKmSec: 300 })
  })

  it('ohne Zwischenzeiten bzw. Zielzeit nur die Zeit', () => {
    expect(
      raceResultSummary({ ...race, resultSplits: null, targetTimeSec: null }, 'open_men'),
    ).toEqual({ timeSec: 5040, targetDeltaSec: undefined, stats: undefined })
    expect(raceResultSummary({ ...race, resultTimeSec: null }, 'open_men')).toBeUndefined()
  })
})
