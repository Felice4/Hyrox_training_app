import { describe, expect, it } from 'vitest'
import { defaultRaceInput, validateRaceInput, type RaceInput } from './race'

const TODAY = '2026-11-15'

const valid: RaceInput = {
  name: 'HYROX Wien',
  raceDate: '2027-01-17',
  format: 'single',
  category: 'open',
  gender: 'men',
  daysPerWeek: 4,
  weekdays: [2, 4, 6, 7],
  targetTimeSec: null,
}

describe('defaultRaceInput', () => {
  it('übernimmt Trainingstage aus dem Profil und begrenzt sie auf 3–5', () => {
    expect(
      defaultRaceInput(TODAY, { trainingDaysPerWeek: 6, preferredWeekdays: [6, 2, 4] }),
    ).toMatchObject({ daysPerWeek: 5, weekdays: [2, 4, 6], raceDate: '2027-01-10' })
    expect(defaultRaceInput(TODAY, { trainingDaysPerWeek: 2 }).daysPerWeek).toBe(3)
    expect(defaultRaceInput(TODAY, {}).daysPerWeek).toBe(4)
  })
})

describe('validateRaceInput', () => {
  it('akzeptiert gültige Eingaben', () => {
    expect(validateRaceInput(valid, TODAY)).toEqual([])
    expect(validateRaceInput({ ...valid, weekdays: [] }, TODAY)).toEqual([])
    expect(validateRaceInput({ ...valid, targetTimeSec: 90 * 60 }, TODAY)).toEqual([])
  })

  it('verlangt einen Namen', () => {
    expect(validateRaceInput({ ...valid, name: '  ' }, TODAY)).toHaveLength(1)
  })

  it('verlangt beim Anlegen mindestens 7 Tage Vorlauf, beim Bearbeiten nur kein vergangenes Datum', () => {
    const soon = { ...valid, raceDate: '2026-11-20' }
    expect(validateRaceInput(soon, TODAY)).toEqual([
      'Der Wettkampf muss mindestens 7 Tage in der Zukunft liegen.',
    ])
    expect(validateRaceInput(soon, TODAY, { editing: true })).toEqual([])
    expect(
      validateRaceInput({ ...valid, raceDate: '2026-11-14' }, TODAY, { editing: true }),
    ).toEqual(['Das Datum darf nicht in der Vergangenheit liegen.'])
    expect(validateRaceInput({ ...valid, raceDate: '2028-01-01' }, TODAY)).toHaveLength(1)
    expect(validateRaceInput({ ...valid, raceDate: '' }, TODAY)).toHaveLength(1)
  })

  it('lehnt ungültige Varianten ab', () => {
    expect(validateRaceInput({ ...valid, gender: 'mixed' }, TODAY)).toHaveLength(1)
  })

  it('prüft Trainingstage und Wochentage', () => {
    expect(validateRaceInput({ ...valid, daysPerWeek: 6, weekdays: [] }, TODAY)).toHaveLength(1)
    expect(validateRaceInput({ ...valid, weekdays: [2, 4, 6] }, TODAY)).toEqual([
      'Wähle mindestens so viele mögliche Wochentage wie Trainingstage pro Woche.',
    ])
    expect(validateRaceInput({ ...valid, weekdays: [0, 2, 4, 6] }, TODAY)).toEqual([
      'Ungültiger Wochentag.',
    ])
  })

  it('prüft die Zielzeit', () => {
    expect(validateRaceInput({ ...valid, targetTimeSec: 10 * 60 }, TODAY)).toHaveLength(1)
    expect(validateRaceInput({ ...valid, targetTimeSec: 6 * 3600 }, TODAY)).toHaveLength(1)
  })
})
